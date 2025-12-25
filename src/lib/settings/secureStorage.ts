/**
 * Secure Storage Service
 * 
 * Wraps capacitor-secure-storage-plugin with typed methods for
 * managing Gemini API configuration securely.
 */

import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';

const KEYS = {
  GEMINI_API_KEY: 'gemini_api_key',
  GEMINI_MODEL: 'gemini_model',
} as const;

/**
 * Retrieves the stored Gemini API key from secure storage.
 * @returns The API key or null if not found/error
 */
export async function getGeminiApiKey(): Promise<string | null> {
  try {
    const result = await SecureStoragePlugin.get({ key: KEYS.GEMINI_API_KEY });
    return result.value;
  } catch {
    // Key doesn't exist or storage error
    return null;
  }
}

/**
 * Stores the Gemini API key in secure storage.
 * @param value - The API key to store
 * @returns true if successful, false otherwise
 */
export async function setGeminiApiKey(value: string): Promise<boolean> {
  try {
    await SecureStoragePlugin.set({ key: KEYS.GEMINI_API_KEY, value });
    return true;
  } catch (error) {
    console.error('Failed to save API key to secure storage:', error);
    return false;
  }
}

/**
 * Retrieves the stored Gemini model name from secure storage.
 * @returns The model name or null if not found/error
 */
export async function getGeminiModel(): Promise<string | null> {
  try {
    const result = await SecureStoragePlugin.get({ key: KEYS.GEMINI_MODEL });
    return result.value;
  } catch {
    // Key doesn't exist or storage error
    return null;
  }
}

/**
 * Stores the Gemini model name in secure storage.
 * @param value - The model name to store
 * @returns true if successful, false otherwise
 */
export async function setGeminiModel(value: string): Promise<boolean> {
  try {
    await SecureStoragePlugin.set({ key: KEYS.GEMINI_MODEL, value });
    return true;
  } catch (error) {
    console.error('Failed to save model to secure storage:', error);
    return false;
  }
}

/**
 * Removes all Gemini-related settings from secure storage.
 */
export async function clearGeminiSettings(): Promise<void> {
  try {
    await SecureStoragePlugin.remove({ key: KEYS.GEMINI_API_KEY });
  } catch {
    // Ignore - key may not exist
  }
  try {
    await SecureStoragePlugin.remove({ key: KEYS.GEMINI_MODEL });
  } catch {
    // Ignore - key may not exist
  }
}

/**
 * Checks if a Gemini API key exists in secure storage.
 * @returns true if an API key is stored, false otherwise
 */
export async function hasStoredApiKey(): Promise<boolean> {
  const key = await getGeminiApiKey();
  return key !== null && key.length > 0;
}
