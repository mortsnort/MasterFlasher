# Inbox Feature

## Purpose

The inbox feature transforms MasterFlasher from a single-share flow into an inbox-based architecture. Shared content is silently saved to a local database, allowing users to process multiple items at their own pace without losing content.

## Key Files

### Android/Java - Database Layer
- [`android/app/src/main/java/com/snortstudios/masterflasher/db/InboxEntry.java`](../android/app/src/main/java/com/snortstudios/masterflasher/db/InboxEntry.java) — Room entity for inbox entries
- [`android/app/src/main/java/com/snortstudios/masterflasher/db/GeneratedCard.java`](../android/app/src/main/java/com/snortstudios/masterflasher/db/GeneratedCard.java) — Room entity for flashcards with foreign key to entries
- [`android/app/src/main/java/com/snortstudios/masterflasher/db/InboxDao.java`](../android/app/src/main/java/com/snortstudios/masterflasher/db/InboxDao.java) — Data Access Object for database operations
- [`android/app/src/main/java/com/snortstudios/masterflasher/db/AppDatabase.java`](../android/app/src/main/java/com/snortstudios/masterflasher/db/AppDatabase.java) — Room database singleton

### Android/Java - Plugins
- [`android/app/src/main/java/com/snortstudios/masterflasher/plugins/InboxPlugin.java`](../android/app/src/main/java/com/snortstudios/masterflasher/plugins/InboxPlugin.java) — Capacitor plugin exposing database to JS
- [`android/app/src/main/java/com/snortstudios/masterflasher/plugins/ShareReceiverActivity.java`](../android/app/src/main/java/com/snortstudios/masterflasher/plugins/ShareReceiverActivity.java) — Transparent activity for silent share handling

### TypeScript
- [`src/plugins/Inbox.ts`](../src/plugins/Inbox.ts) — TypeScript interface for InboxPlugin

### React UI
- [`src/pages/InboxScreen.tsx`](../src/pages/InboxScreen.tsx) — Main screen showing inbox entries list
- [`src/pages/EntryDetailScreen.tsx`](../src/pages/EntryDetailScreen.tsx) — Card generation and review for a single entry

## How It Works

### Share Flow (Silent Background)
1. User shares text/URL from any Android app
2. `ShareReceiverActivity` receives the intent
3. Content is parsed (URL vs text detected)
4. Entry is saved to Room database with preview and timestamp
5. Toast notification: "Saved to inbox"
6. Activity finishes immediately — app never opens

### Card Generation Flow
1. User opens MasterFlasher → `InboxScreen` shows list of entries
2. User taps an entry → navigates to `EntryDetailScreen`
3. For URLs: User taps "Extract Content" → WebClipper extracts article text
4. User sets deck name
5. User taps "Generate Cards" → Gemini API generates facts → flashcards
6. Cards are saved to database, entry is locked
7. User reviews cards and can:
   - Add cards individually via the "Add" button on each card
   - Add all pending cards at once via the "Add All to Anki" button
8. When all cards are added, entry is automatically removed

### Delete Flow
- User swipes entry in inbox and taps delete
- Entry and all associated cards are cascade-deleted via Room foreign key

## Dependencies

### Android
- `androidx.room:room-runtime:2.6.1` — SQLite ORM for persistence
- Existing: Capacitor, AnkiDroid API, WebView

### TypeScript
- Existing: `@capacitor/core` for plugin registration
- Existing: Gemini API, Ionic React

## Usage

### From TypeScript

```typescript
import Inbox from './plugins/Inbox';
import type { InboxEntry, GeneratedCard } from './plugins/Inbox';

// Get all entries
const { entries } = await Inbox.getAllEntries();

// Get single entry with cards
const { entry, cards } = await Inbox.getEntry({ id: 'entry-id' });

// Save cards after generation
await Inbox.saveCards({ entryId: 'entry-id', cards: [...] });

// Update card status after adding to Anki
await Inbox.updateCardStatus({ cardId: 'card-id', status: 'added', noteId: 123 });

// Check and auto-remove if all cards added
const { removed } = await Inbox.checkAutoRemove({ entryId: 'entry-id' });

// Delete an entry (cascades to cards)
await Inbox.deleteEntry({ id: 'entry-id' });
```

## Database Schema

### inbox_entries
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| contentType | TEXT | "text" or "url" |
| content | TEXT | Raw shared content |
| preview | TEXT | Truncated for display |
| title | TEXT | Extracted title (nullable) |
| extractedText | TEXT | From WebClipper (nullable) |
| deckName | TEXT | User-specified deck name |
| isLocked | INTEGER | 1 after cards generated |
| createdAt | INTEGER | Unix timestamp |

### generated_cards
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT PK | UUID |
| entryId | TEXT FK | References inbox_entries(id) |
| front | TEXT | Card question |
| back | TEXT | Card answer |
| tags | TEXT | JSON array string |
| status | TEXT | "pending", "added", or "error" |
| noteId | INTEGER | AnkiDroid note ID (nullable) |

## Edge Cases

- **Entry deleted mid-generation**: Cards are cascade-deleted by Room foreign key
- **App killed mid-flow**: All state is persisted; user can resume on reopen
- **Locked entry**: Cannot regenerate cards; must delete and re-share to start over
- **All cards added**: Entry is auto-removed to keep inbox clean
- **API key not configured**: Prompted before generation; can configure in Settings

## Routing

```
/inbox          → InboxScreen (main, default)
/entry/:id      → EntryDetailScreen
/settings       → SettingsScreen
```
