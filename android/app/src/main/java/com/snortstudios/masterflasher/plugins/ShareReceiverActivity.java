package com.snortstudios.masterflasher.plugins;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.widget.Toast;

import com.snortstudios.masterflasher.db.AppDatabase;
import com.snortstudios.masterflasher.db.InboxEntry;

import java.util.UUID;

/**
 * Transparent activity that handles share intents silently.
 * Saves shared content to the inbox database, shows a toast, and closes immediately.
 * The main app never opens during this flow.
 */
public class ShareReceiverActivity extends Activity {
    
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
                    saveToInbox(sharedText.trim());
                } else {
                    showToast("Nothing to save");
                }
            } else {
                showToast("Unsupported content type");
            }
        }
    }
    
    private void saveToInbox(String content) {
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
    
    private boolean isUrl(String text) {
        return text.matches("(?i)^https?://.*");
    }
    
    private void showToast(String message) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show();
    }
}
