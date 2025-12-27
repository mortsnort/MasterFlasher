package com.snortstudios.masterflasher.db;

import androidx.annotation.NonNull;
import androidx.room.Entity;
import androidx.room.PrimaryKey;

/**
 * Room entity representing an inbox entry.
 * Each entry contains shared content (text, URL, or PDF) that can be processed into flashcards.
 */
@Entity(tableName = "inbox_entries")
public class InboxEntry {
    
    @PrimaryKey
    @NonNull
    public String id;
    
    /**
     * Content type: "text", "url", or "pdf"
     */
    public String contentType;
    
    /**
     * Raw shared content:
     * - For text: the actual text content
     * - For url: the URL string
     * - For pdf: Capacitor-compatible file URL (capacitor://localhost/_capacitor_file_/path/to/file.pdf)
     */
    public String content;
    
    /**
     * Truncated preview for display in list (first 100 chars or URL)
     */
    public String preview;
    
    /**
     * Extracted title (from WebClipper for URLs, original filename for PDFs, null for text)
     */
    public String title;
    
    /**
     * Extracted text content:
     * - For URLs: extracted via WebClipper
     * - For PDFs: extracted via pdf.js on the web layer
     * - For text: null (text entries use content directly)
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
     * Factory method to create a new entry from shared text or URL content
     */
    public static InboxEntry create(String id, String contentType, String content) {
        InboxEntry entry = new InboxEntry();
        entry.id = id;
        entry.contentType = contentType;
        entry.content = content;
        entry.preview = generatePreview(content, contentType, null);
        entry.isLocked = false;
        entry.createdAt = System.currentTimeMillis();
        return entry;
    }
    
    /**
     * Factory method to create a new entry from a shared PDF file
     *
     * @param id Unique entry ID
     * @param capacitorUrl Capacitor-compatible file URL for pdf.js access
     * @param originalFilename Original PDF filename for display
     */
    public static InboxEntry createPdf(String id, String capacitorUrl, String originalFilename) {
        InboxEntry entry = new InboxEntry();
        entry.id = id;
        entry.contentType = "pdf";
        entry.content = capacitorUrl;
        entry.preview = generatePreview(null, "pdf", originalFilename);
        entry.title = originalFilename;
        entry.isLocked = false;
        entry.createdAt = System.currentTimeMillis();
        return entry;
    }
    
    /**
     * Generate a preview string for display
     *
     * @param content The content (for text/url)
     * @param contentType The type: "text", "url", or "pdf"
     * @param filename Optional filename for PDF entries
     */
    private static String generatePreview(String content, String contentType, String filename) {
        if ("pdf".equals(contentType)) {
            // For PDFs, show "PDF: filename" preview
            String name = filename != null ? filename : "document.pdf";
            return "PDF: " + name;
        }
        
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
