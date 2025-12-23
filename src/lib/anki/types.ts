export interface Fact {
  id: string;
  fact: string;
  context?: string;
}

export interface FactsResponse {
  sourceTitle?: string;
  facts: Fact[];
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
