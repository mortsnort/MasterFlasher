import type { FactsResponse, FlashcardsResponse } from '../anki/types';

export function validateFactsResponse(data: any): FactsResponse {
	if (!data || typeof data !== 'object') {
		throw new Error('Invalid JSON: Root must be an object');
	}

	if (!Array.isArray(data.facts)) {
		throw new Error('Invalid Schema: "facts" must be an array');
	}

	if (data.facts.length > 10) {
		// Soft warning or truncation could happen here, but for now we error or truncate
		console.warn('Facts array exceeds limit of 10. Truncating.');
		data.facts = data.facts.slice(0, 10);
	}

	for (const f of data.facts) {
		if (typeof f.id !== 'string' || !f.id) {
			throw new Error('Invalid Fact: Missing or invalid "id"');
		}
		if (typeof f.fact !== 'string' || !f.fact) {
			throw new Error('Invalid Fact: Missing or invalid "fact"');
		}
	}

	return data as FactsResponse;
}

export function validateFlashcardsResponse(data: any): FlashcardsResponse {
	if (!data || typeof data !== 'object') {
		throw new Error('Invalid JSON: Root must be an object');
	}

	if (!Array.isArray(data.cards)) {
		throw new Error('Invalid Schema: "cards" must be an array');
	}

	// Allow empty cards array - this can happen when no concepts were extracted
	// from the source material (e.g., large PDFs with no relevant content)

	if (data.cards.length > 200) {
		console.warn('Cards array exceeds limit of 100. Truncating.');
		data.cards = data.cards.slice(0, 200);
	}

	for (const c of data.cards) {
		if (c.type !== 'basic') {
			throw new Error('Invalid Card: type must be "basic"');
		}
		if (typeof c.front !== 'string' || !c.front.trim()) {
			throw new Error('Invalid Card: Missing or empty "front"');
		}
		if (typeof c.back !== 'string' || !c.back.trim()) {
			throw new Error('Invalid Card: Missing or empty "back"');
		}
		if (c.tags && !Array.isArray(c.tags)) {
			throw new Error('Invalid Card: "tags" must be an array of strings');
		}
	}

	return data as FlashcardsResponse;
}
