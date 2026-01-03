# Camera OCR Feature

## Purpose

The Camera OCR feature allows users to capture text directly from physical documents (like books) using the device's camera. This text is then extracted using on-device Machine Learning (ML Kit) and passed to the existing flashcard generation pipeline. This streamlines the workflow for users studying from physical textbooks.

## Key Files

- `src/pages/InboxScreen.tsx`: UI integration (Camera FAB) and coordination of the OCR flow.
- `src/hooks/useCameraOCR.ts`: React hook managing the camera state, permissions, and plugin interaction.
- `src/plugins/CameraOCR.ts`: TypeScript definition for the Capacitor plugin bridge.
- `android/app/src/main/java/com/snortstudios/masterflasher/plugins/CameraOCRPlugin.java`: Capacitor plugin implementation handling permission requests and activity results.
- `android/app/src/main/java/com/snortstudios/masterflasher/plugins/CameraOCRActivity.java`: Native Android activity managing CameraX preview, image capture, UCrop integration, and ML Kit text recognition.
- `android/app/src/main/res/layout/activity_camera_ocr.xml`: Layout for the camera preview and controls.

## How It Works

1.  **Trigger**: User taps the Camera FAB on the `InboxScreen`.
2.  **Permission Check**: `useCameraOCR` checks for camera permissions via the plugin.
3.  **Native Activity**: `CameraOCRPlugin` launches `CameraOCRActivity`.
4.  **Capture**:
    -   `CameraOCRActivity` shows a live preview using CameraX.
    -   User captures a photo.
5.  **Crop**:
    -   The captured image is passed to `UCrop` (via `UCropActivity`) for manual cropping.
    -   This allows the user to isolate the specific paragraph or text block.
6.  **Extraction**:
    -   The cropped image is processed by Google ML Kit's Text Recognition API.
    -   Extracted text is returned to the plugin.
7.  **Result**:
    -   The text is returned to the React layer.
    -   `InboxScreen` opens a modal populated with the extracted text for final editing.
    -   User saves the text to the Inbox.

## Dependencies

-   **CameraX**: For camera preview and image capture (`androidx.camera:camera-*`).
-   **ML Kit Text Recognition**: For on-device OCR (`com.google.mlkit:text-recognition`).
-   **UCrop**: For image cropping UI (`com.github.yalantis:ucrop`).
-   **Capacitor**: For the native bridge mechanism.

## Usage

The feature is exposed via the `useCameraOCR` hook:

```typescript
const {
    isAvailable,      // true if running on native Android
    openCamera,       // Function to start the flow
    extractedText,    // Resulting text after successful capture/OCR
    error             // Any errors encountered
} = useCameraOCR();
```

In the UI, it logic is:
1.  Check `isAvailable` -> Show FAB.
2.  Call `openCamera()` on click.
3.  Watch `extractedText` -> When populated, open the edit modal.

## Edge Cases

-   **Permissions**: If camera permission is denied, a toast is shown. Gallery access requires separate permissions which are requested on-demand.
-   **No Text Found**: If ML Kit cannot find text in the image, an error is returned ("No text detected").
-   **Cancellation**: User can back out of the camera or crop screen; this is handled as a cancellation and does not create an inbox entry.
-   **Platform**: The feature is strictly Android-only (checked via `Capacitor.isNativePlatform()`). It will not appear on web/iOS builds.
