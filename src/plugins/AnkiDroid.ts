import { registerPlugin } from '@capacitor/core';

export interface AnkiDroidPlugin {
	isAvailable(): Promise<{ value: boolean }>;
	hasPermission(): Promise<{ value: boolean }>;
	requestPermission(): Promise<{ value: boolean }>;
	addBasicCard(options: {
		deckName: string;
		modelKey: string;
		front: string;
		back: string;
		tags: string[];
	}): Promise<{ noteId?: number }>;
}

const AnkiDroid = registerPlugin<AnkiDroidPlugin>('AnkiDroid');

export default AnkiDroid;
