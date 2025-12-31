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
	IonTextarea,
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
	documentOutline,
	flashOutline,
	addCircleOutline,
	checkmarkCircle,
	alertCircle,
	keyOutline,
	settingsOutline,
	trashOutline,
	createOutline,
	closeOutline,
	saveOutline,
} from 'ionicons/icons';
import Inbox from '../plugins/Inbox';
import type { InboxEntry, GeneratedCard } from '../plugins/Inbox';
import WebClipper from '../plugins/WebClipper';
import AnkiDroid from '../plugins/AnkiDroid';
import { generateFacts } from '../lib/gemini/generateFacts';
import { generateFlashcards } from '../lib/gemini/generateFlashcards';
import { scoreFacts, filterScoredFacts } from '../lib/gemini/scoreFacts';
import { hasValidConfig } from '../lib/settings/geminiConfig';
import { extractPdfText } from '../lib/pdf/extractPdfText';

type UIState =
	| 'LOADING'
	| 'NEEDS_CONFIG'
	| 'READY'
	| 'EXTRACTING'
	| 'GENERATING_FACTS'
	| 'SCORING_FACTS'
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
	
	// Card editing state
	const [editingCardIndex, setEditingCardIndex] = useState<number | null>(null);
	const [editedFront, setEditedFront] = useState('');
	const [editedBack, setEditedBack] = useState('');
	const [isSavingCard, setIsSavingCard] = useState(false);
	
	// Deck name editing state (for review phase)
	const [isEditingDeckName, setIsEditingDeckName] = useState(false);
	const [editedDeckName, setEditedDeckName] = useState('');
	const [isSavingDeckName, setIsSavingDeckName] = useState(false);

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
	 * Handle PDF text extraction via pdf.js
	 */
	const handlePdfExtract = async () => {
		if (!entry || entry.contentType !== 'pdf') return;

		try {
			setState('EXTRACTING');
			setLog('Extracting text from PDF...');

			// pdf.js loads the file directly via the Capacitor URL
			const extractedText = await extractPdfText(entry.content);

			// Check if any text was extracted
			if (!extractedText || extractedText.length < 10) {
				setErrorMsg(
					'Very little text was extracted. This PDF may contain mostly images (scanned document). OCR is not currently supported.'
				);
				setState('ERROR');
				return;
			}

			// Save to database
			await Inbox.updateExtractedContent({
				entryId: entry.id,
				title: entry.title || 'PDF Document',
				extractedText,
			});

			// Update local state
			setEntry({ ...entry, extractedText });
			setLog(`Extracted ${extractedText.length} characters from PDF`);
			setState('READY');
		} catch (e) {
			console.error('PDF extraction failed:', e);
			setErrorMsg(
				'PDF extraction failed. The file may be password-protected or corrupted.'
			);
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
			
			// Step 1: Extract facts
			setState('GENERATING_FACTS');
			setLog('Extracting facts with Gemini...');
			
			const factsResp = await generateFacts(textToProcess, title);
			setLog(`Extracted ${factsResp.facts.length} facts`);
			
			// Check if no facts were extracted
			if (factsResp.facts.length === 0) {
				setErrorMsg(
					'No key concepts could be extracted from this content. ' +
					'This may happen with very short text, technical content, or documents that are mostly images. ' +
					'Try a different source or check if the content is extractable.'
				);
				setState('ERROR');
				return;
			}
			
			// Step 2: Score facts for learning value
			setState('SCORING_FACTS');
			setLog(`Scoring ${factsResp.facts.length} facts for learning value...`);
			
			const scoredFacts = await scoreFacts(factsResp.facts);
			
			// Step 3: Filter to high-value facts
			const filteredFacts = filterScoredFacts(scoredFacts);
			setLog(`Selected ${filteredFacts.length} high-value facts from ${factsResp.facts.length} total`);
			
			// Check if no facts passed filtering
			if (filteredFacts.length === 0) {
				setErrorMsg(
					'No high-value facts were found in this content. ' +
					'The extracted concepts may be too generic or obvious. ' +
					'Try a different source with more specific, non-obvious information.'
				);
				setState('ERROR');
				return;
			}
			
			// Step 4: Generate flashcards from filtered facts
			setState('GENERATING_CARDS');
			setLog(`Generating flashcards from ${filteredFacts.length} facts...`);
			
			const cardsResp = await generateFlashcards(filteredFacts);
			
			// Check if no cards were generated
			if (cardsResp.cards.length === 0) {
				setErrorMsg(
					'No flashcards could be generated from the extracted concepts. ' +
					'This may happen if the content is too abstract or lacks specific facts. ' +
					'Try adjusting the source content or custom prompts in Settings.'
				);
				setState('ERROR');
				return;
			}
			
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

	// ==================== Card Editing Functions ====================

	/**
	 * Start editing a card
	 */
	const startEditCard = (index: number) => {
		const card = cards[index];
		setEditingCardIndex(index);
		setEditedFront(card.front);
		setEditedBack(card.back);
	};

	/**
	 * Save card edits to database
	 */
	const saveCardEdit = async () => {
		if (editingCardIndex === null) return;
		
		const card = cards[editingCardIndex];
		const trimmedFront = editedFront.trim();
		const trimmedBack = editedBack.trim();
		
		// Validate content is not empty
		if (!trimmedFront || !trimmedBack) {
			setLog('Card front and back cannot be empty');
			return;
		}
		
		setIsSavingCard(true);
		
		try {
			await Inbox.updateCardContent({
				cardId: card.id,
				front: trimmedFront,
				back: trimmedBack
			});
			
			// Update local state
			const updated = [...cards];
			updated[editingCardIndex] = {
				...updated[editingCardIndex],
				front: trimmedFront,
				back: trimmedBack
			};
			setCards(updated);
			setLog('Card updated successfully');
			
			// Exit edit mode
			setEditingCardIndex(null);
			setEditedFront('');
			setEditedBack('');
		} catch (e) {
			console.error('Failed to save card:', e);
			setLog('Failed to save card changes');
		} finally {
			setIsSavingCard(false);
		}
	};

	/**
	 * Cancel card edit without saving
	 */
	const cancelCardEdit = () => {
		setEditingCardIndex(null);
		setEditedFront('');
		setEditedBack('');
	};

	// ==================== Deck Name Editing Functions ====================

	/**
	 * Start editing deck name in review phase
	 */
	const startEditDeckName = () => {
		setIsEditingDeckName(true);
		setEditedDeckName(entry?.deckName || 'MasterFlasher');
	};

	/**
	 * Save deck name changes to database
	 */
	const saveDeckNameEdit = async () => {
		if (!entry) return;
		
		const trimmedName = editedDeckName.trim() || 'MasterFlasher';
		
		setIsSavingDeckName(true);
		
		try {
			await Inbox.updateDeckName({
				entryId: entry.id,
				deckName: trimmedName
			});
			
			// Update local state
			setEntry({ ...entry, deckName: trimmedName });
			setLog('Deck name updated');
			
			// Exit edit mode
			setIsEditingDeckName(false);
			setEditedDeckName('');
		} catch (e) {
			console.error('Failed to save deck name:', e);
			setLog('Failed to save deck name');
		} finally {
			setIsSavingDeckName(false);
		}
	};

	/**
	 * Cancel deck name edit without saving
	 */
	const cancelDeckNameEdit = () => {
		setIsEditingDeckName(false);
		setEditedDeckName('');
	};

	// ==================== Helper Functions ====================

	/**
	 * Check if URL needs extraction
	 */
	const needsExtraction = entry?.contentType === 'url' && !entry.extractedText;

	/**
	 * Check if PDF needs extraction
	 */
	const needsPdfExtraction = entry?.contentType === 'pdf' && !entry.extractedText;

	/**
	 * Check if content needs any extraction (URL or PDF)
	 */
	const needsAnyExtraction = needsExtraction || needsPdfExtraction;

	/**
	 * Get appropriate icon for content type
	 */
	const getContentIcon = () => {
		if (!entry) return documentTextOutline;
		switch (entry.contentType) {
			case 'url':
				return linkOutline;
			case 'pdf':
				return documentOutline;
			default:
				return documentTextOutline;
		}
	};

	/**
	 * Get appropriate title for content type
	 */
	const getContentTypeTitle = () => {
		if (!entry) return 'Content';
		switch (entry.contentType) {
			case 'url':
				return 'URL Content';
			case 'pdf':
				return 'PDF Content';
			default:
				return 'Text Content';
		}
	};

	return (
		<IonPage>
			<IonHeader>
				<IonToolbar>
					<IonButtons slot="start">
						<IonBackButton defaultHref="/inbox" />
					</IonButtons>
					<IonTitle>
						{entry?.title ||
							(entry?.contentType === 'url'
								? 'URL Entry'
								: entry?.contentType === 'pdf'
									? 'PDF Entry'
									: 'Text Entry')}
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
					{(state === 'LOADING' || state === 'EXTRACTING' || state === 'GENERATING_FACTS' || state === 'SCORING_FACTS' || state === 'GENERATING_CARDS') && (
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
									<IonIcon icon={getContentIcon()} style={{ marginRight: 8 }} />
									{getContentTypeTitle()}
								</IonCardTitle>
							</IonCardHeader>
							<IonCardContent>
								{/* Show URL for url type */}
								{entry.contentType === 'url' && (
									<p style={{ wordBreak: 'break-all', color: 'var(--ion-color-primary)' }}>
										{entry.content}
									</p>
								)}
								{/* Show filename for PDF type */}
								{entry.contentType === 'pdf' && entry.title && (
									<p style={{ fontWeight: 500, marginBottom: 8 }}>
										📄 {entry.title}
									</p>
								)}
								{/* Show extracted text if available */}
								{entry.extractedText ? (
									<p
										style={{
											maxHeight: 150,
											overflow: 'auto',
											background: 'var(--ion-color-light)',
											padding: 10,
											borderRadius: 8,
										}}
									>
										{entry.extractedText.slice(0, 500)}
										{entry.extractedText.length > 500 && '...'}
									</p>
								) : entry.contentType === 'text' ? (
									<p
										style={{
											maxHeight: 150,
											overflow: 'auto',
											background: 'var(--ion-color-light)',
											padding: 10,
											borderRadius: 8,
										}}
									>
										{entry.content.slice(0, 500)}
										{entry.content.length > 500 && '...'}
									</p>
								) : entry.contentType === 'pdf' ? (
									<IonText color="medium">
										<p style={{ fontSize: '0.9em', fontStyle: 'italic' }}>
											Text not yet extracted. Use the button below to extract text from this PDF.
										</p>
									</IonText>
								) : null}
							</IonCardContent>
						</IonCard>

						{/* URL Extraction Button */}
						{needsExtraction && (
							<IonCard>
								<IonCardContent>
									<IonButton expand="block" onClick={handleExtract}>
										<IonIcon slot="start" icon={documentTextOutline} />
										Extract Content from URL
									</IonButton>
								</IonCardContent>
							</IonCard>
						)}

						{/* PDF Extraction Button */}
						{needsPdfExtraction && (
							<IonCard>
								<IonCardContent>
									<IonButton expand="block" onClick={handlePdfExtract}>
										<IonIcon slot="start" icon={documentTextOutline} />
										Extract Text from PDF
									</IonButton>
									<IonText color="medium">
										<p style={{ fontSize: '0.85em', marginTop: 8 }}>
											Extracts text content from the PDF. Note: Scanned/image PDFs may not extract
											properly.
										</p>
									</IonText>
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
									disabled={needsAnyExtraction}
									style={{ marginTop: 16 }}
								>
									<IonIcon slot="start" icon={flashOutline} />
									Generate Cards
								</IonButton>
								{needsAnyExtraction && (
									<IonText color="medium">
										<p style={{ fontSize: '0.85em', marginTop: 8 }}>
											{needsExtraction
												? 'Extract content from the URL first.'
												: 'Extract text from the PDF first.'}
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
								
								{/* Editable Deck Name */}
								<div style={{ marginTop: 12, marginBottom: 12 }}>
									{isEditingDeckName ? (
										<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
											<IonInput
												value={editedDeckName}
												onIonInput={(e) => setEditedDeckName(e.detail.value ?? '')}
												placeholder="Deck name"
												style={{
													flex: 1,
													border: '1px solid var(--ion-color-medium)',
													borderRadius: 8,
													padding: '0 8px'
												}}
											/>
											<IonButton
												size="small"
												color="success"
												onClick={saveDeckNameEdit}
												disabled={isSavingDeckName}
											>
												{isSavingDeckName ? (
													<IonSpinner name="crescent" style={{ width: 16, height: 16 }} />
												) : (
													<IonIcon icon={saveOutline} />
												)}
											</IonButton>
											<IonButton
												size="small"
												color="medium"
												fill="outline"
												onClick={cancelDeckNameEdit}
												disabled={isSavingDeckName}
											>
												<IonIcon icon={closeOutline} />
											</IonButton>
										</div>
									) : (
										<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
											<IonChip color="primary">
												Deck: {entry?.deckName || 'MasterFlasher'}
											</IonChip>
											<IonButton
												size="small"
												fill="clear"
												onClick={startEditDeckName}
											>
												<IonIcon icon={createOutline} />
											</IonButton>
										</div>
									)}
								</div>

								<IonButton
									expand="block"
									onClick={addAllCards}
									disabled={isAddingAll || cards.every(c => c.status === 'added') || editingCardIndex !== null}
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

						{/* Card List */}
						{cards.map((card, i) => (
							<IonCard key={card.id} style={{ marginBottom: 12 }}>
								{editingCardIndex === i ? (
									/* Edit Mode */
									<IonCardContent>
										<IonText color="primary">
											<h3 style={{ marginTop: 0, marginBottom: 8 }}>Editing Card {i + 1}</h3>
										</IonText>
										
										<IonLabel position="stacked" style={{ marginBottom: 4 }}>Question</IonLabel>
										<IonTextarea
											value={editedFront}
											onIonInput={(e) => setEditedFront(e.detail.value ?? '')}
											placeholder="Enter the question..."
											autoGrow
											rows={2}
											style={{
												border: '1px solid var(--ion-color-medium)',
												borderRadius: 8,
												padding: 8,
												marginBottom: 12,
												'--background': 'var(--ion-color-light)'
											}}
										/>
										
										<IonLabel position="stacked" style={{ marginBottom: 4 }}>Answer</IonLabel>
										<IonTextarea
											value={editedBack}
											onIonInput={(e) => setEditedBack(e.detail.value ?? '')}
											placeholder="Enter the answer..."
											autoGrow
											rows={2}
											style={{
												border: '1px solid var(--ion-color-medium)',
												borderRadius: 8,
												padding: 8,
												marginBottom: 12,
												'--background': 'var(--ion-color-light)'
											}}
										/>
										
										{card.tags && card.tags.length > 0 && (
											<div style={{ marginBottom: 12 }}>
												{card.tags.map(t => <IonChip key={t} style={{ fontSize: 10 }}>{t}</IonChip>)}
											</div>
										)}
										
										<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
											<IonButton
												fill="outline"
												color="medium"
												onClick={cancelCardEdit}
												disabled={isSavingCard}
											>
												<IonIcon slot="start" icon={closeOutline} />
												Cancel
											</IonButton>
											<IonButton
												color="success"
												onClick={saveCardEdit}
												disabled={isSavingCard}
											>
												{isSavingCard ? (
													<IonSpinner name="crescent" style={{ width: 20, height: 20 }} />
												) : (
													<>
														<IonIcon slot="start" icon={saveOutline} />
														Save
													</>
												)}
											</IonButton>
										</div>
									</IonCardContent>
								) : (
									/* View Mode */
									<IonCardContent>
										<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
											<div style={{ flex: 1 }}>
												<h3 style={{ margin: '0 0 4px 0', fontWeight: 600 }}>Q: {card.front}</h3>
												<p style={{ margin: '0 0 8px 0', color: 'var(--ion-color-medium)' }}>A: {card.back}</p>
												{card.tags && card.tags.length > 0 && (
													<div>
														{card.tags.map(t => <IonChip key={t} style={{ fontSize: 10 }}>{t}</IonChip>)}
													</div>
												)}
											</div>
											
											<div style={{ display: 'flex', gap: 4, marginLeft: 8, flexShrink: 0 }}>
												{/* Edit Button - only for pending cards */}
												{card.uiStatus !== 'added' && card.uiStatus !== 'adding' && (
													<IonButton
														size="small"
														fill="clear"
														onClick={() => startEditCard(i)}
														disabled={editingCardIndex !== null || isAddingAll}
													>
														<IonIcon icon={createOutline} />
													</IonButton>
												)}
												
												{/* Add/Status Button */}
												<IonButton
													size="small"
													fill={card.uiStatus === 'added' ? 'clear' : 'solid'}
													color={
														card.uiStatus === 'error' ? 'danger' :
														card.uiStatus === 'added' ? 'success' :
														'primary'
													}
													disabled={card.uiStatus === 'adding' || card.uiStatus === 'added' || editingCardIndex !== null || isAddingAll}
													onClick={() => addSingleCard(i)}
												>
													{card.uiStatus === 'adding' && <IonSpinner name="crescent" style={{ width: 18, height: 18 }} />}
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
											</div>
										</div>
									</IonCardContent>
								)}
							</IonCard>
						))}
					</div>
				)}
			</IonContent>
		</IonPage>
	);
};

export default EntryDetailScreen;
