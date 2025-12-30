# Card Editing Feature Plan

## Purpose

Allow users to edit flashcard text (front/back) and change the deck name during the card review phase, before sending cards to AnkiDroid.

## Current State

### Card Review Phase (in `REVIEW_CARDS` state)
- Cards are displayed as read-only items with Q: (question) and A: (answer)
- Deck name is shown as a non-editable chip
- Users can only add cards to Anki or delete the entire entry
- No way to modify card content or deck name after generation

### Architecture
- **Frontend**: React/Ionic UI in [`src/pages/EntryDetailScreen.tsx`](../src/pages/EntryDetailScreen.tsx)
- **Plugin Interface**: TypeScript definitions in [`src/plugins/Inbox.ts`](../src/plugins/Inbox.ts)
- **Native Plugin**: Java implementation in [`android/app/src/main/java/com/snortstudios/masterflasher/plugins/InboxPlugin.java`](../android/app/src/main/java/com/snortstudios/masterflasher/plugins/InboxPlugin.java)
- **DAO**: Room database in [`android/app/src/main/java/com/snortstudios/masterflasher/db/InboxDao.java`](../android/app/src/main/java/com/snortstudios/masterflasher/db/InboxDao.java)

### Existing Methods
- `updateCardStatus()` - Updates status and noteId only
- `updateDeckName()` - Already exists for entry deck name
- `updateCard()` in DAO - Can update any card field (including front/back)

## Proposed Solution

### 1. Add `updateCardContent` Plugin Method

Add a new method to update card front/back content:

```typescript
// In src/plugins/Inbox.ts
updateCardContent(options: { 
  cardId: string; 
  front: string; 
  back: string 
}): Promise<void>;
```

### 2. UI Design for Card Editing

Replace read-only card display with an editable card component:

```
┌─────────────────────────────────────────┐
│ Card 1                            [✏️]  │
├─────────────────────────────────────────┤
│ Q: What is photosynthesis?              │
│ A: The process by which plants...       │
│ [tag1] [tag2]                           │
│                              [Add] [🗑️] │
└─────────────────────────────────────────┘

When edit button clicked:
┌─────────────────────────────────────────┐
│ Card 1 (Editing)                        │
├─────────────────────────────────────────┤
│ Question:                               │
│ ┌─────────────────────────────────────┐ │
│ │ What is photosynthesis?             │ │
│ └─────────────────────────────────────┘ │
│ Answer:                                 │
│ ┌─────────────────────────────────────┐ │
│ │ The process by which plants...      │ │
│ └─────────────────────────────────────┘ │
│                       [Cancel] [Save]   │
└─────────────────────────────────────────┘
```

### 3. Deck Name Editing in Review Phase

Add an editable deck name input in the review cards header:

```
┌─────────────────────────────────────────┐
│ Review Cards                            │
├─────────────────────────────────────────┤
│ 3 / 10 cards added                      │
│                                         │
│ Deck Name:                              │
│ ┌─────────────────────────────────────┐ │
│ │ MasterFlasher                    ✏️ │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [Add All to Anki]                       │
└─────────────────────────────────────────┘
```

## Implementation Details

### File Changes

#### 1. `src/plugins/Inbox.ts`
- Add `updateCardContent()` method to interface

#### 2. `android/.../plugins/InboxPlugin.java`
- Add `updateCardContent()` plugin method that uses existing DAO `updateCard()`

#### 3. `src/pages/EntryDetailScreen.tsx`
- Add `editingCardIndex` state to track which card is being edited
- Add `editedFront` and `editedBack` state for temporary edit values
- Replace `IonItem` card display with editable `IonCard` component
- Add edit/save/cancel handlers
- Make deck name editable with inline input
- Add visual indicators for edited but unsaved cards

### State Management

```typescript
// New state variables
const [editingCardIndex, setEditingCardIndex] = useState<number | null>(null);
const [editedFront, setEditedFront] = useState('');
const [editedBack, setEditedBack] = useState('');
const [editingDeckName, setEditingDeckName] = useState(false);
const [editedDeckName, setEditedDeckName] = useState('');
```

### Key Functions

```typescript
// Start editing a card
const startEditCard = (index: number) => {
  setEditingCardIndex(index);
  setEditedFront(cards[index].front);
  setEditedBack(cards[index].back);
};

// Save card edits
const saveCardEdit = async () => {
  if (editingCardIndex === null) return;
  const card = cards[editingCardIndex];
  
  await Inbox.updateCardContent({
    cardId: card.id,
    front: editedFront,
    back: editedBack
  });
  
  // Update local state
  const updated = [...cards];
  updated[editingCardIndex] = {
    ...updated[editingCardIndex],
    front: editedFront,
    back: editedBack
  };
  setCards(updated);
  setEditingCardIndex(null);
};

// Cancel card edit
const cancelCardEdit = () => {
  setEditingCardIndex(null);
  setEditedFront('');
  setEditedBack('');
};

// Save deck name edit
const saveDeckName = async () => {
  if (!entry) return;
  await Inbox.updateDeckName({ 
    entryId: entry.id, 
    deckName: editedDeckName 
  });
  setEntry({ ...entry, deckName: editedDeckName });
  setEditingDeckName(false);
};
```

## User Flow

1. User generates cards from content
2. In review phase, user sees all cards listed
3. User taps edit icon on a card to enter edit mode
4. User modifies front/back text in text areas
5. User taps Save to persist changes or Cancel to discard
6. User can change deck name by tapping edit icon next to deck name
7. Edited cards are saved to database immediately
8. When adding to Anki, the edited text is used

## Edge Cases

1. **Editing while adding** - Disable edit button while card is being added to Anki
2. **Already added cards** - Disable edit for cards that have been added (status: added)
3. **Empty content** - Validate that front/back are not empty before saving
4. **Long text** - Use expandable text areas that grow with content
5. **Network/DB errors** - Show error toast and keep edit mode open for retry

## Testing Checklist

- [ ] Can tap edit button to enter edit mode for a card
- [ ] Front and back text are pre-populated correctly
- [ ] Can modify both front and back text
- [ ] Save persists changes to database
- [ ] Cancel discards changes
- [ ] Cannot edit cards that are already added
- [ ] Cannot edit while card is being added
- [ ] Deck name can be changed in review phase
- [ ] Changes persist after navigating away and back
- [ ] Edited content is sent correctly to AnkiDroid

## Visual Mockup - Card Edit Mode

```
┌──────────────────────────────────────────────────────┐
│ Review Cards                                          │
├──────────────────────────────────────────────────────┤
│ 0 / 3 cards added                                    │
│                                                      │
│ Deck Name:                                           │
│ ┌────────────────────────────────────────────┐       │
│ │ Biology 101                            [💾]│       │
│ └────────────────────────────────────────────┘       │
│                                                      │
│ [Add All to Anki]                                    │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ Card 1                                         [✏️]  │
├──────────────────────────────────────────────────────┤
│ Q: What is the powerhouse of the cell?              │
│ A: The mitochondria                                 │
│ [biology] [cells]                           [Add ➕] │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ Card 2 (Editing)                                     │
├──────────────────────────────────────────────────────┤
│ Question:                                            │
│ ┌────────────────────────────────────────────────┐   │
│ │ What organelle contains DNA besides the        │   │
│ │ nucleus?                                       │   │
│ └────────────────────────────────────────────────┘   │
│                                                      │
│ Answer:                                              │
│ ┌────────────────────────────────────────────────┐   │
│ │ Mitochondria and chloroplasts both contain     │   │
│ │ their own DNA                                  │   │
│ └────────────────────────────────────────────────┘   │
│                                                      │
│                              [Cancel] [Save 💾]      │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ Card 3                                  ✓ Added      │
├──────────────────────────────────────────────────────┤
│ Q: What is ATP?                                      │
│ A: Adenosine triphosphate, the energy currency...   │
│ [biology] [energy]                                   │
└──────────────────────────────────────────────────────┘
```

## Dependencies

- Ionic React components: IonCard, IonTextarea, IonInput, IonButton, IonIcon
- Existing Inbox plugin infrastructure
- Room database with existing updateCard() DAO method
