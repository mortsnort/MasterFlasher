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
	IonAccordion,
	IonAccordionGroup,
	IonTextarea,
} from '@ionic/react';
import { keyOutline, sparklesOutline, trashOutline, checkmarkCircleOutline, refreshOutline, documentTextOutline, flashOutline } from 'ionicons/icons';
import {
	getGeminiApiKey,
	getGeminiModel,
	setGeminiApiKey,
	setGeminiModel,
	clearGeminiSettings,
} from '../lib/settings/secureStorage';
import { DEFAULT_MODEL } from '../lib/settings/geminiConfig';
import {
	getFactExtractionPrompt,
	setFactExtractionPrompt,
	resetFactExtractionPrompt,
	getFlashcardCreationPrompt,
	setFlashcardCreationPrompt,
	resetFlashcardCreationPrompt,
} from '../lib/settings/promptConfig';
import {
	DEFAULT_FACT_EXTRACTION_PROMPT,
	DEFAULT_FLASHCARD_CREATION_PROMPT,
} from '../lib/settings/defaultPrompts';

type SaveState = 'idle' | 'saving' | 'success' | 'error';

const SettingsScreen: React.FC = () => {
	const history = useHistory();
	const [apiKey, setApiKey] = useState('');
	const [modelName, setModelName] = useState('');
	const [loading, setLoading] = useState(true);
	const [saveState, setSaveState] = useState<SaveState>('idle');
	const [errorMessage, setErrorMessage] = useState('');
	const [hasExistingKey, setHasExistingKey] = useState(false);

	// Custom prompt states
	const [factExtractionPrompt, setFactExtractionPromptState] = useState('');
	const [flashcardCreationPrompt, setFlashcardCreationPromptState] = useState('');
	const [promptsModified, setPromptsModified] = useState(false);

	useEffect(() => {
		loadSettings();
	}, []);

	const loadSettings = async () => {
		setLoading(true);
		try {
			// Load API settings
			const storedKey = await getGeminiApiKey();
			const storedModel = await getGeminiModel();
			
			if (storedKey) {
				setApiKey(storedKey);
				setHasExistingKey(true);
			}
			
			setModelName(storedModel || '');

			// Load custom prompts
			const factPrompt = await getFactExtractionPrompt();
			const flashcardPrompt = await getFlashcardCreationPrompt();
			
			setFactExtractionPromptState(factPrompt);
			setFlashcardCreationPromptState(flashcardPrompt);
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

			// Save custom prompts if modified
			if (promptsModified) {
				const factPromptSuccess = await setFactExtractionPrompt(factExtractionPrompt);
				if (!factPromptSuccess) {
					throw new Error('Failed to save fact extraction prompt');
				}

				const flashcardPromptSuccess = await setFlashcardCreationPrompt(flashcardCreationPrompt);
				if (!flashcardPromptSuccess) {
					throw new Error('Failed to save flashcard creation prompt');
				}
			}

			setSaveState('success');
			setHasExistingKey(true);
			setPromptsModified(false);
			
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

	const handleResetFactPrompt = async () => {
		setFactExtractionPromptState(DEFAULT_FACT_EXTRACTION_PROMPT);
		setPromptsModified(true);
		setSaveState('idle');
		// Actually reset in storage
		await resetFactExtractionPrompt();
	};

	const handleResetFlashcardPrompt = async () => {
		setFlashcardCreationPromptState(DEFAULT_FLASHCARD_CREATION_PROMPT);
		setPromptsModified(true);
		setSaveState('idle');
		// Actually reset in storage
		await resetFlashcardCreationPrompt();
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
				{/* API Configuration Section */}
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

				{/* Custom Prompts Section */}
				<IonCard style={{ marginTop: '1rem' }}>
					<IonCardContent>
						<IonText>
							<h2 style={{ marginTop: 0 }}>Custom Prompts</h2>
							<p>
								Customize how facts are extracted and flashcards are generated.
								System constraints are automatically appended to ensure proper output format.
							</p>
						</IonText>
					</IonCardContent>
				</IonCard>

				<IonAccordionGroup>
					{/* Fact Extraction Prompt */}
					<IonAccordion value="factPrompt">
						<IonItem slot="header" color="light">
							<IonIcon icon={documentTextOutline} slot="start" />
							<IonLabel>Fact Extraction Prompt</IonLabel>
						</IonItem>
						<div className="ion-padding" slot="content">
							<IonTextarea
								value={factExtractionPrompt}
								placeholder={DEFAULT_FACT_EXTRACTION_PROMPT}
								autoGrow={true}
								rows={8}
								onIonInput={(e) => {
									setFactExtractionPromptState(e.detail.value || '');
									setPromptsModified(true);
									setSaveState('idle');
								}}
								style={{ 
									border: '1px solid var(--ion-color-medium)',
									borderRadius: '8px',
									padding: '8px',
									minHeight: '150px',
									fontFamily: 'monospace',
									fontSize: '14px',
								}}
							/>
							<IonButton
								fill="outline"
								size="small"
								onClick={handleResetFactPrompt}
								style={{ marginTop: '0.5rem' }}
							>
								<IonIcon icon={refreshOutline} slot="start" />
								Reset to Default
							</IonButton>
							<IonNote style={{ display: 'block', marginTop: '0.5rem' }}>
								Controls how key concepts are extracted from text. The title and text content are automatically appended.
							</IonNote>
						</div>
					</IonAccordion>

					{/* Flashcard Creation Prompt */}
					<IonAccordion value="flashcardPrompt">
						<IonItem slot="header" color="light">
							<IonIcon icon={flashOutline} slot="start" />
							<IonLabel>Flashcard Creation Prompt</IonLabel>
						</IonItem>
						<div className="ion-padding" slot="content">
							<IonTextarea
								value={flashcardCreationPrompt}
								placeholder={DEFAULT_FLASHCARD_CREATION_PROMPT}
								autoGrow={true}
								rows={6}
								onIonInput={(e) => {
									setFlashcardCreationPromptState(e.detail.value || '');
									setPromptsModified(true);
									setSaveState('idle');
								}}
								style={{ 
									border: '1px solid var(--ion-color-medium)',
									borderRadius: '8px',
									padding: '8px',
									minHeight: '120px',
									fontFamily: 'monospace',
									fontSize: '14px',
								}}
							/>
							<IonButton
								fill="outline"
								size="small"
								onClick={handleResetFlashcardPrompt}
								style={{ marginTop: '0.5rem' }}
							>
								<IonIcon icon={refreshOutline} slot="start" />
								Reset to Default
							</IonButton>
							<IonNote style={{ display: 'block', marginTop: '0.5rem' }}>
								Controls how flashcards are generated from concepts. The concepts JSON is automatically appended.
							</IonNote>
						</div>
					</IonAccordion>
				</IonAccordionGroup>

				{/* Error Message */}
				{saveState === 'error' && errorMessage && (
					<IonCard color="danger" style={{ marginTop: '1rem' }}>
						<IonCardContent>
							<IonText color="light">{errorMessage}</IonText>
						</IonCardContent>
					</IonCard>
				)}

				{/* Success Message */}
				{saveState === 'success' && (
					<IonCard color="success" style={{ marginTop: '1rem' }}>
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
