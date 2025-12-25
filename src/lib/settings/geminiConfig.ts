/**
 * Gemini Configuration Service
 * 
 * Resolves Gemini API key and model from secure storage (production)
 * or environment variables (development).
 */

import { getGeminiApiKey, getGeminiModel } from './secureStorage';

/** Default model when none is specified by user */
export const DEFAULT_MODEL = 'gemini-2.5-flash-lite';

export interface GeminiConfig {
  apiKey: string;
  modelName: string;
}

/**
 * Retrieves the Gemini configuration.
 * 
 * In development mode (import.meta.env.DEV), uses environment variables.
 * In production mode, uses secure storage.
 * 
 * @returns GeminiConfig if available, null if API key is not configured
 */
export async function getGeminiConfig(): Promise<GeminiConfig | null> {
  // In development mode, use env variables
  if (import.meta.env.DEV) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const modelName = import.meta.env.VITE_GEMINI_MODEL_NAME || DEFAULT_MODEL;
    
    if (apiKey) {
      return { apiKey, modelName };
    }
    // Fall through to check secure storage in dev mode too
    // This allows testing the secure storage flow during development
  }
  
  // In production (or if env vars not set in dev), use secure storage
  const apiKey = await getGeminiApiKey();
  if (!apiKey) {
    return null; // Signal that settings need to be configured
  }
  
  const modelName = (await getGeminiModel()) || DEFAULT_MODEL;
  return { apiKey, modelName };
}

/**
 * Checks if a valid Gemini configuration is available.
 * @returns true if API key is configured, false otherwise
 */
export async function hasValidConfig(): Promise<boolean> {
  const config = await getGeminiConfig();
  return config !== null;
}

/**
 * Creates an error indicating missing API key configuration.
 * Use this for consistent error messaging across the app.
 */
export function createMissingConfigError(): Error {
  return new Error('Gemini API Key not configured. Please set your API key in Settings.');
}
