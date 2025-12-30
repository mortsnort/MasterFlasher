import React, { useState, useCallback, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import {
	IonPage,
	IonContent,
	IonHeader,
	IonToolbar,
	IonTitle,
	IonButtons,
	IonButton,
	IonList,
	IonItem,
	IonLabel,
	IonIcon,
	IonText,
	IonRefresher,
	IonRefresherContent,
	IonItemSliding,
	IonItemOptions,
	IonItemOption,
	IonChip,
	IonSpinner,
	IonFab,
	IonFabButton,
	IonModal,
	IonTextarea,
	useIonViewWillEnter,
	useIonToast,
} from '@ionic/react';
import type { RefresherEventDetail } from '@ionic/react';
import { App } from '@capacitor/app';
import {
	settingsOutline,
	linkOutline,
	documentTextOutline,
	documentOutline,
	trashOutline,
	lockClosedOutline,
	timeOutline,
	micOutline,
	stopOutline,
	closeOutline,
	checkmarkOutline,
} from 'ionicons/icons';
import Inbox from '../plugins/Inbox';
import type { InboxEntry } from '../plugins/Inbox';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

/**
 * Format timestamp to relative time string
 */
function formatRelativeTime(timestamp: number): string {
	const now = Date.now();
	const diff = now - timestamp;
	
	const seconds = Math.floor(diff / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);
	
	if (days > 0) {
		return days === 1 ? '1 day ago' : `${days} days ago`;
	}
	if (hours > 0) {
		return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
	}
	if (minutes > 0) {
		return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
	}
	return 'Just now';
}

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		const r = Math.random() * 16 | 0;
		const v = c === 'x' ? r : (r & 0x3 | 0x8);
		return v.toString(16);
	});
}

const InboxScreen: React.FC = () => {
	const history = useHistory();
	const [entries, setEntries] = useState<InboxEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	
	// Speech recognition state
	const [showSpeechModal, setShowSpeechModal] = useState(false);
	const [editableTranscript, setEditableTranscript] = useState('');
	const [isSaving, setIsSaving] = useState(false);
	
	const {
		isAvailable,
		isListening,
		transcript,
		error: speechError,
		permissionStatus,
		isInitializing,
		startListening,
		stopListening,
		reset: resetSpeech,
	} = useSpeechRecognition();
	
	const [presentToast] = useIonToast();

	/**
	 * Load all inbox entries from the database
	 */
	const loadEntries = useCallback(async () => {
		try {
			setError(null);
			const result = await Inbox.getAllEntries();
			setEntries(result.entries);
		} catch (e) {
			console.error('Failed to load entries:', e);
			setError('Failed to load inbox entries');
		} finally {
			setLoading(false);
		}
	}, []);

	// Load entries when the view is about to enter (handles navigation back)
	useIonViewWillEnter(() => {
		loadEntries();
	});

	// Listen for app state changes to refresh when coming to foreground
	useEffect(() => {
		const listener = App.addListener('appStateChange', ({ isActive }) => {
			if (isActive) {
				// App came to foreground - refresh the inbox
				console.log('App resumed, refreshing inbox...');
				loadEntries();
			}
		});

		return () => {
			listener.then(handle => handle.remove());
		};
	}, [loadEntries]);
	
	// Update editable transcript when speech recognition updates
	useEffect(() => {
		if (transcript) {
			setEditableTranscript(transcript);
		}
	}, [transcript]);

	/**
	 * Handle pull-to-refresh
	 */
	const handleRefresh = async (event: CustomEvent<RefresherEventDetail>) => {
		await loadEntries();
		event.detail.complete();
	};

	/**
	 * Navigate to entry detail screen
	 */
	const openEntry = (entry: InboxEntry) => {
		history.push(`/entry/${entry.id}`);
	};

	/**
	 * Delete an entry
	 */
	const deleteEntry = async (entry: InboxEntry) => {
		try {
			await Inbox.deleteEntry({ id: entry.id });
			// Remove from local state
			setEntries(prev => prev.filter(e => e.id !== entry.id));
		} catch (e) {
			console.error('Failed to delete entry:', e);
		}
	};

	/**
	 * Navigate to settings
	 */
	const navigateToSettings = () => {
		history.push('/settings');
	};
	
	/**
	 * Handle FAB click - open speech modal and start listening
	 */
	const handleSpeechFabClick = async () => {
		if (!isAvailable) {
			presentToast({
				message: 'Speech recognition is not available on this device',
				duration: 3000,
				color: 'warning',
			});
			return;
		}
		
		if (permissionStatus === 'denied') {
			presentToast({
				message: 'Microphone permission was denied. Please enable it in settings.',
				duration: 3000,
				color: 'warning',
			});
			return;
		}
		
		// Reset state and open modal
		resetSpeech();
		setEditableTranscript('');
		setShowSpeechModal(true);
		
		// Start listening after a short delay to let the modal open
		setTimeout(() => {
			startListening();
		}, 300);
	};
	
	/**
	 * Handle stop listening
	 */
	const handleStopListening = () => {
		// Don't await - let it run in background to avoid blocking UI
		stopListening().catch((e) => {
			console.error('Error stopping speech recognition:', e);
		});
	};
	
	/**
	 * Handle closing the modal (button click)
	 */
	const handleCloseModal = () => {
		// Stop listening if active
		if (isListening) {
			stopListening().catch((e) => {
				console.error('Error stopping speech recognition:', e);
			});
		}
		// Clean up state
		resetSpeech();
		setEditableTranscript('');
		// Close modal
		setShowSpeechModal(false);
	};
	
	/**
	 * Handle modal dismiss event (triggered after modal is closed)
	 */
	const handleModalDidDismiss = () => {
		// Ensure cleanup happens when modal is dismissed by any means
		// (swipe down, backdrop tap, programmatic close)
		resetSpeech();
		setEditableTranscript('');
	};
	
	/**
	 * Handle save transcript to inbox
	 */
	const handleSaveTranscript = async () => {
		const textToSave = editableTranscript.trim();
		
		if (!textToSave) {
			presentToast({
				message: 'Please speak or enter some text to save',
				duration: 2000,
				color: 'warning',
			});
			return;
		}
		
		setIsSaving(true);
		
		try {
			// Create new inbox entry
			const newEntry: InboxEntry = {
				id: generateUUID(),
				contentType: 'text',
				content: textToSave,
				preview: textToSave.length > 100 ? textToSave.substring(0, 100) + '...' : textToSave,
				isLocked: false,
				createdAt: Date.now(),
			};
			
			await Inbox.saveEntry({ entry: newEntry });
			
			// Refresh entries
			await loadEntries();
			
			// Close modal
			handleCloseModal();
			
			presentToast({
				message: 'Saved to inbox',
				duration: 2000,
				color: 'success',
			});
		} catch (e) {
			console.error('Failed to save entry:', e);
			presentToast({
				message: 'Failed to save entry',
				duration: 2000,
				color: 'danger',
			});
		} finally {
			setIsSaving(false);
		}
	};
	
	/**
	 * Handle retry speech recognition
	 */
	const handleRetryListening = async () => {
		resetSpeech();
		setEditableTranscript('');
		await startListening();
	};

	return (
		<IonPage>
			<IonHeader>
				<IonToolbar>
					<IonTitle>MasterFlasher</IonTitle>
					<IonButtons slot="end">
						<IonButton onClick={navigateToSettings}>
							<IonIcon slot="icon-only" icon={settingsOutline} />
						</IonButton>
					</IonButtons>
				</IonToolbar>
			</IonHeader>
			<IonContent>
				<IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
					<IonRefresherContent />
				</IonRefresher>

				{/* Loading State */}
				{loading && (
					<div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
						<IonSpinner />
					</div>
				)}

				{/* Error State */}
				{error && !loading && (
					<div style={{ padding: 20, textAlign: 'center' }}>
						<IonText color="danger">
							<p>{error}</p>
						</IonText>
						<IonButton onClick={loadEntries}>Retry</IonButton>
					</div>
				)}

				{/* Empty State */}
				{!loading && !error && entries.length === 0 && (
					<div style={{ padding: 40, textAlign: 'center' }}>
						<IonIcon
							icon={documentTextOutline}
							style={{ fontSize: 64, color: 'var(--ion-color-medium)' }}
						/>
						<IonText color="medium">
							<h2>Inbox Empty</h2>
							<p>Share text, URLs, or PDFs from any app, or tap the microphone to speak.</p>
						</IonText>
					</div>
				)}

				{/* Entries List */}
				{!loading && !error && entries.length > 0 && (
					<IonList>
						{entries.map((entry) => (
							<IonItemSliding key={entry.id}>
								<IonItem button onClick={() => openEntry(entry)}>
									<IonIcon
										slot="start"
										icon={
											entry.contentType === 'url'
												? linkOutline
												: entry.contentType === 'pdf'
													? documentOutline
													: documentTextOutline
										}
										color={
											entry.contentType === 'url'
												? 'primary'
												: entry.contentType === 'pdf'
													? 'tertiary'
													: 'medium'
										}
									/>
									<IonLabel>
										<h2
											style={{
												display: 'flex',
												alignItems: 'center',
												gap: 8,
											}}
										>
											{entry.title || entry.preview}
											{entry.isLocked && (
												<IonIcon
													icon={lockClosedOutline}
													color="success"
													style={{ fontSize: 14 }}
												/>
											)}
										</h2>
										<p
											style={{
												overflow: 'hidden',
												textOverflow: 'ellipsis',
												whiteSpace: 'nowrap',
											}}
										>
											{entry.contentType === 'url'
												? entry.content
												: entry.contentType === 'pdf'
													? entry.title || 'PDF Document'
													: entry.preview}
										</p>
										<p style={{ 
											display: 'flex', 
											alignItems: 'center', 
											gap: 4,
											fontSize: '0.8em',
											color: 'var(--ion-color-medium)'
										}}>
											<IonIcon icon={timeOutline} style={{ fontSize: 12 }} />
											{formatRelativeTime(entry.createdAt)}
										</p>
									</IonLabel>
									{entry.isLocked && (
										<IonChip slot="end" color="success" style={{ fontSize: 10 }}>
											Cards Ready
										</IonChip>
									)}
								</IonItem>
								<IonItemOptions side="end">
									<IonItemOption 
										color="danger" 
										onClick={() => deleteEntry(entry)}
									>
										<IonIcon slot="icon-only" icon={trashOutline} />
									</IonItemOption>
								</IonItemOptions>
							</IonItemSliding>
						))}
					</IonList>
				)}
				
				{/* Speech Recognition FAB - Centered and elevated */}
				{!isInitializing && isAvailable && (
					<IonFab
						vertical="bottom"
						horizontal="center"
						slot="fixed"
						style={{ marginBottom: 24 }}
					>
						<IonFabButton onClick={handleSpeechFabClick} color="primary">
							<IonIcon icon={micOutline} />
						</IonFabButton>
					</IonFab>
				)}
				
				{/* Speech Recognition Modal */}
				<IonModal
					isOpen={showSpeechModal}
					onDidDismiss={handleModalDidDismiss}
					initialBreakpoint={0.5}
					breakpoints={[0, 0.5, 0.75]}
				>
					<IonHeader>
						<IonToolbar>
							<IonTitle>Voice Input</IonTitle>
							<IonButtons slot="end">
								<IonButton onClick={handleCloseModal}>
									<IonIcon slot="icon-only" icon={closeOutline} />
								</IonButton>
							</IonButtons>
						</IonToolbar>
					</IonHeader>
					<IonContent className="ion-padding">
						{/* Listening State */}
						{isListening && (
							<div style={{ textAlign: 'center', marginBottom: 20 }}>
								<div 
									style={{
										width: 80,
										height: 80,
										borderRadius: '50%',
										backgroundColor: 'var(--ion-color-primary)',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										margin: '0 auto 16px',
										animation: 'pulse 1.5s infinite',
									}}
								>
									<IonIcon 
										icon={micOutline} 
										style={{ fontSize: 40, color: 'white' }} 
									/>
								</div>
								<IonText color="primary">
									<h3 style={{ margin: 0 }}>Listening...</h3>
								</IonText>
								<IonText color="medium">
									<p style={{ margin: '8px 0 0' }}>Speak now</p>
								</IonText>
								<IonButton 
									fill="outline" 
									color="danger" 
									onClick={handleStopListening}
									style={{ marginTop: 16 }}
								>
									<IonIcon slot="start" icon={stopOutline} />
									Stop
								</IonButton>
							</div>
						)}
						
						{/* Error State */}
						{speechError && !isListening && (
							<div style={{ textAlign: 'center', marginBottom: 20 }}>
								<IonText color="danger">
									<p>{speechError}</p>
								</IonText>
								<IonButton onClick={handleRetryListening}>
									<IonIcon slot="start" icon={micOutline} />
									Try Again
								</IonButton>
							</div>
						)}
						
						{/* Transcript Display/Edit */}
						{!isListening && !speechError && (
							<>
								<IonText color="medium">
									<p style={{ marginBottom: 8 }}>
										{editableTranscript ? 'Edit your text:' : 'Tap the microphone to speak, or type below:'}
									</p>
								</IonText>
								<IonTextarea
									placeholder="Your spoken text will appear here..."
									value={editableTranscript}
									onIonInput={(e) => setEditableTranscript(e.detail.value || '')}
									rows={4}
									autoGrow
									style={{
										'--background': 'var(--ion-color-light)',
										'--padding-start': '12px',
										'--padding-end': '12px',
										'--padding-top': '12px',
										'--padding-bottom': '12px',
										borderRadius: 8,
									}}
								/>
								
								<div style={{ 
									display: 'flex', 
									gap: 12, 
									marginTop: 20,
									justifyContent: 'center',
								}}>
									<IonButton 
										fill="outline" 
										onClick={handleRetryListening}
									>
										<IonIcon slot="start" icon={micOutline} />
										{editableTranscript ? 'Re-record' : 'Start Speaking'}
									</IonButton>
									
									{editableTranscript && (
										<IonButton 
											onClick={handleSaveTranscript}
											disabled={isSaving}
										>
											{isSaving ? (
												<IonSpinner name="crescent" />
											) : (
												<>
													<IonIcon slot="start" icon={checkmarkOutline} />
													Save to Inbox
												</>
											)}
										</IonButton>
									)}
								</div>
							</>
						)}
					</IonContent>
				</IonModal>
				
				{/* CSS for pulse animation */}
				<style>{`
					@keyframes pulse {
						0% {
							box-shadow: 0 0 0 0 rgba(var(--ion-color-primary-rgb), 0.7);
						}
						70% {
							box-shadow: 0 0 0 20px rgba(var(--ion-color-primary-rgb), 0);
						}
						100% {
							box-shadow: 0 0 0 0 rgba(var(--ion-color-primary-rgb), 0);
						}
					}
				`}</style>
			</IonContent>
		</IonPage>
	);
};

export default InboxScreen;
