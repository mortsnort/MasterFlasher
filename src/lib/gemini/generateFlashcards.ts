import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import type { Schema } from '@google/generative-ai';
import { validateFlashcardsResponse } from '../validation/validateJson';
import type { Fact, FlashcardsResponse } from '../anki/types';
import { getGeminiConfig, createMissingConfigError } from '../settings/geminiConfig';

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

export async function generateFlashcards(facts: Fact[]): Promise<FlashcardsResponse> {
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

	const factsJson = JSON.stringify(facts, null, 2);
	const prompt = `
Using these concepts, generate a flash card for each concept.
Front should be a clear question/prompt; back is the answer.
Add 1-4 short tags.
Deck Name: MasterFlasher

Concepts:
${factsJson}
  `;

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
