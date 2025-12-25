# User API Key Settings Module

## Purpose

Allows users to provide their own Gemini API key and optionally specify a Gemini model, stored securely using `capacitor-secure-storage-plugin`. This enables the app to work without bundling an API key in production builds.

## Key Files

- [`src/lib/settings/secureStorage.ts`](../src/lib/settings/secureStorage.ts) — Wrapper around capacitor-secure-storage-plugin with typed methods for storing/retrieving Gemini settings
- [`src/lib/settings/geminiConfig.ts`](../src/lib/settings/geminiConfig.ts) — Configuration resolver that determines whether to use env variables (dev) or secure storage (prod)
- [`src/pages/SettingsScreen.tsx`](../src/pages/SettingsScreen.tsx) — UI for entering API key and model selection
- [`src/lib/gemini/generateFacts.ts`](../src/lib/gemini/generateFacts.ts) — Refactored to use async config service
- [`src/lib/gemini/generateFlashcards.ts`](../src/lib/gemini/generateFlashcards.ts) — Refactored to use async config service

## How It Works

### Configuration Resolution

```
┌─────────────────┐
│   App Start     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌─────────────────┐
│  Is Dev Mode?   │──Yes─▶│  Use .env vars  │
└────────┬────────┘      └─────────────────┘
         │No
         ▼
┌─────────────────┐      ┌─────────────────┐
│ Check Secure    │──Key─▶│  Use stored key │
│ Storage         │ Found └─────────────────┘
└────────┬────────┘
         │No Key
         ▼
┌─────────────────┐
│ Show Settings   │
│ Screen          │
└─────────────────┘
```

1. **Development mode** (`import.meta.env.DEV === true`): Uses environment variables from `.env` file
2. **Production mode**: Uses secure storage, prompting user to configure if no key exists

### Storage Keys

| Key | Description |
|-----|-------------|
| `gemini_api_key` | User's Gemini API key |
| `gemini_model` | Selected Gemini model name (optional) |

### Default Model

If no model is specified, the app defaults to `gemini-2.5-flash-lite`.

## Dependencies

- `capacitor-secure-storage-plugin@0.12.0` — Provides encrypted storage on Android (KeyStore) and iOS (Keychain)

## Usage

### Checking Configuration

```typescript
import { hasValidConfig, getGeminiConfig } from './lib/settings/geminiConfig';

// Check if API key is configured
const isConfigured = await hasValidConfig();

// Get full config (returns null if not configured)
const config = await getGeminiConfig();
if (config) {
  console.log(`Using model: ${config.modelName}`);
}
```

### Storing Settings

```typescript
import { setGeminiApiKey, setGeminiModel, clearGeminiSettings } from './lib/settings/secureStorage';

// Save API key
await setGeminiApiKey('your-api-key');

// Save model (optional)
await setGeminiModel('gemini-2.5-flash');

// Clear all settings
await clearGeminiSettings();
```

### Navigation

The Settings screen is accessible via:
- Settings icon in the ImportScreen header
- Direct navigation to `/settings` route

## Edge Cases

1. **Storage access failure**: Functions return `null` or `false` gracefully
2. **Invalid API key**: Gemini API will return an error — surfaced in UI with retry option
3. **Missing model**: Falls back to `gemini-2.5-flash-lite`
4. **Development mode**: Environment variables take precedence, but secure storage works as fallback

## Security Notes

- API keys are stored using platform-native secure storage:
  - **Android**: Android KeyStore
  - **iOS**: iOS Keychain
- Keys are never logged or exposed in UI (masked display)
- Clear settings option available for users

## Migration Notes

### From Previous Version

The previous version required `.env` configuration:

```env
VITE_GEMINI_API_KEY=your_key
VITE_GEMINI_MODEL_NAME=gemini-2.5-flash-lite
```

This is now only required for development. Production users configure via Settings screen.

### Existing Behavior

- `.env` files still work for development
- No database migration needed — secure storage is additive
- Gemini generation functions are now async for config loading (already were async for API calls)
