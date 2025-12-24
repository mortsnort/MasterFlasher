import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import type { Schema } from '@google/generative-ai';
import type { FactsResponse, Fact } from '../anki/types';

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
					fact: { type: SchemaType.STRING },
				},
				required: ['fact'],
			},
		},
	},
	required: ['facts'],
};

// Helper: Split text into chunks of ~15k characters at sentence boundaries
function chunkText(text: string, chunkSize = 15000): string[] {
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

async function verifyAndGenerateFacts(text: string, title?: string): Promise<Fact[]> {
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
Extract explicit, relevant key concepts stated in the text.

Constraints:
1. Extract the most important key concepts.
2. Each key concept must be a single declarative sentence.
3. Maximum length per key concept: 240 characters.
4. No inference or interpretation - only explicit concepts from the source material.

Context/Title: ${title || 'Unknown'}
Text:
${text}
  `;

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
		return json.facts.map((f: any) => ({
			id: generateId(),
			fact: f.fact,
			// context removed per user request
		})).filter((f: any) => f.fact && typeof f.fact === 'string');

	} catch (e) {
		console.error('Gemini Facts Generation Failed for chunk', e);
		return []; // Return empty for this chunk rather than failing everything
	}
}

export async function generateFacts(text: string, title?: string): Promise<FactsResponse> {
	// 1. Chunk the text
	const chunks = chunkText(text);
	console.log(`Processing ${chunks.length} chunks...`);

	// 2. Process chunks (concurrently or sequentially? Sequential to respect rate limits if needed, but parallel is faster)
	// Using Promise.all for speed, assuming API limits allow. Flash Lite has high TPM.
	const results = await Promise.all(
		chunks.map((chunk) => verifyAndGenerateFacts(chunk, title))
	);

	// 3. Merge results
	const allFacts = results.flat();

	// 4. Final limit check (optional, but good to keep total manageable)
	// If specific per-chunk limits are adhered to, total should be reasonable. 
	// We do NOT strictly truncate here to strict 10 items like before, as user asked for 25-50 scale.

	return {
		sourceTitle: title,
		facts: allFacts,
	};
}
