# MasterFlasher

MasterFlasher is an Android app that turns shared text or URLs into AnkiDroid flashcards using Gemini. Share an article, get atomic facts, review the cards, and add the ones you want.

## Features

- Android share target for text and URLs
- Readability-based web clipper for clean article extraction
- Gemini-powered fact extraction and card generation
- Manual review before adding cards
- Direct AnkiDroid API integration (deck + model creation, note insertion)

## How It Works

1. Share text or a URL to MasterFlasher from any Android app.
2. URLs open a WebView reader; text is used directly.
3. Gemini extracts atomic facts, then generates basic front/back cards.
4. You review the cards and add selected ones to AnkiDroid.

## Project Structure

- `src/pages/ImportScreen.tsx` - Main flow UI (share, extract, generate, review, add)
- `src/lib/gemini/` - Gemini prompts and response parsing
- `src/lib/share/` - Share intent parsing
- `src/plugins/` - Capacitor plugin interfaces
- `android/` - Native Android app + Capacitor plugins

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

2. Configure environment
   Create a `.env` file in the repository root:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   VITE_GEMINI_MODEL_NAME=gemini-2.0-flash-lite-preview-02-05
   ```

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

1. Share text or a URL to MasterFlasher from any Android app.
2. If it is a URL, tap "Open & Extract".
3. Review the generated cards and tap "Add" on the ones you want.

## Configuration Notes

- Deck name is hard-coded as `MasterFlasher`.
- Model key used for cards is `com.snortstudios.masterflasher`.
- Gemini output is expected to be strict JSON; failures will surface in the UI log.

## Troubleshooting

- "Gemini API Key not found": check `.env` and restart the dev server/build.
- "AnkiDroid not available": ensure AnkiDroid is installed and the API is enabled.
- Share does nothing: confirm the app is installed and chosen as a share target.

## License

This project is licensed under the  
**Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)**.

- ✅ Free to use, modify, and share for **non-commercial** purposes
- ❌ Commercial use is **not permitted** without permission

See the [LICENSE](./LICENSE) file for details.
