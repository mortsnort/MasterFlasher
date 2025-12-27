package com.snortstudios.masterflasher.plugins;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.provider.OpenableColumns;
import android.widget.Toast;

import com.snortstudios.masterflasher.db.AppDatabase;
import com.snortstudios.masterflasher.db.InboxEntry;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Transparent activity that handles share intents silently.
 * Saves shared content to the inbox database, shows a toast, and closes immediately.
 * The main app never opens during this flow.
 *
 * Supported content types:
 * - text/plain: Text content or URLs
 * - application/pdf: PDF files (copied to app storage for pdf.js access)
 */
public class ShareReceiverActivity extends Activity {
    
    private static final ExecutorService executor = Executors.newSingleThreadExecutor();
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Process the incoming share intent
        handleIntent(getIntent());
        
        // Finish immediately - no UI shown
        finish();
    }
    
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleIntent(intent);
        finish();
    }
    
    private void handleIntent(Intent intent) {
        String action = intent.getAction();
        String type = intent.getType();
        
        if (Intent.ACTION_SEND.equals(action) && type != null) {
            if ("text/plain".equals(type)) {
                String sharedText = intent.getStringExtra(Intent.EXTRA_TEXT);
                if (sharedText != null && !sharedText.trim().isEmpty()) {
                    saveTextToInbox(sharedText.trim());
                } else {
                    showToast("Nothing to save");
                }
            } else if ("application/pdf".equals(type)) {
                Uri pdfUri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
                if (pdfUri != null) {
                    handlePdfShare(pdfUri);
                } else {
                    showToast("No PDF file received");
                }
            } else {
                showToast("Unsupported content type");
            }
        }
    }
    
    /**
     * Save text or URL content to inbox
     */
    private void saveTextToInbox(String content) {
        try {
            // Determine content type (URL or text)
            String contentType = isUrl(content) ? "url" : "text";
            
            // Create new inbox entry
            String id = UUID.randomUUID().toString();
            InboxEntry entry = InboxEntry.create(id, contentType, content);
            
            // Save to database
            AppDatabase.getInstance(this).inboxDao().insertEntry(entry);
            
            // Show success toast
            showToast("Saved to inbox");
            
        } catch (Exception e) {
            showToast("Failed to save: " + e.getMessage());
        }
    }
    
    /**
     * Handle PDF share by copying to app storage on background thread
     */
    private void handlePdfShare(Uri pdfUri) {
        // Get original filename for preview
        String originalFilename = getFileName(pdfUri);
        String displayName = originalFilename != null ? originalFilename : "document.pdf";
        
        // Show toast immediately
        showToast("Saving PDF to inbox...");
        
        // Copy file on background thread
        executor.execute(() -> {
            try {
                // Create pdfs directory if it doesn't exist
                File pdfsDir = new File(getFilesDir(), "pdfs");
                if (!pdfsDir.exists()) {
                    pdfsDir.mkdirs();
                }
                
                // Generate unique filename
                String uuid = UUID.randomUUID().toString();
                String filename = "pdf_" + uuid + ".pdf";
                File pdfFile = new File(pdfsDir, filename);
                
                // Copy PDF to app storage
                copyUriToFile(pdfUri, pdfFile);
                
                // Create Capacitor-compatible file URL
                // Format: capacitor://localhost/_capacitor_file_<absolute_path>
                String capacitorUrl = "capacitor://localhost/_capacitor_file_" + pdfFile.getAbsolutePath();
                
                // Create inbox entry
                String id = uuid;
                InboxEntry entry = InboxEntry.createPdf(id, capacitorUrl, displayName);
                
                // Save to database
                AppDatabase.getInstance(this).inboxDao().insertEntry(entry);
                
                // Show success toast on UI thread
                runOnUiThread(() -> showToast("PDF saved to inbox"));
                
            } catch (Exception e) {
                runOnUiThread(() -> showToast("Failed to save PDF: " + e.getMessage()));
            }
        });
    }
    
    /**
     * Copy content from URI to a file
     */
    private void copyUriToFile(Uri uri, File destFile) throws IOException {
        ContentResolver resolver = getContentResolver();
        try (InputStream inputStream = resolver.openInputStream(uri);
             OutputStream outputStream = new FileOutputStream(destFile)) {
            if (inputStream == null) {
                throw new IOException("Could not open input stream");
            }
            byte[] buffer = new byte[8192];
            int bytesRead;
            while ((bytesRead = inputStream.read(buffer)) != -1) {
                outputStream.write(buffer, 0, bytesRead);
            }
        }
    }
    
    /**
     * Get filename from URI using ContentResolver
     */
    private String getFileName(Uri uri) {
        String result = null;
        if ("content".equals(uri.getScheme())) {
            try (Cursor cursor = getContentResolver().query(uri, null, null, null, null)) {
                if (cursor != null && cursor.moveToFirst()) {
                    int nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                    if (nameIndex != -1) {
                        result = cursor.getString(nameIndex);
                    }
                }
            }
        }
        if (result == null) {
            result = uri.getLastPathSegment();
        }
        return result;
    }
    
    private boolean isUrl(String text) {
        return text.matches("(?i)^https?://.*");
    }
    
    private void showToast(String message) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show();
    }
}
