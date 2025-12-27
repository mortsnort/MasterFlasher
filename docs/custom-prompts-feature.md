# Custom Prompts Feature

## Purpose

Allows users to customize the AI prompts used for fact extraction and flashcard creation in the Settings menu. Users can modify how the Gemini AI extracts concepts from text and generates flashcards, with the ability to reset to defaults at any time.

## Key Files

### Native Android

- `android/.../db/AppSetting.java` — Room entity for key-value settings storage
- `android/.../db/AppDatabase.java` — Database configuration with v1→v2 migration for settings table
- `android/.../db/InboxDao.java` — DAO with settings query methods (getSetting, setSetting, deleteSetting)
- `android/.../plugins/SettingsPlugin.java` — Capacitor plugin exposing settings to TypeScript
- `android/.../MainActivity.java` — Registers the SettingsPlugin

### TypeScript

- `src/plugins/Settings.ts` — TypeScript interface for the Settings Capacitor plugin
- `src/lib/settings/defaultPrompts.ts` — Default prompt constants and system constraints
- `src/lib/settings/promptConfig.ts` — Functions to get/set prompts with fallback to defaults
- `src/lib/gemini/generateFacts.ts` — Uses configurable prompt for fact extraction
- `src/lib/gemini/generateFlashcards.ts` — Uses configurable prompt for flashcard creation
- `src/pages/SettingsScreen.tsx` — UI with accordion sections for prompt editing

## How It Works

### Prompt Structure

Each prompt is split into three parts:

1. **User-editable instructions** — Stored in Room database, customizable via Settings
2. **System constraints** — Appended automatically, ensures valid output format (not user-editable)
3. **Dynamic content** — Appended at runtime (title, text, or facts JSON)

Example for fact extraction:
```
[User's custom prompt instructions]
---
SYSTEM CONSTRAINTS (do not override):
- If no concepts matching the criteria are found, return an empty facts array.
- Focus on quality and relevance over quantity.
- Each concept must be directly stated in the source text.

Context/Title: [title]
Text:
[text content]
```

### Storage Architecture

```
SettingsScreen.tsx
    ↓ (save/load)
promptConfig.ts
    ↓ (get/set)
Settings.ts (Capacitor plugin interface)
    ↓ (native call)
SettingsPlugin.java
    ↓ (query)
InboxDao.java → AppDatabase → SQLite (app_settings table)
```

### Database Migration

The app migrates from database version 1 to version 2, adding the `app_settings` table:

```sql
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT
)
```

## Dependencies

- Room Database (Android)
- Capacitor Plugin system
- Ionic React components (IonAccordion, IonTextarea)
- Google Generative AI SDK

## Usage

### Accessing Custom Prompts in Settings

1. Open the app and tap the Settings icon (⚙️)
2. Scroll down to "Custom Prompts" section
3. Tap "Fact Extraction Prompt" or "Flashcard Creation Prompt" to expand
4. Edit the prompt text
5. Tap "Save Settings" to apply changes

### Resetting to Defaults

1. Expand the prompt section you want to reset
2. Tap "Reset to Default" button
3. The textarea will show the default prompt
4. Tap "Save Settings" to confirm

### Using Custom Prompts Programmatically

```typescript
import { getFactExtractionPrompt, setFactExtractionPrompt } from './lib/settings/promptConfig';
import { DEFAULT_FACT_EXTRACTION_PROMPT } from './lib/settings/defaultPrompts';

// Get current prompt (returns custom if set, otherwise default)
const prompt = await getFactExtractionPrompt();

// Set a custom prompt
await setFactExtractionPrompt('My custom instructions...');

// Check if custom prompt differs from default
const isCustom = prompt !== DEFAULT_FACT_EXTRACTION_PROMPT;
```

## Edge Cases

- **Empty prompt** — Falls back to default if user clears the prompt completely
- **Invalid prompt** — Gemini handles malformed prompts gracefully; system constraints ensure valid JSON output
- **First app launch** — No settings exist yet; defaults are used automatically
- **Database migration** — Existing users get the new table without data loss
- **Chunk size** — Reduced to 4000 chars to naturally limit facts per chunk, removing the need for arbitrary "maximum 10" limits

## Default Prompts

### Fact Extraction (DEFAULT_FACT_EXTRACTION_PROMPT)

```
Extract explicit, relevant key concepts stated in the text.

Constraints:
1. Each key concept must be a single declarative sentence.
2. Maximum length per key concept: 240 characters.
3. No inference or interpretation - only explicit concepts from the source material.
4. Prioritize the most significant and unique concepts.
```

### Flashcard Creation (DEFAULT_FLASHCARD_CREATION_PROMPT)

```
Using these concepts, generate a flash card for each concept.
Front should be a clear question/prompt; back is the answer.
Add 1-4 short tags.
Deck Name: MasterFlasher
```

## Related Documentation

- `docs/settings-api-key.md` — API key configuration (separate from custom prompts)
- `plans/custom-prompts-feature.md` — Original implementation plan
