import { registerPlugin } from '@capacitor/core';

/**
 * Inbox entry representing shared content
 *
 * Content types:
 * - text: Plain text shared from any app
 * - url: A URL that can be extracted via WebClipper
 * - pdf: A PDF file stored locally with Capacitor-compatible URL for pdf.js access
 */
export interface InboxEntry {
	id: string;
	contentType: 'text' | 'url' | 'pdf';
	/**
	 * The content value:
	 * - For text: the actual text content
	 * - For url: the URL string
	 * - For pdf: Capacitor-compatible file URL (capacitor://localhost/_capacitor_file_/path/to/file.pdf)
	 */
	content: string;
	preview: string;
	/** Title from WebClipper (URLs) or original filename (PDFs) */
	title?: string;
	/** Extracted text content (from WebClipper for URLs, pdf.js for PDFs) */
	extractedText?: string;
	deckName?: string;
	isLocked: boolean;
	createdAt: number;
}

/**
 * Generated flashcard linked to an inbox entry
 */
export interface GeneratedCard {
	id: string;
	entryId: string;
	front: string;
	back: string;
	tags: string[];
	status: 'pending' | 'added' | 'error';
	noteId?: number;
}

/**
 * Capacitor plugin interface for inbox database operations
 */
export interface InboxPlugin {
	/**
	 * Get all inbox entries, sorted by creation date (newest first)
	 */
	getAllEntries(): Promise<{ entries: InboxEntry[] }>;

	/**
	 * Get a single entry by ID with its cards
	 */
	getEntry(options: { id: string }): Promise<{ entry: InboxEntry; cards: GeneratedCard[] }>;

	/**
	 * Save (insert or update) an entry
	 */
	saveEntry(options: { entry: Partial<InboxEntry> & { id: string } }): Promise<void>;

	/**
	 * Delete an entry by ID (cascade deletes its cards)
	 */
	deleteEntry(options: { id: string }): Promise<void>;

	/**
	 * Save generated cards for an entry
	 */
	saveCards(options: { entryId: string; cards: Omit<GeneratedCard, 'entryId'>[] }): Promise<void>;

	/**
	 * Update a card's status (e.g., after adding to Anki)
	 */
	updateCardStatus(options: { cardId: string; status: string; noteId?: number }): Promise<void>;

	/**
	 * Check if all cards for an entry have been added, and if so, auto-remove the entry
	 */
	checkAutoRemove(options: { entryId: string }): Promise<{ removed: boolean }>;

	/**
	 * Lock an entry after cards have been generated
	 */
	lockEntry(options: { entryId: string }): Promise<void>;

	/**
	 * Update entry with extracted content from WebClipper
	 */
	updateExtractedContent(options: { entryId: string; title?: string; extractedText: string }): Promise<void>;

	/**
	 * Update entry's deck name
	 */
	updateDeckName(options: { entryId: string; deckName: string }): Promise<void>;
}

const Inbox = registerPlugin<InboxPlugin>('Inbox');

export default Inbox;
