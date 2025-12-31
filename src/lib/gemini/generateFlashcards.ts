import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import type { Schema, GenerativeModel } from '@google/generative-ai';
import { validateFlashcardsResponse } from '../validation/validateJson';
import type { Fact, FlashcardsResponse, Flashcard } from '../anki/types';
import { getGeminiConfig, createMissingConfigError } from '../settings/geminiConfig';
import { getFlashcardCreationPrompt } from '../settings/promptConfig';
import { FLASHCARD_CREATION_SYSTEM_CONSTRAINTS } from '../settings/defaultPrompts';

// Maximum facts per batch to prevent response truncation
// Testing showed ~25 facts produces responses within token limits
const MAX_FACTS_PER_BATCH = 25;

const schema: Schema = {
	type: SchemaType.OBJECT,
	properties: {
		deck: { type: SchemaType.STRING },
		cards: {
			type: SchemaType.ARRAY,
			items: {
				type: SchemaType.OBJECT,
				properties: {
					front: { type: SchemaType.STRING },
					back: { type: SchemaType.STRING },
					tags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
				},
				required: ['front', 'back'],
			},
		},
	},
	required: ['deck', 'cards'],
};

/**
 * Build the complete prompt by combining:
 * 1. User's custom prompt (or default)
 * 2. System constraints (always appended, not user-editable)
 * 3. Dynamic content (concepts JSON)
 */
function buildFlashcardCreationPrompt(userPrompt: string, factsJson: string): string {
	return `${userPrompt}${FLASHCARD_CREATION_SYSTEM_CONSTRAINTS}

Concepts:
${factsJson}`;
}

/**
 * Split facts into batches to prevent response truncation
 */
function batchFacts(facts: Fact[], batchSize: number = MAX_FACTS_PER_BATCH): Fact[][] {
	const batches: Fact[][] = [];
	for (let i = 0; i < facts.length; i += batchSize) {
		batches.push(facts.slice(i, i + batchSize));
	}
	return batches;
}

/**
 * Process a single batch of facts and return flashcards
 */
async function processBatch(
	model: GenerativeModel,
	facts: Fact[],
	userPrompt: string,
	batchIndex: number,
	totalBatches: number
): Promise<Flashcard[]> {
	const factsJson = JSON.stringify(facts, null, 2);
	const prompt = buildFlashcardCreationPrompt(userPrompt, factsJson);

	console.log(`[DEBUG] Batch ${batchIndex + 1}/${totalBatches} - Processing ${facts.length} facts, prompt size: ${prompt.length} chars`);

	try {
		const result = await model.generateContent(prompt);
		const response = result.response;
		
		// Check finish reason to detect truncation
		const finishReason = response.candidates?.[0]?.finishReason;
		console.log(`[DEBUG] Batch ${batchIndex + 1}/${totalBatches} - Finish reason: ${finishReason}`);
		
		if (finishReason === 'MAX_TOKENS') {
			console.warn(`[DEBUG] WARNING: Batch ${batchIndex + 1} was truncated (MAX_TOKENS) - output incomplete`);
			// Don't throw, but log - we'll try to parse what we got
		}
		
		const responseText = response.text();
		console.log(`[DEBUG] Batch ${batchIndex + 1}/${totalBatches} - Response length: ${responseText.length} chars`);

		let json;
		try {
			json = JSON.parse(responseText);
		} catch (parseError) {
			console.error(`[DEBUG] Batch ${batchIndex + 1} JSON PARSE ERROR`);
			console.error('[DEBUG] Full response that failed to parse:', responseText);
			console.error('[DEBUG] Parse error details:', parseError);
			
			// If this batch failed, return empty rather than failing everything
			console.warn(`[DEBUG] Skipping batch ${batchIndex + 1} due to parse error`);
			return [];
		}

		console.log(`[DEBUG] Batch ${batchIndex + 1}/${totalBatches} - Successfully parsed ${json.cards?.length || 0} cards`);

		// Validate and add type to cards
		if (json.cards && Array.isArray(json.cards)) {
			return json.cards.map((c: { front: string; back: string; tags?: string[] }) => ({
				...c,
				type: 'basic' as const,
			}));
		}

		return [];
	} catch (e) {
		console.error(`[DEBUG] Batch ${batchIndex + 1} generation failed:`, e);
		// Return empty for this batch rather than failing everything
		return [];
	}
}

export async function generateFlashcards(facts: Fact[]): Promise<FlashcardsResponse> {
	// Early return if no facts to process - avoids unnecessary API call
	// and potential errors from Gemini returning empty/invalid JSON
	if (!facts || facts.length === 0) {
		console.log('[DEBUG] No facts provided, returning empty flashcards response');
		return {
			deck: 'MasterFlasher',
			cards: [],
		};
	}

	// Get config from secure storage or env
	const config = await getGeminiConfig();
	if (!config) {
		throw createMissingConfigError();
	}

	// Load the user's custom prompt (or default)
	const userPrompt = await getFlashcardCreationPrompt();

	const genAI = new GoogleGenerativeAI(config.apiKey);
	const model = genAI.getGenerativeModel({
		model: config.modelName,
		generationConfig: {
			responseMimeType: 'application/json',
			responseSchema: schema,
			maxOutputTokens: 8192,
		},
	});

	// Split facts into batches to prevent response truncation
	const batches = batchFacts(facts);
	console.log(`[DEBUG] Flashcard generation - Total facts: ${facts.length}, split into ${batches.length} batch(es)`);

	if (batches.length === 1) {
		// Single batch - process directly
		const cards = await processBatch(model, facts, userPrompt, 0, 1);
		
		const response: FlashcardsResponse = {
			deck: 'MasterFlasher',
			cards,
		};
		
		return validateFlashcardsResponse(response);
	}

	// Multiple batches - process sequentially to avoid rate limits
	console.log(`[DEBUG] Processing ${batches.length} batches sequentially...`);
	const allCards: Flashcard[] = [];
	
	for (let i = 0; i < batches.length; i++) {
		const batchCards = await processBatch(model, batches[i], userPrompt, i, batches.length);
		allCards.push(...batchCards);
		
		// Small delay between batches to avoid rate limiting
		if (i < batches.length - 1) {
			console.log(`[DEBUG] Waiting 500ms before next batch...`);
			await new Promise(resolve => setTimeout(resolve, 500));
		}
	}

	console.log(`[DEBUG] Flashcard generation complete - Total cards: ${allCards.length} from ${batches.length} batches`);

	const response: FlashcardsResponse = {
		deck: 'MasterFlasher',
		cards: allCards,
	};

	return validateFlashcardsResponse(response);
}
