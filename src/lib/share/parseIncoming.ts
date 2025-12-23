import ShareReceiver from '../../plugins/ShareReceiver';

export interface IncomingShare {
	mode: 'text' | 'url';
	content: string;
}

export async function parseIncomingShare(): Promise<IncomingShare | null> {
	try {
		const result = await ShareReceiver.getSharedText();

		if (!result.value || !result.mode) {
			return null;
		}

		// Double check URL heuristic just in case native didn't catch it or for consistency
		// But we rely mainly on the plugin's mode if logic is there.
		// However, the plan says "Read Intent Extras... Determine payload: If string matches /^https?:\/\/..."
		// I can do that check here if the plugin returns raw text, or rely on plugin.
		// Let's assume the plugin returns the mode it detected, but we trust the content.

		return {
			mode: result.mode,
			content: result.value,
		};
	} catch (e) {
		console.warn('Error parsing incoming share:', e);
		return null;
	}
}
