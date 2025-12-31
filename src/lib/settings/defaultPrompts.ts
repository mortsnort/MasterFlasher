/**
 * Default Prompts for Gemini AI
 * 
 * These prompts are used as defaults when no custom prompts are configured.
 * Users can customize these in Settings and reset to defaults at any time.
 * 
 * Note: The prompts here are the user-editable instruction portions only.
 * Dynamic content (text, title, facts) is appended at runtime by the generator functions.
 */

/**
 * Default prompt for extracting facts/key concepts from text.
 * 
 * Used in: generateFacts.ts
 * Dynamic content appended: Context/Title and Text
 */
export const DEFAULT_FACT_EXTRACTION_PROMPT = 
`Extract explicit, atomic factual statements from the provided text.

Rules:
1. Each fact must be explicitly stated in the text (no inference, paraphrasing, or interpretation).
2. Each fact must be atomic (one fact per sentence; no “and”, “or”, or compound clauses).
3. Use clear declarative sentences.
4. Maximum length per fact: 240 characters.
5. Preserve original terminology and wording as much as possible.
6. Do not include obvious statements or filler.
7. Do not summarize — extract facts as written.`;

/**
 * Default prompt for generating flashcards from facts.
 * 
 * Used in: generateFlashcards.ts
 * Dynamic content appended: Concepts JSON array
 */
export const DEFAULT_FLASHCARD_CREATION_PROMPT = 
`Using the provided concepts, generate one recall-optimized flashcard per concept.

Rules:
1. The front must require active recall (the answer must not appear or be hinted at on the front).
2. The front should ask for one specific, unambiguous answer.
3. The back should be concise (ideally a word, phrase, or short sentence).
4. Avoid multiple facts, lists, or “and/or” questions.
5. Prefer “What is / Who is / Which / When / Where” formulations when appropriate.

Formatting:
Front: a clear question or prompt
Back: the correct answer only
Tags: 1–4 short, relevant tags
Deck Name: MasterFlasher`;

/**
 * System constraints appended after the user's custom prompt.
 * These ensure the model produces valid output regardless of user customization.
 * 
 * Not user-editable to prevent breaking the output format.
 */
export const FACT_EXTRACTION_SYSTEM_CONSTRAINTS = `

---
SYSTEM CONSTRAINTS (do not override):
- If no concepts matching the criteria are found in this text, return an empty facts array.
- Focus on quality and relevance over quantity.
- Each concept must be directly stated in the source text.`;

/**
 * System constraints for flashcard creation.
 * Ensures proper output format regardless of user prompt customization.
 */
export const FLASHCARD_CREATION_SYSTEM_CONSTRAINTS = `

---
SYSTEM CONSTRAINTS (do not override):
- Generate exactly one flashcard per concept provided.
- Front must be a question or prompt, back must be the answer.
- If no concepts are provided, return an empty cards array.`;

/**
 * Fact Scoring Prompt (fixed, not user-configurable)
 *
 * Used in: scoreFacts.ts
 * This prompt scores extracted facts on learning-value dimensions
 * to filter for the most important, non-obvious, high-impact ideas.
 */
export const FACT_SCORING_PROMPT = `You are scoring candidate facts extracted from a document.

Goal:
Assign a learning-value score to each fact so that the highest-scoring facts represent the most important, non-obvious, high-impact ideas in the document.

Scoring Dimensions:
For each fact, assign a score from 0–3 on each dimension:

- Centrality: How essential is this fact to the document's main message or argument?
- Non-obviousness: Would an informed but non-expert reader already know this?
- Leverage: Does this fact help explain, unlock, or contextualize other ideas?
- Testability: Can this fact be turned into a clear recall-based flashcard with one unambiguous answer?
- Transfer: Does this fact apply beyond a single example or narrow context?

Weighting:
- Multiply Centrality by 2 when computing the total score.

Rules:
- Score each fact independently.
- Do not drop or filter facts.
- Do not rewrite or merge facts.
- Do not add new facts.
- Use the full 0–3 range where appropriate.

Notes:
- Higher scores should reflect facts that would still be worth remembering a month from now.
- Trivial, generic, or obvious facts should receive low scores.
- Big, non-obvious, explanatory ideas should receive high scores.`;
