# Fact Scoring Feature

## Purpose

The fact scoring feature filters extracted facts by their learning value before generating flashcards. This ensures that only the most important, non-obvious, and high-impact ideas from a document become flashcards, improving the quality of the generated cards.

## Key Files

- [`src/lib/gemini/scoreFacts.ts`](../src/lib/gemini/scoreFacts.ts) — Main scoring module with `scoreFacts()` and `filterScoredFacts()` functions
- [`src/lib/anki/types.ts`](../src/lib/anki/types.ts) — Type definitions for `FactScores`, `FactScore`, and `ScoredFact`
- [`src/lib/settings/defaultPrompts.ts`](../src/lib/settings/defaultPrompts.ts) — Contains `FACT_SCORING_PROMPT` constant
- [`src/pages/EntryDetailScreen.tsx`](../src/pages/EntryDetailScreen.tsx) — Integrates scoring into the card generation flow

## How It Works

### Flow

```
Text → generateFacts() → scoreFacts() → filterScoredFacts() → generateFlashcards() → Cards
```

1. **Fact Extraction**: Text is processed by `generateFacts()` to extract key concepts
2. **Scoring**: Each fact is scored by Gemini on 5 learning-value dimensions
3. **Filtering**: Facts are filtered by score threshold and capped at top 40
4. **Card Generation**: Only high-value facts are passed to `generateFlashcards()`

### Scoring Dimensions

Each fact is scored from 0-3 on five dimensions:

| Dimension | Description | Weight |
|-----------|-------------|--------|
| Centrality | How essential to the document's main message | **2x** |
| Non-obviousness | Would an informed non-expert already know this? | 1x |
| Leverage | Does it help explain or unlock other ideas? | 1x |
| Testability | Can it become a clear recall-based flashcard? | 1x |
| Transfer | Does it apply beyond a single narrow context? | 1x |

### Score Calculation

```
score_total = (centrality × 2) + non_obviousness + leverage + testability + transfer
```

- **Minimum score**: 0
- **Maximum score**: 18
- **Threshold**: > 11 (facts must score 12 or higher)

### Filtering Rules

1. **Single fact exception**: If only 1 fact exists, it always passes regardless of score
2. **Score threshold**: Only facts with `score_total > 11` pass to flashcard generation
3. **Cap at 40**: If more than 40 facts pass the threshold, only the top 40 by score are kept

## Dependencies

- `@google/generative-ai` — Gemini API client for scoring
- Gemini API key configured in Settings

## Usage

The scoring is automatically integrated into the card generation flow. When a user taps "Generate Cards":

1. UI shows "Extracting facts with Gemini..."
2. UI shows "Scoring X facts for learning value..."
3. UI shows "Selected Y high-value facts from X total"
4. UI shows "Generating flashcards from Y facts..."

No user configuration is needed. The scoring prompt is fixed and not user-customizable to ensure consistent quality filtering.

## API

### `scoreFacts(facts: Fact[]): Promise<ScoredFact[]>`

Scores an array of facts using Gemini. Returns the facts enriched with score information.

```typescript
import { scoreFacts } from '../lib/gemini/scoreFacts';

const facts = [{ id: '1', fact: 'The mitochondria is the powerhouse of the cell.' }];
const scoredFacts = await scoreFacts(facts);
// scoredFacts[0].score?.score_total => e.g., 14
```

### `filterScoredFacts(scoredFacts: ScoredFact[]): Fact[]`

Filters scored facts based on the three filtering rules. Returns facts without score property for downstream compatibility.

```typescript
import { filterScoredFacts } from '../lib/gemini/scoreFacts';

const highValueFacts = filterScoredFacts(scoredFacts);
// Only facts with score > 11, capped at top 40
```

## Edge Cases

- **Empty facts array**: Scoring is skipped, returns empty array
- **Single fact**: Always passes regardless of score
- **All facts score ≤ 11**: Shows error "No high-value facts were found"
- **More than 40 facts pass**: Sorted by score, top 40 selected
- **API failure during scoring**: Facts without scores are included by default (conservative approach)
- **Batching**: Large fact sets are automatically batched to avoid API limits

## Types

```typescript
interface FactScores {
  centrality: number;      // 0-3, weighted 2x in total
  non_obviousness: number; // 0-3
  leverage: number;        // 0-3
  testability: number;     // 0-3
  transfer: number;        // 0-3
}

interface FactScore {
  id: string;
  scores: FactScores;
  score_total: number;     // 0-18
}

interface ScoredFact extends Fact {
  score?: FactScore;
}
```

## UI State Machine

The `EntryDetailScreen` now includes a `SCORING_FACTS` state:

```
READY → GENERATING_FACTS → SCORING_FACTS → GENERATING_CARDS → REVIEW_CARDS
```

## Future Improvements

- Consider making the score threshold configurable in Settings
- Add visual display of fact scores in debug mode
- Consider caching scores for re-generation scenarios
