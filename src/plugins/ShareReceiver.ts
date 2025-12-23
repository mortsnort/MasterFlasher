import { registerPlugin } from '@capacitor/core';

export interface ShareReceiverPlugin {
	getSharedText(): Promise<{ value: string | null; mode: 'text' | 'url' | null }>;
}

const ShareReceiver = registerPlugin<ShareReceiverPlugin>('ShareReceiver');

export default ShareReceiver;
