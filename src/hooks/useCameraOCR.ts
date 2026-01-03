import { useState, useCallback, useEffect } from 'react';
import CameraOCR from '../plugins/CameraOCR';
import { Capacitor } from '@capacitor/core';
import type { PermissionStatus } from '../plugins/CameraOCR';

export interface UseCameraOCRReturn {
	isAvailable: boolean;
	isProcessing: boolean;
	extractedText: string;
	error: string | null;
	permissionStatus: PermissionStatus | null;
	openCamera: () => Promise<void>;
	requestPermissions: () => Promise<void>;
	reset: () => void;
	setExtractedText: (text: string) => void;
}

export function useCameraOCR(): UseCameraOCRReturn {
	const [isAvailable, setIsAvailable] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [extractedText, setExtractedText] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [permissionStatus, setPermissionStatus] = useState<PermissionStatus | null>(null);

	useEffect(() => {
		const checkAvailability = async () => {
			if (Capacitor.isNativePlatform()) {
				try {
					// Check if plugin is registered (optional check, but good for safety)
					setIsAvailable(true);
					const status = await CameraOCR.checkPermissions();
					setPermissionStatus(status);
				} catch (e) {
					console.error('CameraOCR not available:', e);
					setIsAvailable(false);
				}
			} else {
				setIsAvailable(false);
			}
		};

		checkAvailability();
	}, []);

	const requestPermissions = useCallback(async () => {
		try {
			const status = await CameraOCR.requestPermissions();
			setPermissionStatus(status);
		} catch (e) {
			console.error('Failed to request permissions:', e);
			setError('Failed to request camera permissions');
		}
	}, []);

	const openCamera = useCallback(async () => {
		setError(null);
		setIsProcessing(true);

		try {
			const result = await CameraOCR.captureOCR();
			if (result.cancelled) {
				// User cancelled, do nothing? or clear text?
				// Let's keep previous text if any, or just don't set error.
			} else if (result.text) {
				setExtractedText(result.text);
			} else {
				// Empty text but not cancelled?
				setError('No text detected');
			}
		} catch (e: any) {
			console.error('OCR Error:', e);
			// Check if it's a "No text extracted" rejection or generic error
			if (typeof e === 'string') { // reject("message")
				setError(e);
			} else if (e.message) {
				setError(e.message);
			} else {
				setError('Failed to capture text');
			}
		} finally {
			setIsProcessing(false);
		}
	}, []);

	const reset = useCallback(() => {
		setExtractedText('');
		setError(null);
		setIsProcessing(false);
	}, []);

	return {
		isAvailable,
		isProcessing,
		extractedText,
		error,
		permissionStatus,
		openCamera,
		requestPermissions,
		reset,
		setExtractedText,
	};
}
