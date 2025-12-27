import * as pdfjsLib from 'pdfjs-dist';
import type { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { Filesystem } from '@capacitor/filesystem';

// Configure the pdf.js worker for Vite
// This is the reliable way to set up the worker in a Vite/modern bundler environment
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * Type guard to check if an item is a TextItem (has str property)
 */
function isTextItem(item: TextItem | TextMarkedContent): item is TextItem {
	return 'str' in item;
}

/**
 * Convert base64 string to Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
	const binaryString = atob(base64);
	const len = binaryString.length;
	const bytes = new Uint8Array(len);
	for (let i = 0; i < len; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}
	return bytes;
}

/**
 * Extract file path from Capacitor URL
 *
 * Format: capacitor://localhost/_capacitor_file_/data/user/0/com.snortstudios.masterflasher/files/pdfs/pdf_uuid.pdf
 * Returns: /data/user/0/com.snortstudios.masterflasher/files/pdfs/pdf_uuid.pdf
 */
function extractFilePath(capacitorUrl: string): string {
	const prefix = 'capacitor://localhost/_capacitor_file_';
	if (capacitorUrl.startsWith(prefix)) {
		return capacitorUrl.substring(prefix.length);
	}
	// Fallback - just return as-is
	return capacitorUrl;
}

/**
 * Extract text content from a PDF file using pdf.js
 *
 * @param pdfUrl - Capacitor-compatible file URL (capacitor://localhost/_capacitor_file_/path/to/file.pdf)
 * @returns Extracted and cleaned text content from all pages
 * @throws Error if PDF cannot be loaded or is password-protected
 */
export async function extractPdfText(pdfUrl: string): Promise<string> {
	try {
		// Extract the file path from the Capacitor URL
		const filePath = extractFilePath(pdfUrl);
		
		// Read the file using Capacitor Filesystem API
		// Note: For files in the app's files directory, we use absolute path with URI
		const result = await Filesystem.readFile({
			path: filePath,
		});
		
		// Convert base64 data to Uint8Array for pdf.js
		// result.data is base64-encoded on mobile
		let pdfData: Uint8Array;
		if (typeof result.data === 'string') {
			pdfData = base64ToUint8Array(result.data);
		} else {
			// Blob type (web platform)
			const arrayBuffer = await result.data.arrayBuffer();
			pdfData = new Uint8Array(arrayBuffer);
		}
		
		// Load the PDF document from data
		const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
		const textParts: string[] = [];

		// Extract text from each page
		for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
			const page = await pdf.getPage(pageNum);
			const textContent = await page.getTextContent();

			// Join text items from the page (filter out TextMarkedContent items)
			const pageText = textContent.items
				.filter(isTextItem)
				.map((item) => item.str)
				.join(' ');

			textParts.push(pageText);
		}

		// Join all pages with double newlines and clean up
		const rawText = textParts.join('\n\n');
		return cleanExtractedText(rawText);
	} catch (error) {
		console.error('PDF extraction error:', error);
		// Re-throw with more descriptive message
		if (error instanceof Error) {
			if (error.message.includes('password')) {
				throw new Error('This PDF is password-protected. Please use an unprotected PDF.');
			}
			throw new Error(`Failed to extract PDF text: ${error.message}`);
		}
		throw new Error('Failed to extract PDF text: Unknown error');
	}
}

/**
 * Clean up common PDF text extraction artifacts
 * 
 * This function handles:
 * - Hyphenated line breaks (hy-\nphen → hyphen)
 * - Multiple spaces/tabs → single space
 * - Multiple newlines → double newline
 * - Trimmed lines
 */
function cleanExtractedText(text: string): string {
	return (
		text
			// Fix hyphenated line breaks: "hy-\nphen" → "hyphen"
			.replace(/(\w)-\n(\w)/g, '$1$2')
			// Normalize multiple spaces/tabs to single space
			.replace(/[ \t]+/g, ' ')
			// Normalize multiple newlines to double newline (paragraph breaks)
			.replace(/\n{3,}/g, '\n\n')
			// Trim whitespace from each line
			.split('\n')
			.map((line) => line.trim())
			.join('\n')
			// Final trim
			.trim()
	);
}
