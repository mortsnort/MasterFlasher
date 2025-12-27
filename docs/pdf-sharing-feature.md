# PDF Sharing Feature

## Purpose

This feature enables users to share PDF files to MasterFlasher from any Android app. The PDF content is extracted using pdf.js and can then be used to generate flashcards, following the same workflow as URL and text content.

## Key Files

### Android Native Layer

- [`android/app/src/main/AndroidManifest.xml`](../android/app/src/main/AndroidManifest.xml) — PDF MIME type intent-filter for ShareReceiverActivity
- [`android/app/src/main/res/xml/file_paths.xml`](../android/app/src/main/res/xml/file_paths.xml) — FileProvider path configuration for PDF storage
- [`android/app/src/main/java/.../plugins/ShareReceiverActivity.java`](../android/app/src/main/java/com/snortstudios/masterflasher/plugins/ShareReceiverActivity.java) — Handles PDF sharing, copies file to app storage on background thread
- [`android/app/src/main/java/.../db/InboxEntry.java`](../android/app/src/main/java/com/snortstudios/masterflasher/db/InboxEntry.java) — Room entity with `pdf` content type support
- [`android/app/src/main/java/.../plugins/InboxPlugin.java`](../android/app/src/main/java/com/snortstudios/masterflasher/plugins/InboxPlugin.java) — PDF file cleanup when entries are deleted

### TypeScript/Web Layer

- [`src/lib/pdf/extractPdfText.ts`](../src/lib/pdf/extractPdfText.ts) — PDF text extraction using pdf.js
- [`src/plugins/Inbox.ts`](../src/plugins/Inbox.ts) — TypeScript interface with `pdf` content type
- [`src/pages/EntryDetailScreen.tsx`](../src/pages/EntryDetailScreen.tsx) — PDF extraction UI and handling
- [`src/pages/InboxScreen.tsx`](../src/pages/InboxScreen.tsx) — PDF-specific icon display in inbox list

## How It Works

### Share Flow

1. User shares a PDF from any Android app (Files, Gmail, Chrome, etc.)
2. Android routes the share intent to `ShareReceiverActivity` via `application/pdf` MIME type filter
3. `ShareReceiverActivity` extracts the PDF URI from `Intent.EXTRA_STREAM`
4. **On a background thread**: The PDF is copied to `{app_files_dir}/pdfs/pdf_{uuid}.pdf`
5. A Capacitor-compatible file URL is created: `capacitor://localhost/_capacitor_file_<absolute_path>`
6. An `InboxEntry` is created with:
   - `contentType = "pdf"`
   - `content = <Capacitor URL>`
   - `preview = "PDF: {filename}"`
   - `title = <original filename>`
7. Entry is saved to Room database
8. Toast confirms "PDF saved to inbox"
9. Activity finishes immediately (no UI opened)

### Extraction Flow

1. User opens the PDF entry in `EntryDetailScreen`
2. Screen shows "Extract Text from PDF" button (since `extractedText` is null)
3. User taps button → `handlePdfExtract()` is called
4. `extractPdfText()` extracts the file path from the Capacitor URL
5. Capacitor `Filesystem.readFile()` reads the PDF as base64 data
6. Base64 data is converted to `Uint8Array` for pdf.js
7. pdf.js loads the PDF from the data buffer
8. Text is extracted from all pages
9. Text is cleaned up (hyphenation fix, whitespace normalization)
10. `Inbox.updateExtractedContent()` saves the extracted text
11. UI updates to show content preview and enable "Generate Cards" button

### Cleanup Flow

When a PDF entry is deleted (manually or via auto-remove):
1. `InboxPlugin.deleteEntry()` or `InboxPlugin.checkAutoRemove()` is called
2. Entry is checked for `contentType === "pdf"`
3. If PDF, the file path is extracted from the Capacitor URL
4. PDF file is deleted from app storage
5. Database entry is deleted (cascade deletes associated cards)

## Dependencies

### npm Packages

- `pdfjs-dist` — PDF.js library for client-side PDF text extraction
- `@capacitor/filesystem` — Capacitor plugin for reading PDF files from app storage

### pdf.js Worker Configuration

The worker is configured using Vite's `?url` import for proper bundling:

```typescript
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
```

## Usage

### Sharing a PDF

1. Open any app with a PDF (Files, Gmail attachment, etc.)
2. Tap Share → Select MasterFlasher
3. See "Saving PDF to inbox..." then "PDF saved to inbox" toast
4. Open MasterFlasher to see the PDF entry in inbox

### Processing a PDF

1. Tap the PDF entry in inbox (shown with document icon)
2. Tap "Extract Text from PDF" button
3. Wait for extraction (progress shown)
4. Review extracted text preview
5. Set deck name and tap "Generate Cards"
6. Review and add cards to AnkiDroid

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Large PDF (>10MB) | pdf.js loads via URL (no memory issue), extraction may take time |
| Password-protected PDF | pdf.js fails; user-friendly error message shown |
| Scanned PDF (images only) | Little/no text extracted; message suggests OCR not supported |
| PDF extraction fails | Error toast; allow retry; entry remains with contentType=pdf |
| App uninstalled | PDF files in app storage automatically deleted by Android |
| Entry deleted | PDF file deleted via cleanup logic in InboxPlugin |

## Text Cleanup

The extracted text goes through several cleanup steps:

1. **Hyphenation fix**: `hy-\nphen` → `hyphen`
2. **Space normalization**: Multiple spaces/tabs → single space
3. **Newline normalization**: 3+ newlines → double newline (paragraph break)
4. **Line trimming**: Whitespace trimmed from each line
5. **Final trim**: Leading/trailing whitespace removed

## File Storage

PDFs are stored in the app's internal files directory:
- Path: `{Context.getFilesDir()}/pdfs/pdf_{uuid}.pdf`
- Capacitor URL: `capacitor://localhost/_capacitor_file_<absolute_path>`
- Automatically deleted when app is uninstalled
- Manually deleted when entry is removed

## Testing Checklist

- [ ] Share PDF from Files app → saved to inbox
- [ ] Share PDF from Gmail attachment → saved to inbox
- [ ] Share PDF from Chrome download → saved to inbox
- [ ] Open PDF entry → shows extraction button
- [ ] Extract text → text appears in preview
- [ ] Generate cards from PDF text → cards created
- [ ] Delete PDF entry → file removed from storage
- [ ] Handle password-protected PDF → graceful error
- [ ] Handle image-only PDF → appropriate message
- [ ] Share large PDF (>10MB) → works without memory issues
