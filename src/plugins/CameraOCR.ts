import { registerPlugin } from '@capacitor/core';
import type { PermissionState } from '@capacitor/core';

export interface CameraOCRResult {
	text: string;
	cancelled?: boolean;
}

export interface PermissionStatus {
	camera: PermissionState;
	read_media_images: PermissionState;
	read_external_storage: PermissionState;
}

export interface CameraOCRPlugin {
	captureOCR(): Promise<CameraOCRResult>;
	checkPermissions(): Promise<PermissionStatus>;
	requestPermissions(): Promise<PermissionStatus>;
}

const CameraOCR = registerPlugin<CameraOCRPlugin>('CameraOCR');

export default CameraOCR;
