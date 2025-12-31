export interface Fact {
  id: string;
  fact: string;
  context?: string;
}

export interface FactsResponse {
  sourceTitle?: string;
  facts: Fact[];
}

// Fact Scoring Types
export interface FactScores {
  centrality: number;      // 0-3, weighted 2x in total
  non_obviousness: number; // 0-3
  leverage: number;        // 0-3
  testability: number;     // 0-3
  transfer: number;        // 0-3
}

export interface FactScore {
  id: string;
  scores: FactScores;
  score_total: number;     // 0-18 (centrality*2 + other dimensions)
}

export interface ScoredFact extends Fact {
  score?: FactScore;
}

export interface Flashcard {
  type: 'basic';
  front: string;
  back: string;
  tags?: string[];
}

export interface FlashcardsResponse {
  deck: string;
  cards: Flashcard[];
}

export interface ExtractedContent {
  text: string;
  title?: string;
  url?: string;
}

// Plugin Interactions
export interface AnkiNote {
  deckName: string;
  modelKey: string;
  front: string;
  back: string;
  tags?: string[];
}
