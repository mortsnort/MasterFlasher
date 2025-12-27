package com.snortstudios.masterflasher.db;

import androidx.room.Dao;
import androidx.room.Insert;
import androidx.room.OnConflictStrategy;
import androidx.room.Query;
import androidx.room.Update;

import java.util.List;

/**
 * Data Access Object for inbox entries and generated cards.
 */
@Dao
public interface InboxDao {
    
    // ==================== Entry Operations ====================
    
    /**
     * Get all inbox entries, sorted by creation date (newest first)
     */
    @Query("SELECT * FROM inbox_entries ORDER BY createdAt DESC")
    List<InboxEntry> getAllEntries();
    
    /**
     * Get a single entry by ID
     */
    @Query("SELECT * FROM inbox_entries WHERE id = :id")
    InboxEntry getEntry(String id);
    
    /**
     * Insert or replace an entry
     */
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void insertEntry(InboxEntry entry);
    
    /**
     * Update an existing entry
     */
    @Update
    void updateEntry(InboxEntry entry);
    
    /**
     * Delete an entry by ID (cascade deletes its cards)
     */
    @Query("DELETE FROM inbox_entries WHERE id = :id")
    void deleteEntry(String id);
    
    // ==================== Card Operations ====================
    
    /**
     * Get all cards for a specific entry
     */
    @Query("SELECT * FROM generated_cards WHERE entryId = :entryId")
    List<GeneratedCard> getCardsForEntry(String entryId);
    
    /**
     * Insert a single card
     */
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void insertCard(GeneratedCard card);
    
    /**
     * Insert multiple cards at once
     */
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void insertCards(List<GeneratedCard> cards);
    
    /**
     * Update an existing card
     */
    @Update
    void updateCard(GeneratedCard card);
    
    /**
     * Get a single card by ID
     */
    @Query("SELECT * FROM generated_cards WHERE id = :id")
    GeneratedCard getCard(String id);
    
    /**
     * Count cards that haven't been added to Anki yet for an entry
     */
    @Query("SELECT COUNT(*) FROM generated_cards WHERE entryId = :entryId AND status != 'added'")
    int getPendingCardCount(String entryId);
    
    /**
     * Count all cards for an entry
     */
    @Query("SELECT COUNT(*) FROM generated_cards WHERE entryId = :entryId")
    int getTotalCardCount(String entryId);
    
    /**
     * Delete all cards for an entry (used when regenerating)
     */
    @Query("DELETE FROM generated_cards WHERE entryId = :entryId")
    void deleteCardsForEntry(String entryId);
}
