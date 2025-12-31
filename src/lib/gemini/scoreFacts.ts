import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import type { Schema } from '@google/generative-ai';
import type { Fact, FactScore, ScoredFact } from '../anki/types';
import { getGeminiConfig, createMissingConfigError } from '../settings/geminiConfig';
import { FACT_SCORING_PROMPT } from '../settings/defaultPrompts';

// Maximum facts per batch to prevent response truncation
// Scoring responses are smaller than flashcard responses, so we can handle more
const MAX_FACTS_PER_BATCH = 50;

// Filtering constants
const SCORE_THRESHOLD = 9; // Facts must score > 11 to pass
const MAX_FACTS_TO_PASS = 40; // Cap at top 40 facts

const schema: Schema = {
	type: SchemaType.ARRAY,
	items: {
		type: SchemaType.OBJECT,
		properties: {
			id: { type: SchemaType.STRING },
			scores: {
				type: SchemaType.OBJECT,
				properties: {
					centrality: { type: SchemaType.NUMBER },
					non_obviousness: { type: SchemaType.NUMBER },
					leverage: { type: SchemaType.NUMBER },
					testability: { type: SchemaType.NUMBER },
					transfer: { type: SchemaType.NUMBER },
				},
				required: ['centrality', 'non_obviousness', 'leverage', 'testability', 'transfer'],
			},
			score_total: { type: SchemaType.NUMBER },
		},
		required: ['id', 'scores', 'score_total'],
	},
};

/**
 * Build the scoring prompt with the facts to score
 */
function buildScoringPrompt(facts: Fact[]): string {
	const factsJson = JSON.stringify(
		facts.map(f => ({ id: f.id, fact: f.fact })),
		null,
		2
	);
	
	return `${FACT_SCORING_PROMPT}

Facts to score:
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
 * Process a single batch of facts and return their scores
 */
async function processBatch(
	model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>,
	facts: Fact[],
	batchIndex: number,
	totalBatches: number
): Promise<FactScore[]> {
	const prompt = buildScoringPrompt(facts);

	console.log(`[DEBUG] Scoring batch ${batchIndex + 1}/${totalBatches} - ${facts.length} facts, prompt size: ${prompt.length} chars`);

	try {
		const result = await model.generateContent(prompt);
		const response = result.response;
		
		// Check finish reason to detect truncation
		const finishReason = response.candidates?.[0]?.finishReason;
		console.log(`[DEBUG] Scoring batch ${batchIndex + 1}/${totalBatches} - Finish reason: ${finishReason}`);
		
		if (finishReason === 'MAX_TOKENS') {
			console.warn(`[DEBUG] WARNING: Scoring batch ${batchIndex + 1} was truncated (MAX_TOKENS)`);
		}
		
		const responseText = response.text();
		console.log(`[DEBUG] Scoring batch ${batchIndex + 1}/${totalBatches} - Response length: ${responseText.length} chars`);

		let json;
		try {
			json = JSON.parse(responseText);
		} catch (parseError) {
			console.error(`[DEBUG] Scoring batch ${batchIndex + 1} JSON PARSE ERROR`);
			console.error('[DEBUG] Full response that failed to parse:', responseText);
			console.error('[DEBUG] Parse error details:', parseError);
			return [];
		}

		if (!Array.isArray(json)) {
			console.warn(`[DEBUG] Scoring batch ${batchIndex + 1} - Expected array, got:`, typeof json);
			return [];
		}

		console.log(`[DEBUG] Scoring batch ${batchIndex + 1}/${totalBatches} - Successfully parsed ${json.length} scores`);

		// Validate and return scores
		return json.filter((score: FactScore) => 
			score.id && 
			score.scores && 
			typeof score.score_total === 'number'
		);

	} catch (e) {
		console.error(`[DEBUG] Scoring batch ${batchIndex + 1} generation failed:`, e);
		return [];
	}
}

/**
 * Score facts using Gemini to assess their learning value.
 * 
 * @param facts - Array of facts to score
 * @returns Facts enriched with scores
 */
export async function scoreFacts(facts: Fact[]): Promise<ScoredFact[]> {
	// Early return if no facts to score
	if (!facts || facts.length === 0) {
		console.log('[DEBUG] No facts to score, returning empty array');
		return [];
	}

	console.log(`[DEBUG] scoreFacts called - ${facts.length} facts to score`);

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

	// Split facts into batches if needed
	const batches = batchFacts(facts);
	console.log(`[DEBUG] Fact scoring - Total facts: ${facts.length}, split into ${batches.length} batch(es)`);

	// Process batches
	let allScores: FactScore[] = [];

	if (batches.length === 1) {
		// Single batch - process directly
		allScores = await processBatch(model, facts, 0, 1);
	} else {
		// Multiple batches - process sequentially to avoid rate limits
		console.log(`[DEBUG] Processing ${batches.length} scoring batches sequentially...`);
		
		for (let i = 0; i < batches.length; i++) {
			const batchScores = await processBatch(model, batches[i], i, batches.length);
			allScores.push(...batchScores);
			
			// Small delay between batches to avoid rate limiting
			if (i < batches.length - 1) {
				console.log(`[DEBUG] Waiting 500ms before next scoring batch...`);
				await new Promise(resolve => setTimeout(resolve, 500));
			}
		}
	}

	console.log(`[DEBUG] Fact scoring complete - Got ${allScores.length} scores for ${facts.length} facts`);

	// Create a map of scores by fact ID
	const scoreMap = new Map<string, FactScore>();
	for (const score of allScores) {
		scoreMap.set(score.id, score);
	}

	// Enrich facts with their scores
	const scoredFacts: ScoredFact[] = facts.map(fact => {
		const score = scoreMap.get(fact.id);
		if (!score) {
			console.warn(`[DEBUG] No score found for fact ID: ${fact.id}`);
		}
		return {
			...fact,
			score,
		};
	});

	return scoredFacts;
}

/**
 * Filter scored facts based on the filtering rules:
 * 1. If only 1 fact, always pass it regardless of score
 * 2. Only facts with score_total > 11 pass
 * 3. Cap at top 40 if more than 40 pass
 * 
 * @param scoredFacts - Facts with scores attached
 * @returns Filtered facts (score property removed for downstream compatibility)
 */
export function filterScoredFacts(scoredFacts: ScoredFact[]): Fact[] {
	// Rule 1: Single fact always passes
	if (scoredFacts.length === 1) {
		console.log('[DEBUG] Only 1 fact - passing regardless of score');
		const fact = scoredFacts[0];
		return [{
			id: fact.id,
			fact: fact.fact,
			context: fact.context,
		}];
	}

	// Rule 2: Filter by score threshold
	const passingFacts = scoredFacts.filter(f => {
		if (!f.score) {
			// If no score (API failure), be conservative and include it
			console.warn(`[DEBUG] Fact ${f.id} has no score, including by default`);
			return true;
		}
		return f.score.score_total > SCORE_THRESHOLD;
	});

	console.log(`[DEBUG] ${passingFacts.length}/${scoredFacts.length} facts passed score threshold (> ${SCORE_THRESHOLD})`);

	// Rule 3: Cap at MAX_FACTS_TO_PASS
	let finalFacts = passingFacts;
	if (passingFacts.length > MAX_FACTS_TO_PASS) {
		// Sort by score descending, take top MAX_FACTS_TO_PASS
		finalFacts = [...passingFacts]
			.sort((a, b) => {
				const scoreA = a.score?.score_total ?? 0;
				const scoreB = b.score?.score_total ?? 0;
				return scoreB - scoreA;
			})
			.slice(0, MAX_FACTS_TO_PASS);
		
		console.log(`[DEBUG] Capped from ${passingFacts.length} to ${MAX_FACTS_TO_PASS} facts`);
	}

	// Remove score property for downstream compatibility
	return finalFacts.map(f => ({
		id: f.id,
		fact: f.fact,
		context: f.context,
	}));
}
