import { registerPlugin } from '@capacitor/core';

/**
 * Settings storage keys used in the app
 */
export const SETTINGS_KEYS = {
	FACT_EXTRACTION_PROMPT: 'fact_extraction_prompt',
	FLASHCARD_CREATION_PROMPT: 'flashcard_creation_prompt',
} as const;

export type SettingsKey = typeof SETTINGS_KEYS[keyof typeof SETTINGS_KEYS];

/**
 * Capacitor plugin interface for app settings storage.
 * 
 * Provides key-value storage for non-sensitive settings like custom prompts.
 * Uses Room database on Android for persistence.
 */
export interface SettingsPlugin {
	/**
	 * Get a setting value by key
	 * @param options.key - The setting key to retrieve
	 * @returns The setting value, or null if not found
	 */
	getSetting(options: { key: string }): Promise<{ value: string | null }>;

	/**
	 * Set a setting value
	 * @param options.key - The setting key to set
	 * @param options.value - The value to store
	 */
	setSetting(options: { key: string; value: string }): Promise<void>;

	/**
	 * Delete a setting by key (resets to default)
	 * @param options.key - The setting key to delete
	 */
	deleteSetting(options: { key: string }): Promise<void>;
}

const Settings = registerPlugin<SettingsPlugin>('Settings');

export default Settings;
