/**
 * Prompt Configuration Service
 * 
 * Provides functions to get and set custom prompts for fact extraction
 * and flashcard creation. Falls back to defaults when no custom prompt
 * is configured.
 */

import Settings, { SETTINGS_KEYS } from '../../plugins/Settings';
import {
	DEFAULT_FACT_EXTRACTION_PROMPT,
	DEFAULT_FLASHCARD_CREATION_PROMPT,
} from './defaultPrompts';

/**
 * Get the fact extraction prompt.
 * Returns custom prompt if configured, otherwise default.
 */
export async function getFactExtractionPrompt(): Promise<string> {
	try {
		const result = await Settings.getSetting({ key: SETTINGS_KEYS.FACT_EXTRACTION_PROMPT });
		if (result.value && result.value.trim()) {
			return result.value;
		}
	} catch (error) {
		console.warn('Failed to get custom fact extraction prompt, using default:', error);
	}
	return DEFAULT_FACT_EXTRACTION_PROMPT;
}

/**
 * Set a custom fact extraction prompt.
 * @param prompt - The custom prompt to save
 */
export async function setFactExtractionPrompt(prompt: string): Promise<boolean> {
	try {
		await Settings.setSetting({
			key: SETTINGS_KEYS.FACT_EXTRACTION_PROMPT,
			value: prompt,
		});
		return true;
	} catch (error) {
		console.error('Failed to save custom fact extraction prompt:', error);
		return false;
	}
}

/**
 * Reset fact extraction prompt to default (deletes custom prompt).
 */
export async function resetFactExtractionPrompt(): Promise<boolean> {
	try {
		await Settings.deleteSetting({ key: SETTINGS_KEYS.FACT_EXTRACTION_PROMPT });
		return true;
	} catch (error) {
		console.error('Failed to reset fact extraction prompt:', error);
		return false;
	}
}

/**
 * Get the flashcard creation prompt.
 * Returns custom prompt if configured, otherwise default.
 */
export async function getFlashcardCreationPrompt(): Promise<string> {
	try {
		const result = await Settings.getSetting({ key: SETTINGS_KEYS.FLASHCARD_CREATION_PROMPT });
		if (result.value && result.value.trim()) {
			return result.value;
		}
	} catch (error) {
		console.warn('Failed to get custom flashcard creation prompt, using default:', error);
	}
	return DEFAULT_FLASHCARD_CREATION_PROMPT;
}

/**
 * Set a custom flashcard creation prompt.
 * @param prompt - The custom prompt to save
 */
export async function setFlashcardCreationPrompt(prompt: string): Promise<boolean> {
	try {
		await Settings.setSetting({
			key: SETTINGS_KEYS.FLASHCARD_CREATION_PROMPT,
			value: prompt,
		});
		return true;
	} catch (error) {
		console.error('Failed to save custom flashcard creation prompt:', error);
		return false;
	}
}

/**
 * Reset flashcard creation prompt to default (deletes custom prompt).
 */
export async function resetFlashcardCreationPrompt(): Promise<boolean> {
	try {
		await Settings.deleteSetting({ key: SETTINGS_KEYS.FLASHCARD_CREATION_PROMPT });
		return true;
	} catch (error) {
		console.error('Failed to reset flashcard creation prompt:', error);
		return false;
	}
}

/**
 * Check if a custom fact extraction prompt is configured.
 */
export async function hasCustomFactExtractionPrompt(): Promise<boolean> {
	try {
		const result = await Settings.getSetting({ key: SETTINGS_KEYS.FACT_EXTRACTION_PROMPT });
		return result.value !== null && result.value.trim() !== '';
	} catch {
		return false;
	}
}

/**
 * Check if a custom flashcard creation prompt is configured.
 */
export async function hasCustomFlashcardCreationPrompt(): Promise<boolean> {
	try {
		const result = await Settings.getSetting({ key: SETTINGS_KEYS.FLASHCARD_CREATION_PROMPT });
		return result.value !== null && result.value.trim() !== '';
	} catch {
		return false;
	}
}
