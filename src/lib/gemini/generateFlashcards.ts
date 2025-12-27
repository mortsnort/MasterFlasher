import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import type { Schema } from '@google/generative-ai';
import { validateFlashcardsResponse } from '../validation/validateJson';
import type { Fact, FlashcardsResponse } from '../anki/types';
import { getGeminiConfig, createMissingConfigError } from '../settings/geminiConfig';
import { getFlashcardCreationPrompt } from '../settings/promptConfig';
import { FLASHCARD_CREATION_SYSTEM_CONSTRAINTS } from '../settings/defaultPrompts';

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

export async function generateFlashcards(facts: Fact[]): Promise<FlashcardsResponse> {
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

	const factsJson = JSON.stringify(facts, null, 2);
	const prompt = buildFlashcardCreationPrompt(userPrompt, factsJson);

	try {
		const result = await model.generateContent(prompt);
		const responseText = result.response.text();
		const json = JSON.parse(responseText);

		// Deterministically add the type 'basic' to satisfy validation and typing
		if (json.cards && Array.isArray(json.cards)) {
			json.cards = json.cards.map((c: { front: string; back: string; tags?: string[] }) => ({ ...c, type: 'basic' }));
		}

		return validateFlashcardsResponse(json);
	} catch (e) {
		console.error('Gemini Flashcards Generation Failed', e);
		throw e; // Let UI handle retry
	}
}
