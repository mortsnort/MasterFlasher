# DomeKeep

DomeKeep is an Android application that serves as an intelligent bridge between your content consumption and AnkiDroid. It allows you to share text or URLs from any app, uses Gemini AI to extract atomic facts and generate high-quality flashcards, and then lets you selectively add them to your AnkiDroid decks.

## Features

- **Share Integration**: Seamlessly share text or links from any Android app (Chrome, Twitter, Reddit, etc.) directly to DomeKeep.
- **Web Clipper**: When sharing URLs, DomeKeep launches a distraction-free reader view to extract the main content before processing.
- **AI-Powered Generation**: Uses Google's Gemini Flash Lite model to:
  1.  Extract atomic, testable facts from the source text.
  2.  Convert those facts into well-structured Anki flashcards (Front/Back/Tags).
- **Manual Review**: Review generated cards before they enter your deck. Edit or discard cards that don't meet your standards.
- **AnkiDroid Integration**: Direct integration with the AnkiDroid API to create decks, models, and notes without exporting/importing files.
- **"Hot-Share" Support**: Works whether the app is cold-started or already running in the background.

## How It Works

1.  **Capture**: The user shares content via the Android System Share Sheet.
    -   *Text Share*: The text is processed directly.
    -   *URL Share*: A native WebView opens, and `Readability.js` extracts the article content.
2.  **Process**:
    -   **Fact Extraction**: The raw content is sent to Gemini with a prompt to extract "atomic facts"—single, indivisible pieces of information.
    -   **Card Generation**: These facts are fed back into Gemini to generate Flashcards with a Front, Back, and Tags.
3.  **Review**: The user is presented with a list of generated cards.
4.  **Export**: The user clicks "Add" on specific cards. The app uses the AnkiDroid Content Provider API to insert the note into the "DomeKeep" deck.

## Tech Stack

-   **Frontend**: React, Ionic Framework, TypeScript
-   **Build Tool**: Vite
-   **Native Runtime**: Capacitor
-   **AI**: Google Gemini API (Flash Lite model)
-   **Android Integration**:
    -   Custom Capacitor Plugins (`AnkiDroid`, `ShareReceiver`, `WebClipper`)
    -   Java / Android SDK
-   **Target App**: AnkiDroid (must be installed on the device)

## Installation & Setup

### Prerequisites

-   Node.js & npm
-   Android Studio (for building the APK)
-   AnkiDroid installed on your Android device/emulator.
    -   *Note*: You must enable the API in AnkiDroid: `Settings -> Advanced -> Enable AnkiDroid API`.

### Steps

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/domekeep.git
    cd domekeep
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment**
    Create a `.env` file in the root directory:
    ```env
    VITE_GEMINI_API_KEY=your_gemini_api_key_here
    VITE_GEMINI_MODEL_NAME=gemini-2.0-flash-lite-preview-02-05
    ```

4.  **Sync Capacitor**
    ```bash
    npx cap sync android
    ```

5.  **Run on Android**
    ```bash
    npx cap run android
    ```
    Or open in Android Studio:
    ```bash
    npx cap open android
    ```

## Contributing

Contributions are welcome! Please follow the existing code style and document any new features or modules as per `agents.md`.

## License

MIT
