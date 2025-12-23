import React, { useEffect, useState } from 'react';
import {
	IonPage,
	IonContent,
	IonHeader,
	IonToolbar,
	IonTitle,
	IonButton,
	IonProgressBar,
	IonText,
	IonCard,
	IonCardHeader,
	IonCardTitle,
	IonCardContent,
	IonList,
	IonItem,
	IonLabel,
	IonChip,
} from '@ionic/react';
import { Share } from '@capacitor/share';
import ShareReceiver from '../plugins/ShareReceiver';
import { parseIncomingShare } from '../lib/share/parseIncoming';
import type { IncomingShare } from '../lib/share/parseIncoming';
import { generateFacts } from '../lib/gemini/generateFacts';
import { generateFlashcards } from '../lib/gemini/generateFlashcards';
import WebClipper from '../plugins/WebClipper';
import AnkiDroid from '../plugins/AnkiDroid';
import type { Flashcard } from '../lib/anki/types';

type UIState =
	| 'IDLE'
	| 'ANALYZING'
	| 'READY_TO_EXTRACT' // For URL flow
	| 'EXTRACTING'
	| 'GENERATING_FACTS'
	| 'GENERATING_CARDS'
	| 'ADDING_TO_ANKI'
	| 'SUCCESS'
	| 'FALLBACK'
	| 'ERROR';

const ImportScreen: React.FC = () => {
	const [state, setState] = useState<UIState>('IDLE');
	const [shareData, setShareData] = useState<IncomingShare | null>(null);
	const [log, setLog] = useState<string>('Waiting for share...');
	const [generatedCards, setGeneratedCards] = useState<Flashcard[]>([]);
	const [errorMsg, setErrorMsg] = useState<string>('');


	// ... 

	useEffect(() => {
		init();

		const listener = (ShareReceiver as any).addListener('shareReceived', (data: any) => {
			console.log('Share received while running:', data);
			if (data.value && data.mode) {
				setShareData({ mode: data.mode, content: data.value });
				setLog(`Received new ${data.mode}: ${data.value.slice(0, 50)}...`);
				if (data.mode === 'url') {
					setState('READY_TO_EXTRACT');
				} else {
					startProcessing(data.value, 'Shared Text');
				}
			}
		});

		return () => {
			listener.then((handle: any) => handle.remove());
		};
	}, []);

	const init = async () => {
		setState('ANALYZING');
		const share = await parseIncomingShare();
		if (share) {
			setShareData(share);
			// ... existing init logic ...
			setLog(`Received ${share.mode}: ${share.content.slice(0, 50)}...`);
			if (share.mode === 'url') {
				setState('READY_TO_EXTRACT');
			} else {
				startProcessing(share.content, 'Shared Text');
			}
		} else {
			setLog('No share data found. App likely launched directly.');
			setState('IDLE');
		}
	};

	const handleExtract = async () => {
		if (!shareData || shareData.mode !== 'url') return;
		try {
			setState('EXTRACTING');
			setLog('Opening Web Clipper...');
			const result = await WebClipper.open({ url: shareData.content });
			setLog(`Extracted: ${result.title || 'No Title'} (${result.text.length} chars)`);

			await startProcessing(result.text, result.title);
		} catch (e) {
			console.error(e);
			handleError('Extraction failed or cancelled.');
		}
	};

	const startProcessing = async (text: string, title?: string) => {
		try {
			setState('GENERATING_FACTS');
			setLog('Generating facts with Gemini...');
			const factsResp = await generateFacts(text, title);
			setLog(`Generated ${factsResp.facts.length} facts.`);

			setState('GENERATING_CARDS');
			setLog('Generating flashcards...');
			const cardsResp = await generateFlashcards(factsResp.facts);
			setGeneratedCards(cardsResp.cards);
			setLog(`Generated ${cardsResp.cards.length} cards.`);

			await addToAnki(cardsResp.cards);
		} catch (e) {
			console.error(e);
			handleError('Processing failed: ' + (e instanceof Error ? e.message : String(e)));
		}
	};

	const addToAnki = async (cards: Flashcard[]) => {
		setState('ADDING_TO_ANKI');
		try {
			const available = await AnkiDroid.isAvailable();
			if (!available.value) {
				throw new Error('AnkiDroid not available');
			}

			const perm = await AnkiDroid.hasPermission();
			if (!perm.value) {
				const req = await AnkiDroid.requestPermission();
				if (!req.value) throw new Error('Permission denied');
			}

			for (const card of cards) {
				// Deck Name HARDCODED as per spec
				await AnkiDroid.addBasicCard({
					deckName: 'DomeKeep',
					modelKey: 'com.snortstudios.domekeep',
					front: card.front,
					back: card.back,
					tags: card.tags || [],
				});
			}
			setState('SUCCESS');
			setLog('All cards added to AnkiDroid!');
		} catch (e) {
			console.warn('Anki Add Failed, falling back', e);
			setState('FALLBACK');
			setLog('Could not add directly to AnkiDroid.');
		}
	};

	const handleError = (msg: string) => {
		setErrorMsg(msg);
		setState('ERROR');
	};

	const handleFallbackShare = async () => {
		if (generatedCards.length === 0) return;

		// const subject = generatedCards[0].front;
		const text = generatedCards.map(c =>
			`Front: ${c.front}\nBack: ${c.back}\nTags: ${c.tags?.join(', ')}`
		).join('\n\n---\n\n');

		await Share.share({
			title: 'DomeKeep Flashcards',
			text: text,
			dialogTitle: 'Share Flashcards to AnkiDroid',
		});
	};

	return (
		<IonPage>
			<IonHeader>
				<IonToolbar>
					<IonTitle>DomeKeep Import</IonTitle>
				</IonToolbar>
			</IonHeader>
			<IonContent className="ion-padding">

				{/* Status Area */}
				<div style={{ marginBottom: 20 }}>
					<IonText color="medium">
						<p>{log}</p>
					</IonText>
					{(state === 'GENERATING_FACTS' || state === 'GENERATING_CARDS' || state === 'EXTRACTING' || state === 'ADDING_TO_ANKI') && (
						<IonProgressBar type="indeterminate" />
					)}
				</div>

				{/* URL Action */}
				{state === 'READY_TO_EXTRACT' && (
					<IonCard>
						<IonCardHeader>
							<IonCardTitle>Open Web Clipper</IonCardTitle>
						</IonCardHeader>
						<IonCardContent>
							<p>URL: {shareData?.content}</p>
							<IonButton expand="block" onClick={handleExtract} style={{ marginTop: 10 }}>
								Open & Extract
							</IonButton>
						</IonCardContent>
					</IonCard>
				)}

				{/* Error / Retry */}
				{state === 'ERROR' && (
					<IonCard color="danger">
						<IonCardContent>
							<p>{errorMsg}</p>
							<IonButton expand="block" fill="outline" color="light" onClick={() => init()}>Retry</IonButton>
						</IonCardContent>
					</IonCard>
				)}

				{/* Fallback */}
				{state === 'FALLBACK' && (
					<IonCard color="warning">
						<IonCardHeader>
							<IonCardTitle>Add to Anki Failed</IonCardTitle>
						</IonCardHeader>
						<IonCardContent>
							<p>We couldn't add the cards directly. Please share them to AnkiDroid manually.</p>
							<IonButton expand="block" onClick={handleFallbackShare}>Share Cards</IonButton>
						</IonCardContent>
					</IonCard>
				)}

				{/* Success */}
				{state === 'SUCCESS' && (
					<IonCard color="success">
						<IonCardContent>
							<h2>Success!</h2>
							<p>Added {generatedCards.length} cards to deck "DomeKeep".</p>
							<IonButton expand="block" fill="outline" color="light" onClick={() => (navigator as any).app.exitApp()}>Close</IonButton>
						</IonCardContent>
					</IonCard>
				)}

				{/* Preview Cards */}
				{generatedCards.length > 0 && (
					<div style={{ marginTop: 20 }}>
						<h3>Generated Cards</h3>
						<IonList>
							{generatedCards.map((card, i) => (
								<IonItem key={i}>
									<IonLabel className="ion-text-wrap">
										<h2>Q: {card.front}</h2>
										<p>A: {card.back}</p>
										{card.tags && card.tags.map(t => <IonChip key={t}>{t}</IonChip>)}
									</IonLabel>
								</IonItem>
							))}
						</IonList>
					</div>
				)}

			</IonContent>
		</IonPage>
	);
};

export default ImportScreen;
