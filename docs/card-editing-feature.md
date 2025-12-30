# Card Editing Feature

## Purpose

Allows users to edit flashcard text (front/back) and change the deck name during the card review phase, before sending cards to AnkiDroid. This enables users to correct AI-generated content or customize cards to their preferences.

## Key Files

- [`src/pages/EntryDetailScreen.tsx`](../src/pages/EntryDetailScreen.tsx) — Main UI component with card editing and deck name editing
- [`src/plugins/Inbox.ts`](../src/plugins/Inbox.ts) — TypeScript plugin interface with `updateCardContent()` method
- [`android/app/src/main/java/com/snortstudios/masterflasher/plugins/InboxPlugin.java`](../android/app/src/main/java/com/snortstudios/masterflasher/plugins/InboxPlugin.java) — Native Android implementation of `updateCardContent()`

## How It Works

### Card Editing

1. In the `REVIEW_CARDS` state, each pending card displays an edit button (✏️)
2. Tapping the edit button enters edit mode for that specific card
3. Edit mode shows `IonTextarea` components for the question (front) and answer (back)
4. User can modify the text and either Save or Cancel
5. On Save, `Inbox.updateCardContent()` persists changes to the database
6. Local state is updated to reflect the changes immediately

### Deck Name Editing

1. In the review phase, the deck name chip has an edit button next to it
2. Tapping edit shows an inline input field with Save/Cancel buttons
3. User can modify the deck name and save
4. Changes are persisted via `Inbox.updateDeckName()` (existing method)

### State Management

New state variables in `EntryDetailScreen.tsx`:

```typescript
// Card editing state
const [editingCardIndex, setEditingCardIndex] = useState<number | null>(null);
const [editedFront, setEditedFront] = useState('');
const [editedBack, setEditedBack] = useState('');
const [isSavingCard, setIsSavingCard] = useState(false);

// Deck name editing state
const [isEditingDeckName, setIsEditingDeckName] = useState(false);
const [editedDeckName, setEditedDeckName] = useState('');
const [isSavingDeckName, setIsSavingDeckName] = useState(false);
```

### Key Functions

- `startEditCard(index)` — Enters edit mode for a specific card
- `saveCardEdit()` — Saves changes to database and updates local state
- `cancelCardEdit()` — Exits edit mode without saving
- `startEditDeckName()` — Enters deck name edit mode
- `saveDeckNameEdit()` — Saves deck name changes
- `cancelDeckNameEdit()` — Cancels deck name editing

## Dependencies

- Ionic React components: `IonTextarea`, `IonInput`, `IonButton`, `IonIcon`, `IonCard`
- Icons from ionicons: `createOutline`, `saveOutline`, `closeOutline`
- Existing `Inbox` plugin infrastructure
- Room database with `updateCard()` DAO method

## Usage

### Editing a Card

1. Generate cards from content
2. In the review phase, tap the edit button (✏️) on any pending card
3. Modify the question or answer text
4. Tap "Save" to persist changes or "Cancel" to discard

### Changing the Deck Name

1. In the review phase, tap the edit button next to the deck name chip
2. Enter the new deck name
3. Tap the save button (💾) to confirm or cancel (✕) to discard

## Edge Cases

- **Cannot edit added cards** — Edit button is hidden for cards with status `added`
- **Cannot edit while adding** — Edit buttons are disabled during `isAddingAll` operation
- **Empty content validation** — Cannot save a card with empty front or back
- **Single card edit at a time** — Only one card can be in edit mode; other cards are disabled
- **Default deck name** — If deck name is cleared, defaults to "MasterFlasher"

## API Reference

### `Inbox.updateCardContent()`

Updates the front and back text of a card.

```typescript
await Inbox.updateCardContent({
  cardId: string,   // The unique ID of the card
  front: string,    // New question text
  back: string      // New answer text
});
```

### Native Implementation

The native plugin method in `InboxPlugin.java`:

```java
@PluginMethod
public void updateCardContent(PluginCall call) {
    String cardId = call.getString("cardId");
    String front = call.getString("front");
    String back = call.getString("back");
    
    // Validates parameters, fetches card, updates fields, saves to database
}
```

## Visual Layout

### View Mode
```
┌──────────────────────────────────────────┐
│ Q: What is photosynthesis?               │
│ A: The process by which plants...        │
│ [tag1] [tag2]              [✏️] [Add ➕] │
└──────────────────────────────────────────┘
```

### Edit Mode
```
┌──────────────────────────────────────────┐
│ Editing Card 1                           │
│                                          │
│ Question:                                │
│ ┌──────────────────────────────────────┐ │
│ │ What is photosynthesis?              │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ Answer:                                  │
│ ┌──────────────────────────────────────┐ │
│ │ The process by which plants...       │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ [tag1] [tag2]                            │
│                       [Cancel] [💾 Save] │
└──────────────────────────────────────────┘
```

### Deck Name Editing
```
View Mode:  [📁 Biology 101] [✏️]
Edit Mode:  [__Biology 101____] [💾] [✕]
```
