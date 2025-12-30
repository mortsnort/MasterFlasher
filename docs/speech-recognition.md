# Speech Recognition Feature

## Purpose

Enables users to add text to their inbox by speaking instead of typing or sharing from other apps. This provides a convenient hands-free way to capture flashcard content directly within the MasterFlasher app.

## Key Files

- [`src/plugins/SpeechRecognition.ts`](../src/plugins/SpeechRecognition.ts) — TypeScript wrapper for the Capacitor speech recognition plugin
- [`src/hooks/useSpeechRecognition.ts`](../src/hooks/useSpeechRecognition.ts) — Custom React hook encapsulating speech recognition logic
- [`src/pages/InboxScreen.tsx`](../src/pages/InboxScreen.tsx) — Main inbox screen with FAB and speech modal
- [`android/app/src/main/AndroidManifest.xml`](../android/app/src/main/AndroidManifest.xml) — Contains RECORD_AUDIO permission

## How It Works

### User Flow

1. User taps the microphone FAB (floating action button) at the bottom-right of the inbox screen
2. A modal sheet appears and speech recognition starts automatically
3. As the user speaks, the transcript appears in real-time (partial results)
4. User can stop listening manually or let it complete automatically
5. The transcribed text can be edited before saving
6. Tapping "Save to Inbox" creates a new text entry in the inbox
7. Modal closes and inbox refreshes to show the new entry

### Technical Flow

```
FAB Click → Permission Check → Start Listening → Partial Results → Stop
                                                           ↓
                                        User edits transcript (optional)
                                                           ↓
                                    Save Entry → Refresh Inbox → Close Modal
```

### Components

#### SpeechRecognition Plugin Wrapper

The [`SpeechRecognition.ts`](../src/plugins/SpeechRecognition.ts:1) wrapper provides typed methods for:

- `available()` — Check if speech recognition is supported
- `checkPermissions()` / `requestPermissions()` — Permission management
- `start(options)` — Begin listening with configurable options
- `stop()` — End listening session
- `isListening()` — Check current listening state
- `addPartialResultsListener()` — Subscribe to real-time transcription updates

#### useSpeechRecognition Hook

The [`useSpeechRecognition`](../src/hooks/useSpeechRecognition.ts:53) hook manages:

- **State**: `isAvailable`, `isListening`, `transcript`, `error`, `permissionStatus`, `isInitializing`
- **Actions**: `startListening()`, `stopListening()`, `requestPermission()`, `reset()`

Example usage:

```typescript
const {
  isListening,
  transcript,
  error,
  startListening,
  stopListening,
} = useSpeechRecognition();

// Start listening
await startListening();

// transcript updates in real-time via partial results

// Stop when done
await stopListening();
```

#### InboxScreen Integration

The inbox screen adds:

1. **FAB Button** — Microphone icon at bottom-right (only shown if speech recognition is available)
2. **Modal Sheet** — Half-screen modal with:
   - Listening animation (pulsing microphone)
   - Stop button during listening
   - Editable textarea for transcript
   - Re-record and Save buttons
3. **Toast notifications** — For success/error feedback

## Dependencies

- `@capacitor-community/speech-recognition` — Capacitor plugin for speech-to-text
- `@capacitor/core` — For plugin listener handles

## Android Configuration

### Permission

The following permission is required in [`AndroidManifest.xml`](../android/app/src/main/AndroidManifest.xml:59):

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

### Runtime Permission

Permission is requested at runtime when the user first taps the microphone FAB. The hook handles:

1. Checking current permission status
2. Requesting permission if needed
3. Handling denial gracefully with user feedback

## Usage

### Adding Text via Speech

1. Open the MasterFlasher app
2. Tap the microphone button (blue FAB) in the bottom-right corner
3. Speak the text you want to add
4. Review and optionally edit the transcribed text
5. Tap "Save to Inbox"

### Permission Handling

- **First use**: Permission dialog appears automatically
- **If denied**: Toast message explains permission is needed
- **Re-requesting**: User must go to system settings to re-enable

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Speech recognition unavailable | FAB is hidden |
| Permission denied | Toast message shown, FAB still visible for retry |
| No speech detected | User can type manually in the textarea |
| Network unavailable | May fail on some Android devices (Google speech requires internet) |
| Long pauses in speech | Recognition may stop automatically |
| User cancels | Modal can be dismissed, no entry saved |

## Limitations

1. **Language**: Currently hardcoded to `en-US`. Future enhancement could add language selection.
2. **Offline**: Speech recognition on Android typically requires internet connectivity.
3. **Accuracy**: Depends on device microphone quality and ambient noise.
4. **Max duration**: Android may timeout on very long speech sessions.

## Testing

### On Physical Device

1. Build and deploy to an Android device
2. Grant microphone permission when prompted
3. Test various scenarios:
   - Normal speech input
   - Background noise
   - Accented speech
   - Long vs short phrases

### Emulator Limitations

Android emulators have limited microphone support. For best results, test on a physical device.

## Future Enhancements

- [ ] Language selection in settings
- [ ] Continuous listening mode for longer dictation
- [ ] Voice commands for navigation
- [ ] Offline speech recognition (with on-device models)
