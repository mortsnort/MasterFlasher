import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
	IonPage,
	IonContent,
	IonHeader,
	IonToolbar,
	IonTitle,
	IonButtons,
	IonBackButton,
	IonList,
	IonItem,
	IonLabel,
	IonInput,
	IonButton,
	IonText,
	IonNote,
	IonCard,
	IonCardContent,
	IonIcon,
	IonSpinner,
} from '@ionic/react';
import { keyOutline, sparklesOutline, trashOutline, checkmarkCircleOutline } from 'ionicons/icons';
import {
	getGeminiApiKey,
	getGeminiModel,
	setGeminiApiKey,
	setGeminiModel,
	clearGeminiSettings,
} from '../lib/settings/secureStorage';
import { DEFAULT_MODEL } from '../lib/settings/geminiConfig';

type SaveState = 'idle' | 'saving' | 'success' | 'error';

const SettingsScreen: React.FC = () => {
	const history = useHistory();
	const [apiKey, setApiKey] = useState('');
	const [modelName, setModelName] = useState('');
	const [loading, setLoading] = useState(true);
	const [saveState, setSaveState] = useState<SaveState>('idle');
	const [errorMessage, setErrorMessage] = useState('');
	const [hasExistingKey, setHasExistingKey] = useState(false);

	useEffect(() => {
		loadSettings();
	}, []);

	const loadSettings = async () => {
		setLoading(true);
		try {
			const storedKey = await getGeminiApiKey();
			const storedModel = await getGeminiModel();
			
			if (storedKey) {
				// Show masked key for security
				setApiKey(storedKey);
				setHasExistingKey(true);
			}
			
			setModelName(storedModel || '');
		} catch (error) {
			console.error('Failed to load settings:', error);
		} finally {
			setLoading(false);
		}
	};

	const handleSave = async () => {
		// Validate API key
		if (!apiKey.trim()) {
			setErrorMessage('API Key is required');
			setSaveState('error');
			return;
		}

		setSaveState('saving');
		setErrorMessage('');

		try {
			// Save API key
			const keySuccess = await setGeminiApiKey(apiKey.trim());
			if (!keySuccess) {
				throw new Error('Failed to save API key');
			}

			// Save model (or use default if empty)
			const modelToSave = modelName.trim() || DEFAULT_MODEL;
			const modelSuccess = await setGeminiModel(modelToSave);
			if (!modelSuccess) {
				throw new Error('Failed to save model name');
			}

			setSaveState('success');
			setHasExistingKey(true);
			
			// Navigate back after short delay to show success state
			setTimeout(() => {
				history.goBack();
			}, 1000);
		} catch (error) {
			console.error('Save failed:', error);
			setErrorMessage(error instanceof Error ? error.message : 'Failed to save settings');
			setSaveState('error');
		}
	};

	const handleClear = async () => {
		setSaveState('saving');
		try {
			await clearGeminiSettings();
			setApiKey('');
			setModelName('');
			setHasExistingKey(false);
			setSaveState('idle');
		} catch (error) {
			console.error('Clear failed:', error);
			setErrorMessage('Failed to clear settings');
			setSaveState('error');
		}
	};

	const getMaskedKey = (key: string): string => {
		if (key.length <= 8) return '••••••••';
		return key.substring(0, 4) + '••••••••' + key.substring(key.length - 4);
	};

	if (loading) {
		return (
			<IonPage>
				<IonHeader>
					<IonToolbar>
						<IonButtons slot="start">
							<IonBackButton defaultHref="/import" />
						</IonButtons>
						<IonTitle>Settings</IonTitle>
					</IonToolbar>
				</IonHeader>
				<IonContent className="ion-padding">
					<div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
						<IonSpinner />
					</div>
				</IonContent>
			</IonPage>
		);
	}

	return (
		<IonPage>
			<IonHeader>
				<IonToolbar>
					<IonButtons slot="start">
						<IonBackButton defaultHref="/import" />
					</IonButtons>
					<IonTitle>Settings</IonTitle>
				</IonToolbar>
			</IonHeader>
			<IonContent className="ion-padding">
				<IonCard>
					<IonCardContent>
						<IonText>
							<h2 style={{ marginTop: 0 }}>Gemini API Configuration</h2>
							<p>
								Enter your Gemini API key to use the app. You can get an API key from{' '}
								<a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">
									Google AI Studio
								</a>.
							</p>
						</IonText>
					</IonCardContent>
				</IonCard>

				<IonList>
					<IonItem>
						<IonIcon icon={keyOutline} slot="start" />
						<IonLabel position="stacked">API Key *</IonLabel>
						<IonInput
							type={hasExistingKey && apiKey === (apiKey) ? 'password' : 'text'}
							value={hasExistingKey ? getMaskedKey(apiKey) : apiKey}
							placeholder="Enter your Gemini API key"
							onIonInput={(e) => {
								setApiKey(e.detail.value || '');
								setHasExistingKey(false);
								setSaveState('idle');
							}}
							onIonFocus={() => {
								if (hasExistingKey) {
									setApiKey('');
									setHasExistingKey(false);
								}
							}}
						/>
						<IonNote slot="helper">Required for generating flashcards</IonNote>
					</IonItem>

					<IonItem>
						<IonIcon icon={sparklesOutline} slot="start" />
						<IonLabel position="stacked">Model Name</IonLabel>
						<IonInput
							type="text"
							value={modelName}
							placeholder={DEFAULT_MODEL}
							onIonInput={(e) => {
								setModelName(e.detail.value || '');
								setSaveState('idle');
							}}
						/>
						<IonNote slot="helper">
							Leave empty for default ({DEFAULT_MODEL})
						</IonNote>
					</IonItem>
				</IonList>

				{/* Error Message */}
				{saveState === 'error' && errorMessage && (
					<IonCard color="danger">
						<IonCardContent>
							<IonText color="light">{errorMessage}</IonText>
						</IonCardContent>
					</IonCard>
				)}

				{/* Success Message */}
				{saveState === 'success' && (
					<IonCard color="success">
						<IonCardContent>
							<IonText color="light">
								<IonIcon icon={checkmarkCircleOutline} /> Settings saved successfully!
							</IonText>
						</IonCardContent>
					</IonCard>
				)}

				{/* Action Buttons */}
				<div style={{ marginTop: '1.5rem' }}>
					<IonButton
						expand="block"
						onClick={handleSave}
						disabled={saveState === 'saving'}
					>
						{saveState === 'saving' ? <IonSpinner name="crescent" /> : 'Save Settings'}
					</IonButton>

					{hasExistingKey && (
						<IonButton
							expand="block"
							fill="outline"
							color="danger"
							onClick={handleClear}
							disabled={saveState === 'saving'}
							style={{ marginTop: '0.5rem' }}
						>
							<IonIcon icon={trashOutline} slot="start" />
							Clear Settings
						</IonButton>
					)}
				</div>

				{/* Info about development mode */}
				{import.meta.env.DEV && (
					<IonCard color="warning" style={{ marginTop: '1.5rem' }}>
						<IonCardContent>
							<IonText>
								<strong>Development Mode</strong>
								<p style={{ marginBottom: 0 }}>
									In development, the app will first check for VITE_GEMINI_API_KEY in your .env file.
									Settings saved here will be used as a fallback.
								</p>
							</IonText>
						</IonCardContent>
					</IonCard>
				)}
			</IonContent>
		</IonPage>
	);
};

export default SettingsScreen;
