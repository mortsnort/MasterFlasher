import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
	IonPage,
	IonContent,
	IonHeader,
	IonToolbar,
	IonTitle,
	IonButtons,
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
	IonIcon,
} from '@ionic/react';
import { settingsOutline, keyOutline } from 'ionicons/icons';
import ShareReceiver from '../plugins/ShareReceiver';
import { parseIncomingShare } from '../lib/share/parseIncoming';
import type { IncomingShare } from '../lib/share/parseIncoming';
import { generateFacts } from '../lib/gemini/generateFacts';
import { generateFlashcards } from '../lib/gemini/generateFlashcards';
import { hasValidConfig } from '../lib/settings/geminiConfig';
import WebClipper from '../plugins/WebClipper';
import AnkiDroid from '../plugins/AnkiDroid';
import type { Flashcard } from '../lib/anki/types';

type UIState =
	| 'IDLE'
	| 'ANALYZING'
	| 'NEEDS_CONFIG' // New state for missing API key
	| 'READY_TO_EXTRACT' // For URL flow
	| 'EXTRACTING'
	| 'GENERATING_FACTS'
	| 'GENERATING_CARDS'
	| 'ADDING_TO_ANKI'
	| 'SUCCESS'
	| 'FALLBACK'
	| 'ERROR';

// Local type for UI state management
type ReviewCard = Flashcard & {
	status: 'idle' | 'adding' | 'added' | 'error';
};

const ImportScreen: React.FC = () => {
	const history = useHistory();
	const [state, setState] = useState<UIState | 'REVIEW_CARDS'>('IDLE');
	const [shareData, setShareData] = useState<IncomingShare | null>(null);
	const [log, setLog] = useState<string>('Waiting for share...');
	const [generatedCards, setGeneratedCards] = useState<ReviewCard[]>([]);
	const [errorMsg, setErrorMsg] = useState<string>('');

	useEffect(() => {
		init();

		const listener = (ShareReceiver as any).addListener('shareReceived', async (data: any) => {
			console.log('Share received while running:', data);
			if (data.value && data.mode) {
				// Check config before processing
				const hasConfig = await hasValidConfig();
				if (!hasConfig) {
					setShareData({ mode: data.mode, content: data.value });
					setLog('API key not configured. Please set up your Gemini API key first.');
					setState('NEEDS_CONFIG');
					return;
				}
				
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
		
		// Check if API key is configured
		const hasConfig = await hasValidConfig();
		
		const share = await parseIncomingShare();
		if (share) {
			setShareData(share);
			
			// If no config, prompt user to set it up
			if (!hasConfig) {
				setLog('API key not configured. Please set up your Gemini API key first.');
				setState('NEEDS_CONFIG');
				return;
			}
			
			setLog(`Received ${share.mode}: ${share.content.slice(0, 50)}...`);
			if (share.mode === 'url') {
				setState('READY_TO_EXTRACT');
			} else {
				startProcessing(share.content, 'Shared Text');
			}
		} else {
			// No share data - check if config exists
			if (!hasConfig) {
				setLog('Welcome! Please configure your Gemini API key to get started.');
				setState('NEEDS_CONFIG');
			} else {
				setLog('No share data found. Share content from another app to create flashcards.');
				setState('IDLE');
			}
		}
	};

	const navigateToSettings = () => {
		history.push('/settings');
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

			// Map to ReviewCard
			const reviewCards: ReviewCard[] = cardsResp.cards.map(c => ({
				...c,
				status: 'idle'
			}));
			setGeneratedCards(reviewCards);
			setLog(`Generated ${cardsResp.cards.length} cards. Ready for review.`);

			// AUTO-ADD REMOVED. Now we go to review state.
			setState('REVIEW_CARDS');
		} catch (e) {
			console.error(e);
			handleError('Processing failed: ' + (e instanceof Error ? e.message : String(e)));
		}
	};

	const addSingleCard = async (index: number) => {
		const card = generatedCards[index];
		if (card.status === 'added' || card.status === 'adding') return;

		// Optimistic update
		const newCards = [...generatedCards];
		newCards[index].status = 'adding';
		setGeneratedCards(newCards);

		try {
			const available = await AnkiDroid.isAvailable();
			if (!available.value) throw new Error('AnkiDroid not available');

			const perm = await AnkiDroid.hasPermission();
			if (!perm.value) {
				const req = await AnkiDroid.requestPermission();
				if (!req.value) throw new Error('Permission denied');
			}

			await AnkiDroid.addBasicCard({
				deckName: 'MasterFlasher',
				modelKey: 'com.snortstudios.masterflasher',
				front: card.front,
				back: card.back,
				tags: card.tags || [],
			});

			const successCards = [...generatedCards];
			successCards[index].status = 'added';
			setGeneratedCards(successCards);

		} catch (e) {
			console.error(e);
			const failCards = [...generatedCards];
			failCards[index].status = 'error';
			setGeneratedCards(failCards);
			// Optionally show toast or error
		}
	};

	const handleError = (msg: string) => {
		setErrorMsg(msg);
		setState('ERROR');
	};


	return (
		<IonPage>
			<IonHeader>
				<IonToolbar>
					<IonTitle>MasterFlasher Import</IonTitle>
					<IonButtons slot="end">
						<IonButton onClick={navigateToSettings}>
							<IonIcon slot="icon-only" icon={settingsOutline} />
						</IonButton>
					</IonButtons>
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

				{/* API Key Configuration Required */}
				{state === 'NEEDS_CONFIG' && (
					<IonCard>
						<IonCardHeader>
							<IonCardTitle>
								<IonIcon icon={keyOutline} style={{ marginRight: 8, verticalAlign: 'middle' }} />
								API Key Required
							</IonCardTitle>
						</IonCardHeader>
						<IonCardContent>
							<p>
								To generate flashcards, you need to configure your Gemini API key.
								You can get a free API key from{' '}
								<a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">
									Google AI Studio
								</a>.
							</p>
							<IonButton expand="block" onClick={navigateToSettings} style={{ marginTop: 16 }}>
								<IonIcon slot="start" icon={settingsOutline} />
								Configure API Key
							</IonButton>
							{shareData && (
								<IonText color="medium">
									<p style={{ marginTop: 12, fontSize: '0.9em' }}>
										Your shared content will be processed after configuration.
									</p>
								</IonText>
							)}
						</IonCardContent>
					</IonCard>
				)}

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

				{/* Review / Success List */}
				{(state === 'REVIEW_CARDS' || state === 'SUCCESS') && generatedCards.length > 0 && (
					<div style={{ marginTop: 20 }}>
						<h3>Review Cards</h3>
						<p>Total: {generatedCards.length}</p>
						<IonList>
							{generatedCards.map((card, i) => (
								<IonItem key={i}>
									<IonLabel className="ion-text-wrap">
										<h2>Q: {card.front}</h2>
										<p>A: {card.back}</p>
										{card.tags && card.tags.map(t => <IonChip key={t}>{t}</IonChip>)}
									</IonLabel>
									<IonButton
										slot="end"
										fill={card.status === 'added' ? 'clear' : 'solid'}
										color={card.status === 'error' ? 'danger' : (card.status === 'added' ? 'success' : 'primary')}
										disabled={card.status === 'adding' || card.status === 'added'}
										onClick={() => addSingleCard(i)}
									>
										{card.status === 'adding' ? '...' : (card.status === 'added' ? 'Added' : (card.status === 'error' ? 'Retry' : 'Add'))}
									</IonButton>
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
