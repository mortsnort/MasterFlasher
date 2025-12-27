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
	useIonViewWillEnter,
} from '@ionic/react';
import type { RefresherEventDetail } from '@ionic/react';
import { App } from '@capacitor/app';
import {
	settingsOutline,
	linkOutline,
	documentTextOutline,
	trashOutline,
	lockClosedOutline,
	timeOutline,
} from 'ionicons/icons';
import Inbox from '../plugins/Inbox';
import type { InboxEntry } from '../plugins/Inbox';

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

const InboxScreen: React.FC = () => {
	const history = useHistory();
	const [entries, setEntries] = useState<InboxEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

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
							<p>Share text or URLs from any app to create flashcards.</p>
						</IonText>
					</div>
				)}

				{/* Entries List */}
				{!loading && !error && entries.length > 0 && (
					<IonList>
						{entries.map(entry => (
							<IonItemSliding key={entry.id}>
								<IonItem button onClick={() => openEntry(entry)}>
									<IonIcon
										slot="start"
										icon={entry.contentType === 'url' ? linkOutline : documentTextOutline}
										color={entry.contentType === 'url' ? 'primary' : 'medium'}
									/>
									<IonLabel>
										<h2 style={{ 
											display: 'flex', 
											alignItems: 'center', 
											gap: 8 
										}}>
											{entry.title || entry.preview}
											{entry.isLocked && (
												<IonIcon 
													icon={lockClosedOutline} 
													color="success" 
													style={{ fontSize: 14 }}
												/>
											)}
										</h2>
										<p style={{ 
											overflow: 'hidden', 
											textOverflow: 'ellipsis', 
											whiteSpace: 'nowrap' 
										}}>
											{entry.contentType === 'url' ? entry.content : entry.preview}
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
			</IonContent>
		</IonPage>
	);
};

export default InboxScreen;
