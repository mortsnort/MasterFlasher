import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import type { Schema } from '@google/generative-ai';
import type { FactsResponse, Fact } from '../anki/types';
import { getGeminiConfig, createMissingConfigError } from '../settings/geminiConfig';
import { getFactExtractionPrompt } from '../settings/promptConfig';
import { FACT_EXTRACTION_SYSTEM_CONSTRAINTS } from '../settings/defaultPrompts';

const schema: Schema = {
	type: SchemaType.OBJECT,
	properties: {
		sourceTitle: { type: SchemaType.STRING },
		facts: {
			type: SchemaType.ARRAY,
			items: {
				type: SchemaType.OBJECT,
				properties: {
					fact: { type: SchemaType.STRING },
				},
				required: ['fact'],
			},
		},
	},
	required: ['facts'],
};

// Helper: Split text into chunks at sentence boundaries
// Reduced to 4000 chars for natural content-based fact limiting
// Smaller chunks = fewer extractable concepts = natural output limits
function chunkText(text: string, chunkSize = 4000): string[] {
	if (text.length <= chunkSize) return [text];

	const chunks: string[] = [];
	let currentChunk = '';
	const sentences = text.match(/[^.!?]+[.!?]+(\s|$)/g) || [text];

	for (const sentence of sentences) {
		if ((currentChunk + sentence).length > chunkSize) {
			if (currentChunk) chunks.push(currentChunk);
			currentChunk = sentence;
		} else {
			currentChunk += sentence;
		}
	}
	if (currentChunk) chunks.push(currentChunk);

	// Fallback for massive sentences or failures
	if (chunks.length === 0 && text.length > 0) return [text];

	return chunks;
}

// Generate unique ID (simple UUID v4)
function generateId(): string {
	return crypto.randomUUID();
}

/**
 * Build the complete prompt by combining:
 * 1. User's custom prompt (or default)
 * 2. System constraints (always appended, not user-editable)
 * 3. Dynamic content (title and text)
 */
function buildFactExtractionPrompt(userPrompt: string, text: string, title?: string): string {
	return `${userPrompt}${FACT_EXTRACTION_SYSTEM_CONSTRAINTS}

Context/Title: ${title || 'Unknown'}
Text:
${text}`;
}

async function verifyAndGenerateFacts(text: string, title: string | undefined, userPrompt: string): Promise<Fact[]> {
	// Get config from secure storage or env
	const config = await getGeminiConfig();
	if (!config) {
		throw createMissingConfigError();
	}

	const genAI = new GoogleGenerativeAI(config.apiKey);
	const model = genAI.getGenerativeModel({
		model: config.modelName,
		generationConfig: {
			responseMimeType: 'application/json',
			responseSchema: schema,
			maxOutputTokens: 8192,
		},
	});

	const prompt = buildFactExtractionPrompt(userPrompt, text, title);

	try {
		const result = await model.generateContent(prompt);
		const responseText = result.response.text();
		const json = JSON.parse(responseText);

		// Validate structure locally since we removed strict schema for id/context
		if (!json.facts || !Array.isArray(json.facts)) {
			console.warn('Invalid facts structure from chunk', json);
			return [];
		}

		// Map to Fact objects, assigning IDs client-side
		return json.facts.map((f: { fact: string }) => ({
			id: generateId(),
			fact: f.fact,
			// context removed per user request
		})).filter((f: { id: string; fact: string }) => f.fact && typeof f.fact === 'string');

	} catch (e) {
		console.error('Gemini Facts Generation Failed for chunk', e);
		return []; // Return empty for this chunk rather than failing everything
	}
}

export async function generateFacts(text: string, title?: string): Promise<FactsResponse> {
	// 1. Load the user's custom prompt (or default)
	const userPrompt = await getFactExtractionPrompt();

	// 2. Chunk the text into smaller pieces for natural content-based limiting
	const chunks = chunkText(text);
	console.log(`Processing ${chunks.length} chunks with custom prompt...`);

	// 3. Process chunks (concurrently for speed, Flash Lite has high TPM)
	const results = await Promise.all(
		chunks.map((chunk) => verifyAndGenerateFacts(chunk, title, userPrompt))
	);

	// 4. Merge results from all chunks
	const allFacts = results.flat();

	// 5. Return combined results
	// Smaller chunks naturally limit facts per chunk, no arbitrary truncation needed

	return {
		sourceTitle: title,
		facts: allFacts,
	};
}
