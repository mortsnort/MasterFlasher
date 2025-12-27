package com.snortstudios.masterflasher.db;

import androidx.annotation.NonNull;
import androidx.room.Entity;
import androidx.room.PrimaryKey;

/**
 * Room entity representing an inbox entry.
 * Each entry contains shared content (text or URL) that can be processed into flashcards.
 */
@Entity(tableName = "inbox_entries")
public class InboxEntry {
    
    @PrimaryKey
    @NonNull
    public String id;
    
    /**
     * Content type: "text" or "url"
     */
    public String contentType;
    
    /**
     * Raw shared content (the original text or URL)
     */
    public String content;
    
    /**
     * Truncated preview for display in list (first 100 chars or URL)
     */
    public String preview;
    
    /**
     * Extracted title (from WebClipper for URLs, null for text)
     */
    public String title;
    
    /**
     * Extracted text content (from WebClipper for URLs, null for text entries)
     */
    public String extractedText;
    
    /**
     * User-specified deck name for cards generated from this entry
     */
    public String deckName;
    
    /**
     * Whether cards have been generated for this entry.
     * Once locked, cards cannot be regenerated.
     */
    public boolean isLocked;
    
    /**
     * Timestamp when the entry was created (System.currentTimeMillis())
     */
    public long createdAt;
    
    public InboxEntry() {
    }
    
    /**
     * Factory method to create a new entry from shared content
     */
    public static InboxEntry create(String id, String contentType, String content) {
        InboxEntry entry = new InboxEntry();
        entry.id = id;
        entry.contentType = contentType;
        entry.content = content;
        entry.preview = generatePreview(content, contentType);
        entry.isLocked = false;
        entry.createdAt = System.currentTimeMillis();
        return entry;
    }
    
    /**
     * Generate a preview string for display
     */
    private static String generatePreview(String content, String contentType) {
        if (content == null) return "";
        
        if ("url".equals(contentType)) {
            // For URLs, show the full URL (up to reasonable length)
            return content.length() > 100 ? content.substring(0, 100) + "..." : content;
        } else {
            // For text, show first 100 characters
            String trimmed = content.trim();
            if (trimmed.length() > 100) {
                return trimmed.substring(0, 100) + "...";
            }
            return trimmed;
        }
    }
}
