import { useState, useCallback, useEffect, useRef } from 'react';
import SpeechRecognition from '../plugins/SpeechRecognition';
import type { PermissionState, PartialResultsData } from '../plugins/SpeechRecognition';
import type { PluginListenerHandle } from '@capacitor/core';

export interface UseSpeechRecognitionState {
	/** Whether speech recognition is available on this device */
	isAvailable: boolean;
	/** Whether the app is currently listening for speech */
	isListening: boolean;
	/** Current recognized text (final or partial) */
	transcript: string;
	/** Error message if something went wrong */
	error: string | null;
	/** Current permission status */
	permissionStatus: PermissionState | null;
	/** Whether the hook is initializing */
	isInitializing: boolean;
}

export interface UseSpeechRecognitionActions {
	/** Start listening for speech */
	startListening: () => Promise<void>;
	/** Stop listening for speech */
	stopListening: () => Promise<void>;
	/** Request microphone permission */
	requestPermission: () => Promise<boolean>;
	/** Clear the current transcript and error */
	reset: () => void;
}

export type UseSpeechRecognitionReturn = UseSpeechRecognitionState & UseSpeechRecognitionActions;

/**
 * Custom hook for speech recognition functionality
 * 
 * Provides a simple interface to:
 * - Check device availability and permissions
 * - Start/stop speech recognition
 * - Get real-time transcription results
 * - Handle errors gracefully
 * 
 * @example
 * ```tsx
 * const { isListening, transcript, startListening, stopListening } = useSpeechRecognition();
 * 
 * return (
 *   <div>
 *     <button onClick={startListening}>Start</button>
 *     <button onClick={stopListening}>Stop</button>
 *     <p>{transcript}</p>
 *   </div>
 * );
 * ```
 */
export function useSpeechRecognition(): UseSpeechRecognitionReturn {
	const [isAvailable, setIsAvailable] = useState(false);
	const [isListening, setIsListening] = useState(false);
	const [transcript, setTranscript] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [permissionStatus, setPermissionStatus] = useState<PermissionState | null>(null);
	const [isInitializing, setIsInitializing] = useState(true);

	// Keep track of listeners for cleanup
	const partialResultsListenerRef = useRef<PluginListenerHandle | null>(null);
	const listeningStateListenerRef = useRef<PluginListenerHandle | null>(null);

	/**
	 * Initialize: check availability and permission status
	 */
	useEffect(() => {
		const initialize = async () => {
			try {
				// Check if speech recognition is available
				const { available } = await SpeechRecognition.available();
				setIsAvailable(available);

				if (available) {
					// Check current permission status
					const status = await SpeechRecognition.checkPermissions();
					setPermissionStatus(status.speechRecognition);
				}
			} catch (e) {
				console.error('Failed to initialize speech recognition:', e);
				setError('Failed to initialize speech recognition');
			} finally {
				setIsInitializing(false);
			}
		};

		initialize();

		// Cleanup listeners on unmount
		return () => {
			SpeechRecognition.removeAllListeners();
		};
	}, []);

	/**
	 * Request microphone permission
	 * @returns true if permission was granted
	 */
	const requestPermission = useCallback(async (): Promise<boolean> => {
		try {
			setError(null);
			const status = await SpeechRecognition.requestPermissions();
			setPermissionStatus(status.speechRecognition);
			return status.speechRecognition === 'granted';
		} catch (e) {
			console.error('Failed to request permission:', e);
			setError('Failed to request microphone permission');
			return false;
		}
	}, []);

	/**
	 * Start listening for speech
	 */
	const startListening = useCallback(async (): Promise<void> => {
		try {
			setError(null);
			setTranscript('');

			// Check availability
			if (!isAvailable) {
				setError('Speech recognition is not available on this device');
				return;
			}

			// Check/request permission
			if (permissionStatus !== 'granted') {
				const granted = await requestPermission();
				if (!granted) {
					setError('Microphone permission is required for speech recognition');
					return;
				}
			}

			// Set up listener for partial results
			partialResultsListenerRef.current = await SpeechRecognition.addPartialResultsListener(
				(data: PartialResultsData) => {
					if (data.matches && data.matches.length > 0) {
						// Use the first (best) match
						setTranscript(data.matches[0]);
					}
				}
			);

			// Set up listener for listening state changes
			listeningStateListenerRef.current = await SpeechRecognition.addListeningStateListener(
				(data) => {
					setIsListening(data.status === 'started');
				}
			);

			setIsListening(true);

			// Start speech recognition with partial results
			// Note: When partialResults is true, start() returns immediately without results
			// and results come through the partialResults event listener instead
			const result = await SpeechRecognition.start({
				language: 'en-US',
				partialResults: true,
				popup: false,
			});

			// If we got final results (only when partialResults is false or recognition auto-completed)
			// When partialResults is true, result may be undefined
			if (result && result.matches && result.matches.length > 0) {
				setTranscript(result.matches[0]);
			}

			// Note: isListening will be updated by the listeningState listener when recognition stops
		} catch (e) {
			console.error('Failed to start speech recognition:', e);
			setError('Failed to start speech recognition');
			setIsListening(false);
		}
	}, [isAvailable, permissionStatus, requestPermission]);

	/**
	 * Stop listening for speech
	 */
	const stopListening = useCallback(async (): Promise<void> => {
		try {
			await SpeechRecognition.stop();
			setIsListening(false);

			// Clean up listeners
			if (partialResultsListenerRef.current) {
				await partialResultsListenerRef.current.remove();
				partialResultsListenerRef.current = null;
			}
			if (listeningStateListenerRef.current) {
				await listeningStateListenerRef.current.remove();
				listeningStateListenerRef.current = null;
			}
		} catch (e) {
			console.error('Failed to stop speech recognition:', e);
			// Still try to update state
			setIsListening(false);
		}
	}, []);

	/**
	 * Reset transcript and error
	 */
	const reset = useCallback(() => {
		setTranscript('');
		setError(null);
	}, []);

	return {
		isAvailable,
		isListening,
		transcript,
		error,
		permissionStatus,
		isInitializing,
		startListening,
		stopListening,
		requestPermission,
		reset,
	};
}

export default useSpeechRecognition;
