<p align="center">
  <img src="./logo.png" width="250" alt="MasterFlasher logo">
</p>

<h1 align="center">MasterFlasher</h1>

MasterFlasher is an Android app that turns shared text or URLs into AnkiDroid flashcards using Gemini. Share content from any app, it's saved silently to your inbox, then process items at your own pace.

## Features

- **Silent Share**: Share text, URLs, or PDFs from any app — content is saved to inbox without opening the app
- **Inbox-based workflow**: Process multiple items at your own pace
- **Web clipper**: Extract clean article text from URLs using Readability
- **PDF extraction**: Extract text from PDF files using pdf.js
- **Gemini-powered**: Automatic fact extraction and flashcard generation
- **Deck customization**: Set custom deck name per entry
- **Manual review**: Review and add cards one by one
- **Auto-cleanup**: Entries are removed automatically when all cards are added
- **Direct AnkiDroid integration**: Deck + model creation, note insertion

## How It Works

1. **Share**: Share text, a URL, or a PDF to MasterFlasher from any Android app.
2. **Silent Save**: Content is saved to your inbox with a toast confirmation — no UI opens.
3. **Open App**: Launch MasterFlasher to see your inbox of saved items.
4. **Process**: Tap an entry, extract content (for URLs/PDFs), set deck name, generate cards.
5. **Review & Add**: Review each card and add the ones you want to AnkiDroid.
6. **Auto-remove**: Once all cards are added, the entry is automatically removed.

## Project Structure

- `src/pages/InboxScreen.tsx` - Main inbox screen showing saved entries
- `src/pages/EntryDetailScreen.tsx` - Card generation and review for a single entry
- `src/pages/SettingsScreen.tsx` - API key and settings configuration
- `src/plugins/Inbox.ts` - Inbox database plugin interface
- `src/lib/gemini/` - Gemini prompts and response parsing
- `android/app/src/main/java/com/snortstudios/masterflasher/db/` - Room database entities and DAO
- `android/app/src/main/java/com/snortstudios/masterflasher/plugins/` - Native Capacitor plugins

## Requirements

- Node.js + npm
- Android Studio (for device/emulator builds)
- AnkiDroid installed on the device
- Gemini API key

## Setup

1. Install dependencies
   ```bash
   npm install
   ```

2. Configure environment (Development only)
   Create a `.env` file in the repository root:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   VITE_GEMINI_MODEL_NAME=gemini-2.5-flash-lite
   ```
   
   > **Note**: In production, users configure their own API key via the Settings screen. The `.env` file is only needed for development.

3. Sync Capacitor
   ```bash
   npx cap sync android
   ```

4. Run on Android
   ```bash
   npx cap run android
   ```
   Or open Android Studio:
   ```bash
   npx cap open android
   ```

## Usage

1. **Share content**: Share text, a URL, or a PDF to MasterFlasher from any Android app.
2. **Content saved**: You'll see a toast "Saved to inbox" — the app doesn't open.
3. **Open MasterFlasher**: Launch the app to see your inbox of saved items.
4. **Tap an entry**: Opens the detail screen for that content.
5. **For URLs**: Tap "Extract Content from URL" to fetch the article text.
6. **For PDFs**: Tap "Extract Text from PDF" to extract the document text.
7. **Set deck name**: Choose a custom deck name (default: "MasterFlasher").
8. **Generate cards**: Tap "Generate Cards" to create flashcards using Gemini.
9. **Review & add**: Tap "Add" on each card you want to keep.
10. **Auto-cleanup**: Once all cards are added, the entry is removed from inbox.

### Managing Entries

- **Pull to refresh**: Pull down on the inbox to reload entries
- **Delete entries**: Swipe left on an entry and tap the trash icon
- **Locked entries**: Entries with generated cards show a lock icon and "Cards Ready" badge

## Configuration Notes

- Default deck name is `MasterFlasher` (customizable per entry).
- Model key used for cards is `com.snortstudios.masterflasher`.
- Gemini output is expected to be strict JSON; failures will surface in the UI log.
- Default Gemini model is `gemini-2.5-flash-lite` when not specified.
- Generated cards and entries are stored in a local SQLite database.

## API Key Configuration

### Development Mode
Uses `.env` file variables (`VITE_GEMINI_API_KEY`, `VITE_GEMINI_MODEL_NAME`).

### Production Mode
Users configure their own Gemini API key via the in-app Settings screen:
1. Tap the settings icon (⚙️) in the header
2. Enter your Gemini API key (get one free from [Google AI Studio](https://aistudio.google.com/app/apikey))
3. Optionally specify a different Gemini model
4. Tap "Save Settings"

API keys are stored securely using platform-native encryption (Android KeyStore).

## Troubleshooting

- "Gemini API Key not configured": In production, open Settings to enter your API key. In development, check `.env` and restart the dev server/build.
- "AnkiDroid not available": ensure AnkiDroid is installed and the API is enabled.
- Share does nothing: confirm the app is installed and chosen as a share target.

## License

This project is licensed under the  
**Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)**.

- ✅ Free to use, modify, and share for **non-commercial** purposes
- ❌ Commercial use is **not permitted** without permission

See the [LICENSE](./LICENSE) file for details.
