package com.snortstudios.masterflasher.plugins;

import android.annotation.SuppressLint;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.snortstudios.masterflasher.db.AppDatabase;
import com.snortstudios.masterflasher.db.GeneratedCard;
import com.snortstudios.masterflasher.db.InboxDao;
import com.snortstudios.masterflasher.db.InboxEntry;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Capacitor plugin for inbox database operations.
 * Exposes Room database operations to the Ionic/React UI.
 */
@CapacitorPlugin(name = "Inbox")
public class InboxPlugin extends Plugin {
    
    private InboxDao getDao() {
        return AppDatabase.getInstance(getContext()).inboxDao();
    }
    
    // ==================== Entry Operations ====================
    
    /**
     * Get all inbox entries
     * Returns: { entries: InboxEntry[] }
     */
    @PluginMethod
    public void getAllEntries(PluginCall call) {
        try {
            List<InboxEntry> entries = getDao().getAllEntries();
            JSArray entriesArray = new JSArray();
            
            for (InboxEntry entry : entries) {
                entriesArray.put(entryToJson(entry));
            }
            
            JSObject result = new JSObject();
            result.put("entries", entriesArray);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to get entries: " + e.getMessage(), e);
        }
    }
    
    /**
     * Get a single entry by ID with its cards
     * Params: { id: string }
     * Returns: { entry: InboxEntry, cards: GeneratedCard[] }
     */
    @PluginMethod
    public void getEntry(PluginCall call) {
        String id = call.getString("id");
        if (id == null) {
            call.reject("Missing required parameter: id");
            return;
        }
        
        try {
            InboxEntry entry = getDao().getEntry(id);
            if (entry == null) {
                call.reject("Entry not found: " + id);
                return;
            }
            
            List<GeneratedCard> cards = getDao().getCardsForEntry(id);
            JSArray cardsArray = new JSArray();
            for (GeneratedCard card : cards) {
                cardsArray.put(cardToJson(card));
            }
            
            JSObject result = new JSObject();
            result.put("entry", entryToJson(entry));
            result.put("cards", cardsArray);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to get entry: " + e.getMessage(), e);
        }
    }
    
    /**
     * Save (insert or update) an entry
     * Params: { entry: InboxEntry }
     */
    @PluginMethod
    public void saveEntry(PluginCall call) {
        JSObject entryObj = call.getObject("entry");
        if (entryObj == null) {
            call.reject("Missing required parameter: entry");
            return;
        }
        
        try {
            InboxEntry entry = jsonToEntry(entryObj);
            getDao().insertEntry(entry);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to save entry: " + e.getMessage(), e);
        }
    }
    
    /**
     * Delete an entry by ID (cascade deletes its cards)
     * For PDF entries, also deletes the PDF file from app storage
     * Params: { id: string }
     */
    @PluginMethod
    public void deleteEntry(PluginCall call) {
        String id = call.getString("id");
        if (id == null) {
            call.reject("Missing required parameter: id");
            return;
        }
        
        try {
            // Get entry first to check if it's a PDF that needs file cleanup
            InboxEntry entry = getDao().getEntry(id);
            if (entry != null && "pdf".equals(entry.contentType)) {
                deletePdfFile(entry.content);
            }
            
            getDao().deleteEntry(id);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to delete entry: " + e.getMessage(), e);
        }
    }
    
    // ==================== Card Operations ====================
    
    /**
     * Save generated cards for an entry
     * Params: { entryId: string, cards: GeneratedCard[] }
     */
    @PluginMethod
    public void saveCards(PluginCall call) {
        String entryId = call.getString("entryId");
        JSArray cardsArray = call.getArray("cards");
        
        if (entryId == null || cardsArray == null) {
            call.reject("Missing required parameters: entryId and cards");
            return;
        }
        
        try {
            List<GeneratedCard> cards = new ArrayList<>();
            for (int i = 0; i < cardsArray.length(); i++) {
                JSONObject cardObj = cardsArray.getJSONObject(i);
                GeneratedCard card = jsonToCard(cardObj, entryId);
                cards.add(card);
            }
            
            getDao().insertCards(cards);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to save cards: " + e.getMessage(), e);
        }
    }
    
    /**
     * Update a card's status (e.g., after adding to Anki)
     * Params: { cardId: string, status: string, noteId?: number }
     */
    @PluginMethod
    public void updateCardStatus(PluginCall call) {
        String cardId = call.getString("cardId");
        String status = call.getString("status");
        
        if (cardId == null || status == null) {
            call.reject("Missing required parameters: cardId and status");
            return;
        }
        
        try {
            GeneratedCard card = getDao().getCard(cardId);
            if (card == null) {
                call.reject("Card not found: " + cardId);
                return;
            }
            
            card.status = status;
            
            // noteId is optional
            Integer noteId = call.getInt("noteId");
            if (noteId != null) {
                card.noteId = noteId.longValue();
            }
            
            getDao().updateCard(card);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to update card status: " + e.getMessage(), e);
        }
    }
    
    /**
     * Update a card's content (front/back text)
     * Params: { cardId: string, front: string, back: string }
     */
    @PluginMethod
    public void updateCardContent(PluginCall call) {
        String cardId = call.getString("cardId");
        String front = call.getString("front");
        String back = call.getString("back");
        
        if (cardId == null || front == null || back == null) {
            call.reject("Missing required parameters: cardId, front, and back");
            return;
        }
        
        try {
            GeneratedCard card = getDao().getCard(cardId);
            if (card == null) {
                call.reject("Card not found: " + cardId);
                return;
            }
            
            card.front = front;
            card.back = back;
            
            getDao().updateCard(card);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to update card content: " + e.getMessage(), e);
        }
    }
    
    /**
     * Check if all cards for an entry have been added, and if so, auto-remove the entry
     * For PDF entries, also deletes the PDF file from app storage
     * Params: { entryId: string }
     * Returns: { removed: boolean }
     */
    @PluginMethod
    public void checkAutoRemove(PluginCall call) {
        String entryId = call.getString("entryId");
        if (entryId == null) {
            call.reject("Missing required parameter: entryId");
            return;
        }
        
        try {
            int totalCards = getDao().getTotalCardCount(entryId);
            int pendingCards = getDao().getPendingCardCount(entryId);
            
            JSObject result = new JSObject();
            
            // If there are cards and none are pending, remove the entry
            if (totalCards > 0 && pendingCards == 0) {
                // Get entry first to check if it's a PDF that needs file cleanup
                InboxEntry entry = getDao().getEntry(entryId);
                if (entry != null && "pdf".equals(entry.contentType)) {
                    deletePdfFile(entry.content);
                }
                
                getDao().deleteEntry(entryId);
                result.put("removed", true);
            } else {
                result.put("removed", false);
            }
            
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to check auto-remove: " + e.getMessage(), e);
        }
    }
    
    /**
     * Lock an entry after cards have been generated
     * Params: { entryId: string }
     */
    @PluginMethod
    public void lockEntry(PluginCall call) {
        String entryId = call.getString("entryId");
        if (entryId == null) {
            call.reject("Missing required parameter: entryId");
            return;
        }
        
        try {
            InboxEntry entry = getDao().getEntry(entryId);
            if (entry == null) {
                call.reject("Entry not found: " + entryId);
                return;
            }
            
            entry.isLocked = true;
            getDao().updateEntry(entry);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to lock entry: " + e.getMessage(), e);
        }
    }
    
    /**
     * Update entry with extracted content from WebClipper
     * Params: { entryId: string, title: string, extractedText: string }
     */
    @PluginMethod
    public void updateExtractedContent(PluginCall call) {
        String entryId = call.getString("entryId");
        String title = call.getString("title");
        String extractedText = call.getString("extractedText");
        
        if (entryId == null) {
            call.reject("Missing required parameter: entryId");
            return;
        }
        
        try {
            InboxEntry entry = getDao().getEntry(entryId);
            if (entry == null) {
                call.reject("Entry not found: " + entryId);
                return;
            }
            
            entry.title = title;
            entry.extractedText = extractedText;
            getDao().updateEntry(entry);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to update extracted content: " + e.getMessage(), e);
        }
    }
    
    /**
     * Update entry's deck name
     * Params: { entryId: string, deckName: string }
     */
    @PluginMethod
    public void updateDeckName(PluginCall call) {
        String entryId = call.getString("entryId");
        String deckName = call.getString("deckName");
        
        if (entryId == null || deckName == null) {
            call.reject("Missing required parameters: entryId and deckName");
            return;
        }
        
        try {
            InboxEntry entry = getDao().getEntry(entryId);
            if (entry == null) {
                call.reject("Entry not found: " + entryId);
                return;
            }
            
            entry.deckName = deckName;
            getDao().updateEntry(entry);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to update deck name: " + e.getMessage(), e);
        }
    }
    
    // ==================== Helper Methods ====================
    
    private JSObject entryToJson(InboxEntry entry) {
        JSObject obj = new JSObject();
        obj.put("id", entry.id);
        obj.put("contentType", entry.contentType);
        obj.put("content", entry.content);
        obj.put("preview", entry.preview);
        obj.put("title", entry.title);
        obj.put("extractedText", entry.extractedText);
        obj.put("deckName", entry.deckName);
        obj.put("isLocked", entry.isLocked);
        obj.put("createdAt", entry.createdAt);
        return obj;
    }
    
    @SuppressLint("DirectSystemCurrentTimeMillisUsage")
    private InboxEntry jsonToEntry(JSObject obj) {
        InboxEntry entry = new InboxEntry();
        entry.id = obj.getString("id", UUID.randomUUID().toString());
        entry.contentType = obj.getString("contentType", "text");
        entry.content = obj.getString("content", "");
        entry.preview = obj.getString("preview", "");
        entry.title = obj.getString("title");
        entry.extractedText = obj.getString("extractedText");
        entry.deckName = obj.getString("deckName");
        entry.isLocked = obj.getBoolean("isLocked", false);
        
        // Handle createdAt - use current time if not provided
        try {
            Long createdAt = obj.getLong("createdAt");
            entry.createdAt = createdAt != null ? createdAt : System.currentTimeMillis();
        } catch (Exception e) {
            entry.createdAt = System.currentTimeMillis();
        }
        
        return entry;
    }
    
    private JSObject cardToJson(GeneratedCard card) {
        JSObject obj = new JSObject();
        obj.put("id", card.id);
        obj.put("entryId", card.entryId);
        obj.put("front", card.front);
        obj.put("back", card.back);
        obj.put("status", card.status);
        
        // Parse tags from JSON string to array
        if (card.tags != null) {
            try {
                obj.put("tags", new JSArray(card.tags));
            } catch (JSONException e) {
                obj.put("tags", new JSArray());
            }
        } else {
            obj.put("tags", new JSArray());
        }
        
        if (card.noteId != null) {
            obj.put("noteId", card.noteId);
        }
        
        return obj;
    }
    
    private GeneratedCard jsonToCard(JSONObject obj, String entryId) throws JSONException {
        GeneratedCard card = new GeneratedCard();
        card.id = obj.optString("id", UUID.randomUUID().toString());
        card.entryId = entryId;
        card.front = obj.optString("front", "");
        card.back = obj.optString("back", "");
        card.status = obj.optString("status", "pending");
        
        // Convert tags array to JSON string
        if (obj.has("tags")) {
            JSONArray tagsArray = obj.optJSONArray("tags");
            if (tagsArray != null) {
                card.tags = tagsArray.toString();
            } else {
                card.tags = "[]";
            }
        } else {
            card.tags = "[]";
        }
        
        if (obj.has("noteId") && !obj.isNull("noteId")) {
            card.noteId = obj.getLong("noteId");
        }
        
        return card;
    }
    
    /**
     * Delete a PDF file from app storage given a Capacitor URL
     *
     * Capacitor URL format: capacitor://localhost/_capacitor_file_/data/.../.../pdfs/pdf_uuid.pdf
     * We need to extract the file path and delete it.
     *
     * @param capacitorUrl The Capacitor-compatible file URL stored in entry.content
     */
    private void deletePdfFile(String capacitorUrl) {
        if (capacitorUrl == null || capacitorUrl.isEmpty()) {
            return;
        }
        
        try {
            // Extract file path from Capacitor URL
            // Format: capacitor://localhost/_capacitor_file_<absolute_path>
            String prefix = "capacitor://localhost/_capacitor_file_";
            if (capacitorUrl.startsWith(prefix)) {
                String filePath = capacitorUrl.substring(prefix.length());
                File pdfFile = new File(filePath);
                if (pdfFile.exists()) {
                    boolean deleted = pdfFile.delete();
                    if (!deleted) {
                        android.util.Log.w("InboxPlugin", "Failed to delete PDF file: " + filePath);
                    }
                }
            }
        } catch (Exception e) {
            // Log but don't fail - file cleanup is best effort
            android.util.Log.e("InboxPlugin", "Error deleting PDF file: " + e.getMessage(), e);
        }
    }
}
