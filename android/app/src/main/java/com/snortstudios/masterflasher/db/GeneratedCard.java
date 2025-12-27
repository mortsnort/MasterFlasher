package com.snortstudios.masterflasher.db;

import androidx.annotation.NonNull;
import androidx.room.Entity;
import androidx.room.ForeignKey;
import androidx.room.Index;
import androidx.room.PrimaryKey;

/**
 * Room entity representing a generated flashcard.
 * Cards are linked to an InboxEntry and are cascade-deleted when the entry is deleted.
 */
@Entity(
    tableName = "generated_cards",
    foreignKeys = @ForeignKey(
        entity = InboxEntry.class,
        parentColumns = "id",
        childColumns = "entryId",
        onDelete = ForeignKey.CASCADE
    ),
    indices = @Index("entryId")
)
public class GeneratedCard {
    
    @PrimaryKey
    @NonNull
    public String id;
    
    /**
     * Foreign key to the parent InboxEntry
     */
    public String entryId;
    
    /**
     * Front of the flashcard (question/prompt)
     */
    public String front;
    
    /**
     * Back of the flashcard (answer)
     */
    public String back;
    
    /**
     * JSON array of tags as a string (e.g., '["tag1", "tag2"]')
     */
    public String tags;
    
    /**
     * Card status: "pending", "added", or "error"
     */
    public String status;
    
    /**
     * AnkiDroid note ID after successful add (null until added)
     */
    public Long noteId;
    
    public GeneratedCard() {
    }
    
    /**
     * Factory method to create a new card
     */
    public static GeneratedCard create(String id, String entryId, String front, String back, String tags) {
        GeneratedCard card = new GeneratedCard();
        card.id = id;
        card.entryId = entryId;
        card.front = front;
        card.back = back;
        card.tags = tags;
        card.status = "pending";
        card.noteId = null;
        return card;
    }
}
