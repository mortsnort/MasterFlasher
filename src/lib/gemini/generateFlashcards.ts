import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import type { Schema } from '@google/generative-ai';
import { validateFlashcardsResponse } from '../validation/validateJson';
import type { Fact, FlashcardsResponse } from '../anki/types';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL_NAME = import.meta.env.VITE_GEMINI_MODEL_NAME;

const genAI = new GoogleGenerativeAI(API_KEY);

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
	if (!API_KEY) throw new Error('Gemini API Key not found');

	const model = genAI.getGenerativeModel({
		model: MODEL_NAME,
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
			json.cards = json.cards.map((c: any) => ({ ...c, type: 'basic' }));
		}

		return validateFlashcardsResponse(json);
	} catch (e) {
		console.error('Gemini Flashcards Generation Failed', e);
		throw e; // Let UI handle retry
	}
}
