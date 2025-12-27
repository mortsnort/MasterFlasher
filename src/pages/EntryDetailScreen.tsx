import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import {
	IonPage,
	IonContent,
	IonHeader,
	IonToolbar,
	IonTitle,
	IonButtons,
	IonBackButton,
	IonButton,
	IonCard,
	IonCardHeader,
	IonCardTitle,
	IonCardContent,
	IonList,
	IonItem,
	IonLabel,
	IonInput,
	IonIcon,
	IonText,
	IonProgressBar,
	IonChip,
	IonSpinner,
	IonAlert,
} from '@ionic/react';
import {
	linkOutline,
	documentTextOutline,
	flashOutline,
	addCircleOutline,
	checkmarkCircle,
	alertCircle,
	keyOutline,
	settingsOutline,
	trashOutline,
} from 'ionicons/icons';
import Inbox from '../plugins/Inbox';
import type { InboxEntry, GeneratedCard } from '../plugins/Inbox';
import WebClipper from '../plugins/WebClipper';
import AnkiDroid from '../plugins/AnkiDroid';
import { generateFacts } from '../lib/gemini/generateFacts';
import { generateFlashcards } from '../lib/gemini/generateFlashcards';
import { hasValidConfig } from '../lib/settings/geminiConfig';

type UIState =
	| 'LOADING'
	| 'NEEDS_CONFIG'
	| 'READY'
	| 'EXTRACTING'
	| 'GENERATING_FACTS'
	| 'GENERATING_CARDS'
	| 'REVIEW_CARDS'
	| 'ERROR';

// Local type for UI state management
type ReviewCard = GeneratedCard & {
	uiStatus: 'idle' | 'adding' | 'added' | 'error';
};

const EntryDetailScreen: React.FC = () => {
	const { id } = useParams<{ id: string }>();
	const history = useHistory();
	
	const [state, setState] = useState<UIState>('LOADING');
	const [entry, setEntry] = useState<InboxEntry | null>(null);
	const [cards, setCards] = useState<ReviewCard[]>([]);
	const [deckName, setDeckName] = useState('MasterFlasher');
	const [log, setLog] = useState('Loading...');
	const [errorMsg, setErrorMsg] = useState('');
	const [showDeleteAlert, setShowDeleteAlert] = useState(false);
	const [isAddingAll, setIsAddingAll] = useState(false);

	/**
	 * Load entry and its cards from database
	 */
	const loadEntry = useCallback(async () => {
		try {
			setState('LOADING');
			
			// Check API config first
			const hasConfig = await hasValidConfig();
			if (!hasConfig) {
				setState('NEEDS_CONFIG');
				setLog('API key not configured');
				return;
			}
			
			const result = await Inbox.getEntry({ id });
			setEntry(result.entry);
			setDeckName(result.entry.deckName || 'MasterFlasher');
			
			if (result.entry.isLocked && result.cards.length > 0) {
				// Entry already has cards generated
				const reviewCards: ReviewCard[] = result.cards.map(c => ({
					...c,
					uiStatus: c.status === 'added' ? 'added' : 'idle'
				}));
				setCards(reviewCards);
				setState('REVIEW_CARDS');
				setLog(`${result.cards.length} cards ready for review`);
			} else {
				// Entry needs processing
				setState('READY');
				setLog('Ready to generate cards');
			}
		} catch (e) {
			console.error('Failed to load entry:', e);
			setErrorMsg('Failed to load entry');
			setState('ERROR');
		}
	}, [id]);

	useEffect(() => {
		loadEntry();
	}, [loadEntry]);

	/**
	 * Navigate to settings
	 */
	const navigateToSettings = () => {
		history.push('/settings');
	};

	/**
	 * Delete the current entry and navigate back
	 */
	const handleDeleteEntry = async () => {
		if (!entry) return;
		
		try {
			await Inbox.deleteEntry({ id: entry.id });
			history.replace('/inbox');
		} catch (e) {
			console.error('Failed to delete entry:', e);
			setErrorMsg('Failed to delete entry');
			setState('ERROR');
		}
	};

	/**
	 * Handle URL extraction via WebClipper
	 */
	const handleExtract = async () => {
		if (!entry || entry.contentType !== 'url') return;
		
		try {
			setState('EXTRACTING');
			setLog('Opening Web Clipper...');
			
			const result = await WebClipper.open({ url: entry.content });
			
			// Save extracted content to database
			await Inbox.updateExtractedContent({
				entryId: entry.id,
				title: result.title,
				extractedText: result.text
			});
			
			// Update local state
			setEntry({
				...entry,
				title: result.title,
				extractedText: result.text
			});
			
			setLog(`Extracted: ${result.title || 'No Title'} (${result.text.length} chars)`);
			setState('READY');
		} catch (e) {
			console.error('Extraction failed:', e);
			setErrorMsg('Extraction failed or cancelled');
			setState('ERROR');
		}
	};

	/**
	 * Generate flashcards from content
	 */
	const handleGenerate = async () => {
		if (!entry) return;
		
		// Determine which text to use
		const textToProcess = entry.extractedText || entry.content;
		const title = entry.title || undefined;
		
		// Use default deck name if empty
		const finalDeckName = deckName.trim() || 'MasterFlasher';
		
		try {
			// Save deck name first
			await Inbox.updateDeckName({ entryId: entry.id, deckName: finalDeckName });
			
			setState('GENERATING_FACTS');
			setLog('Generating facts with Gemini...');
			
			const factsResp = await generateFacts(textToProcess, title);
			setLog(`Generated ${factsResp.facts.length} facts`);
			
			setState('GENERATING_CARDS');
			setLog('Generating flashcards...');
			
			const cardsResp = await generateFlashcards(factsResp.facts);
			
			// Create card objects with IDs
			const newCards: Omit<GeneratedCard, 'entryId'>[] = cardsResp.cards.map((c, i) => ({
				id: `${entry.id}-card-${i}-${Date.now()}`,
				front: c.front,
				back: c.back,
				tags: c.tags || [],
				status: 'pending' as const
			}));
			
			// Save cards to database
			await Inbox.saveCards({ entryId: entry.id, cards: newCards });
			
			// Lock the entry
			await Inbox.lockEntry({ entryId: entry.id });
			
			// Update local state
			const reviewCards: ReviewCard[] = newCards.map(c => ({
				...c,
				entryId: entry.id,
				uiStatus: 'idle'
			}));
			setCards(reviewCards);
			setEntry({ ...entry, isLocked: true, deckName: finalDeckName });
			
			setLog(`Generated ${cardsResp.cards.length} cards. Ready for review.`);
			setState('REVIEW_CARDS');
		} catch (e) {
			console.error('Generation failed:', e);
			setErrorMsg('Processing failed: ' + (e instanceof Error ? e.message : String(e)));
			setState('ERROR');
		}
	};

	/**
	 * Add a single card to AnkiDroid
	 */
	const addSingleCard = async (index: number) => {
		const card = cards[index];
		if (card.uiStatus === 'added' || card.uiStatus === 'adding') return;
		
		// Optimistic update
		const newCards = [...cards];
		newCards[index].uiStatus = 'adding';
		setCards(newCards);
		
		try {
			const available = await AnkiDroid.isAvailable();
			if (!available.value) throw new Error('AnkiDroid not available');
			
			const perm = await AnkiDroid.hasPermission();
			if (!perm.value) {
				const req = await AnkiDroid.requestPermission();
				if (!req.value) throw new Error('Permission denied');
			}
			
			const result = await AnkiDroid.addBasicCard({
				deckName: entry?.deckName || 'MasterFlasher',
				modelKey: 'com.snortstudios.masterflasher',
				front: card.front,
				back: card.back,
				tags: card.tags || [],
			});
			
			// Update database
			await Inbox.updateCardStatus({
				cardId: card.id,
				status: 'added',
				noteId: result.noteId
			});
			
			// Update local state
			const successCards = [...cards];
			successCards[index].uiStatus = 'added';
			successCards[index].status = 'added';
			setCards(successCards);
			
			// Check if all cards are added
			const allAdded = successCards.every(c => c.status === 'added');
			if (allAdded && entry) {
				const autoRemoveResult = await Inbox.checkAutoRemove({ entryId: entry.id });
				if (autoRemoveResult.removed) {
					// Navigate back to inbox
					history.replace('/inbox');
				}
			}
		} catch (e) {
			console.error('Failed to add card:', e);
			const failCards = [...cards];
			failCards[index].uiStatus = 'error';
			setCards(failCards);
		}
	};

	/**
		* Add all pending cards to AnkiDroid
		*/
	const addAllCards = async () => {
		// Get indices of pending cards
		const pendingIndices = cards
			.map((card, index) => ({ card, index }))
			.filter(({ card }) => card.uiStatus === 'idle')
			.map(({ index }) => index);
		
		if (pendingIndices.length === 0) return;
		
		setIsAddingAll(true);
		
		try {
			// Check AnkiDroid availability once
			const available = await AnkiDroid.isAvailable();
			if (!available.value) throw new Error('AnkiDroid not available');
			
			const perm = await AnkiDroid.hasPermission();
			if (!perm.value) {
				const req = await AnkiDroid.requestPermission();
				if (!req.value) throw new Error('Permission denied');
			}
			
			// Add each pending card
			let addedCount = 0;
			for (const index of pendingIndices) {
				const card = cards[index];
				
				// Update UI to show adding
				setCards(prev => {
					const updated = [...prev];
					updated[index] = { ...updated[index], uiStatus: 'adding' };
					return updated;
				});
				setLog(`Adding card ${addedCount + 1} of ${pendingIndices.length}...`);
				
				try {
					const result = await AnkiDroid.addBasicCard({
						deckName: entry?.deckName || 'MasterFlasher',
						modelKey: 'com.snortstudios.masterflasher',
						front: card.front,
						back: card.back,
						tags: card.tags || [],
					});
					
					// Update database
					await Inbox.updateCardStatus({
						cardId: card.id,
						status: 'added',
						noteId: result.noteId
					});
					
					// Update local state
					setCards(prev => {
						const updated = [...prev];
						updated[index] = { ...updated[index], uiStatus: 'added', status: 'added' };
						return updated;
					});
					addedCount++;
				} catch (cardError) {
					console.error(`Failed to add card ${index}:`, cardError);
					setCards(prev => {
						const updated = [...prev];
						updated[index] = { ...updated[index], uiStatus: 'error' };
						return updated;
					});
				}
			}
			
			setLog(`Added ${addedCount} of ${pendingIndices.length} cards`);
			
			// Check if all cards are now added
			const currentCards = cards.map((c, i) =>
				pendingIndices.includes(i) && c.uiStatus !== 'error'
					? { ...c, status: 'added' as const }
					: c
			);
			const allAdded = currentCards.every(c => c.status === 'added');
			
			if (allAdded && entry) {
				const autoRemoveResult = await Inbox.checkAutoRemove({ entryId: entry.id });
				if (autoRemoveResult.removed) {
					history.replace('/inbox');
				}
			}
		} catch (e) {
			console.error('Failed to add all cards:', e);
			setLog('Failed to add cards: ' + (e instanceof Error ? e.message : String(e)));
		} finally {
			setIsAddingAll(false);
		}
	};

	/**
		* Check if URL needs extraction
		*/
	const needsExtraction = entry?.contentType === 'url' && !entry.extractedText;

	return (
		<IonPage>
			<IonHeader>
				<IonToolbar>
					<IonButtons slot="start">
						<IonBackButton defaultHref="/inbox" />
					</IonButtons>
					<IonTitle>
						{entry?.title || (entry?.contentType === 'url' ? 'URL Entry' : 'Text Entry')}
					</IonTitle>
					<IonButtons slot="end">
						<IonButton
							color="danger"
							onClick={() => setShowDeleteAlert(true)}
							disabled={state === 'LOADING'}
						>
							<IonIcon slot="icon-only" icon={trashOutline} />
						</IonButton>
					</IonButtons>
				</IonToolbar>
			</IonHeader>
			<IonContent className="ion-padding">
				{/* Delete Confirmation Alert */}
				<IonAlert
					isOpen={showDeleteAlert}
					onDidDismiss={() => setShowDeleteAlert(false)}
					header="Delete Entry?"
					message="This will permanently delete this entry and any generated cards. This action cannot be undone."
					buttons={[
						{
							text: 'Cancel',
							role: 'cancel',
						},
						{
							text: 'Delete',
							role: 'destructive',
							handler: handleDeleteEntry,
						},
					]}
				/>

				{/* Status/Log Area */}
				<div style={{ marginBottom: 20 }}>
					<IonText color="medium">
						<p>{log}</p>
					</IonText>
					{(state === 'LOADING' || state === 'EXTRACTING' || state === 'GENERATING_FACTS' || state === 'GENERATING_CARDS') && (
						<IonProgressBar type="indeterminate" />
					)}
				</div>

				{/* Loading State */}
				{state === 'LOADING' && (
					<div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
						<IonSpinner />
					</div>
				)}

				{/* API Key Required */}
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
						</IonCardContent>
					</IonCard>
				)}

				{/* Error State */}
				{state === 'ERROR' && (
					<IonCard color="danger">
						<IonCardContent>
							<p>{errorMsg}</p>
							<IonButton expand="block" fill="outline" color="light" onClick={loadEntry}>
								Retry
							</IonButton>
						</IonCardContent>
					</IonCard>
				)}

				{/* Ready State - Content Preview & Actions */}
				{state === 'READY' && entry && (
					<>
						{/* Content Preview Card */}
						<IonCard>
							<IonCardHeader>
								<IonCardTitle>
									<IonIcon 
										icon={entry.contentType === 'url' ? linkOutline : documentTextOutline} 
										style={{ marginRight: 8 }}
									/>
									{entry.contentType === 'url' ? 'URL Content' : 'Text Content'}
								</IonCardTitle>
							</IonCardHeader>
							<IonCardContent>
								{entry.contentType === 'url' && (
									<p style={{ wordBreak: 'break-all', color: 'var(--ion-color-primary)' }}>
										{entry.content}
									</p>
								)}
								{entry.extractedText ? (
									<p style={{ 
										maxHeight: 150, 
										overflow: 'auto',
										background: 'var(--ion-color-light)',
										padding: 10,
										borderRadius: 8
									}}>
										{entry.extractedText.slice(0, 500)}
										{entry.extractedText.length > 500 && '...'}
									</p>
								) : entry.contentType === 'text' && (
									<p style={{ 
										maxHeight: 150, 
										overflow: 'auto',
										background: 'var(--ion-color-light)',
										padding: 10,
										borderRadius: 8
									}}>
										{entry.content.slice(0, 500)}
										{entry.content.length > 500 && '...'}
									</p>
								)}
							</IonCardContent>
						</IonCard>

						{/* URL Extraction Button */}
						{needsExtraction && (
							<IonCard>
								<IonCardContent>
									<IonButton expand="block" onClick={handleExtract}>
										Extract Content from URL
									</IonButton>
								</IonCardContent>
							</IonCard>
						)}

						{/* Deck Name & Generate Card */}
						<IonCard>
							<IonCardHeader>
								<IonCardTitle>
									<IonIcon icon={flashOutline} style={{ marginRight: 8 }} />
									Generate Flashcards
								</IonCardTitle>
							</IonCardHeader>
							<IonCardContent>
								<IonList>
									<IonItem>
										<IonLabel position="stacked">Deck Name</IonLabel>
										<IonInput
											value={deckName}
											onIonInput={(e) => setDeckName(e.detail.value ?? '')}
											placeholder="MasterFlasher"
										/>
									</IonItem>
								</IonList>
								<IonButton 
									expand="block" 
									onClick={handleGenerate}
									disabled={needsExtraction}
									style={{ marginTop: 16 }}
								>
									<IonIcon slot="start" icon={flashOutline} />
									Generate Cards
								</IonButton>
								{needsExtraction && (
									<IonText color="medium">
										<p style={{ fontSize: '0.85em', marginTop: 8 }}>
											Extract content from the URL first.
										</p>
									</IonText>
								)}
							</IonCardContent>
						</IonCard>
					</>
				)}

				{/* Review Cards State */}
				{state === 'REVIEW_CARDS' && cards.length > 0 && (
					<div>
						<IonCard>
							<IonCardHeader>
								<IonCardTitle>Review Cards</IonCardTitle>
							</IonCardHeader>
							<IonCardContent>
								<p>
									{cards.filter(c => c.status === 'added').length} / {cards.length} cards added
								</p>
								{entry?.deckName && (
									<IonChip color="primary">
										Deck: {entry.deckName}
									</IonChip>
								)}
								<IonButton
									expand="block"
									onClick={addAllCards}
									disabled={isAddingAll || cards.every(c => c.status === 'added')}
									style={{ marginTop: 16 }}
								>
									{isAddingAll ? (
										<>
											<IonSpinner name="crescent" style={{ width: 20, height: 20, marginRight: 8 }} />
											Adding...
										</>
									) : (
										<>
											<IonIcon slot="start" icon={addCircleOutline} />
											Add All to Anki
										</>
									)}
								</IonButton>
							</IonCardContent>
						</IonCard>

						<IonList>
							{cards.map((card, i) => (
								<IonItem key={card.id}>
									<IonLabel className="ion-text-wrap">
										<h2>Q: {card.front}</h2>
										<p>A: {card.back}</p>
										{card.tags && card.tags.length > 0 && (
											<div style={{ marginTop: 4 }}>
												{card.tags.map(t => <IonChip key={t} style={{ fontSize: 10 }}>{t}</IonChip>)}
											</div>
										)}
									</IonLabel>
									<IonButton
										slot="end"
										fill={card.uiStatus === 'added' ? 'clear' : 'solid'}
										color={
											card.uiStatus === 'error' ? 'danger' : 
											card.uiStatus === 'added' ? 'success' : 
											'primary'
										}
										disabled={card.uiStatus === 'adding' || card.uiStatus === 'added'}
										onClick={() => addSingleCard(i)}
									>
										{card.uiStatus === 'adding' && <IonSpinner name="crescent" style={{ width: 20, height: 20 }} />}
										{card.uiStatus === 'added' && <IonIcon icon={checkmarkCircle} />}
										{card.uiStatus === 'error' && <IonIcon icon={alertCircle} />}
										{card.uiStatus === 'idle' && <IonIcon icon={addCircleOutline} />}
										<span style={{ marginLeft: 4 }}>
											{card.uiStatus === 'adding' ? '' : 
											 card.uiStatus === 'added' ? 'Added' : 
											 card.uiStatus === 'error' ? 'Retry' : 
											 'Add'}
										</span>
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

export default EntryDetailScreen;
