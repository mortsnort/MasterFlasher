import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import type { Schema } from '@google/generative-ai';
import { validateFactsResponse } from '../validation/validateJson';
import type { FactsResponse } from '../anki/types';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL_NAME = import.meta.env.VITE_GEMINI_MODEL_NAME; // or flash-lite when available, strict JSON enforcement

const genAI = new GoogleGenerativeAI(API_KEY);

const schema: Schema = {
	type: SchemaType.OBJECT,
	properties: {
		sourceTitle: { type: SchemaType.STRING },
		facts: {
			type: SchemaType.ARRAY,
			items: {
				type: SchemaType.OBJECT,
				properties: {
					id: { type: SchemaType.STRING },
					fact: { type: SchemaType.STRING },
					context: { type: SchemaType.STRING },
				},
				required: ['id', 'fact'],
			},
		},
	},
	required: ['facts'],
};

export async function generateFacts(text: string, title?: string): Promise<FactsResponse> {
	if (!API_KEY) throw new Error('Gemini API Key not found');

	const model = genAI.getGenerativeModel({
		model: MODEL_NAME,
		generationConfig: {
			responseMimeType: 'application/json',
			responseSchema: schema,
			maxOutputTokens: 8192,
		},
	});

	const prompt = `
Extract all explicit, relevant facts stated in the text.

Each fact must:

Be explicitly stated (no inference or interpretation)

Be atomic (one claim per fact)

Be written as a single declarative sentence

Context/Title: ${title || 'Unknown'}
Text:
${text.slice(0, 30000)} // Truncate to avoid context limit issues, increased for full pages
  `;

	try {
		const result = await model.generateContent(prompt);
		const responseText = result.response.text();
		const json = JSON.parse(responseText);
		return validateFactsResponse(json);
	} catch (e) {
		console.error('Gemini Facts Generation Failed', e);
		throw e;
	}
}
