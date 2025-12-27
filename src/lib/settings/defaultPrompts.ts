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
export const DEFAULT_FACT_EXTRACTION_PROMPT = `Extract explicit, relevant key concepts stated in the text.

Constraints:
1. Each key concept must be a single declarative sentence.
2. Maximum length per key concept: 240 characters.
3. No inference or interpretation - only explicit concepts from the source material.
4. Prioritize the most significant and unique concepts.`;

/**
 * Default prompt for generating flashcards from facts.
 * 
 * Used in: generateFlashcards.ts
 * Dynamic content appended: Concepts JSON array
 */
export const DEFAULT_FLASHCARD_CREATION_PROMPT = `Using these concepts, generate a flash card for each concept.
Front should be a clear question/prompt; back is the answer.
Add 1-4 short tags.
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
