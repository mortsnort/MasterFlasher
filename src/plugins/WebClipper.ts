import { registerPlugin } from '@capacitor/core';

export interface WebClipperPlugin {
	open(options: { url: string }): Promise<{ title?: string; text: string; url?: string }>;
}

const WebClipper = registerPlugin<WebClipperPlugin>('WebClipper');

export default WebClipper;
