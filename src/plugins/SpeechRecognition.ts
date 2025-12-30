import { SpeechRecognition as SpeechRecognitionPlugin } from '@capacitor-community/speech-recognition';
import type { PluginListenerHandle } from '@capacitor/core';

/**
 * Permission status for speech recognition
 */
export type PermissionState = 'prompt' | 'prompt-with-rationale' | 'granted' | 'denied';

export interface PermissionStatus {
	speechRecognition: PermissionState;
}

/**
 * Options for starting speech recognition
 */
export interface UtteranceOptions {
	/** Language for recognition (e.g., 'en-US') */
	language?: string;
	/** Maximum number of results to return */
	maxResults?: number;
	/** Prompt text to show to the user */
	prompt?: string;
	/** Whether to return partial results during recognition */
	partialResults?: boolean;
	/** Whether to show the native popup UI (Android) */
	popup?: boolean;
}

/**
 * Result from speech recognition
 */
export interface SpeechRecognitionResult {
	matches?: string[];
}

/**
 * Partial results event data
 */
export interface PartialResultsData {
	matches: string[];
}

/**
 * Listening state event data
 */
export interface ListeningStateData {
	status: 'started' | 'stopped';
}

/**
 * Speech Recognition plugin wrapper
 * 
 * Provides speech-to-text functionality using the device microphone.
 * Requires RECORD_AUDIO permission on Android.
 */
const SpeechRecognition = {
	/**
	 * Check if speech recognition is available on the device
	 */
	available: (): Promise<{ available: boolean }> => {
		return SpeechRecognitionPlugin.available();
	},

	/**
	 * Request microphone/speech recognition permission
	 */
	requestPermissions: (): Promise<PermissionStatus> => {
		return SpeechRecognitionPlugin.requestPermissions();
	},

	/**
	 * Check current permission status
	 */
	checkPermissions: (): Promise<PermissionStatus> => {
		return SpeechRecognitionPlugin.checkPermissions();
	},

	/**
	 * Start listening for speech
	 * 
	 * If partialResults is true, the function returns immediately without results
	 * and the 'partialResults' event will be emitted for each partial result.
	 * 
	 * @param options - Configuration options for speech recognition
	 * @returns Promise with recognized text matches (if partialResults is false)
	 */
	start: (options?: UtteranceOptions): Promise<SpeechRecognitionResult> => {
		return SpeechRecognitionPlugin.start(options);
	},

	/**
	 * Stop listening for speech
	 */
	stop: (): Promise<void> => {
		return SpeechRecognitionPlugin.stop();
	},

	/**
	 * Check if currently listening for speech
	 */
	isListening: (): Promise<{ listening: boolean }> => {
		return SpeechRecognitionPlugin.isListening();
	},

	/**
	 * Get list of supported languages
	 * Note: Not available on Android 13+
	 */
	getSupportedLanguages: (): Promise<{ languages: string[] }> => {
		return SpeechRecognitionPlugin.getSupportedLanguages();
	},

	/**
	 * Add listener for partial results during speech recognition
	 */
	addPartialResultsListener: (
		callback: (data: PartialResultsData) => void
	): Promise<PluginListenerHandle> => {
		return SpeechRecognitionPlugin.addListener('partialResults', callback);
	},

	/**
	 * Add listener for listening state changes
	 */
	addListeningStateListener: (
		callback: (data: ListeningStateData) => void
	): Promise<PluginListenerHandle> => {
		return SpeechRecognitionPlugin.addListener('listeningState', callback);
	},

	/**
	 * Remove all listeners
	 */
	removeAllListeners: (): Promise<void> => {
		return SpeechRecognitionPlugin.removeAllListeners();
	},
};

export default SpeechRecognition;
