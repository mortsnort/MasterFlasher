package com.snortstudios.masterflasher.db;

import androidx.annotation.NonNull;
import androidx.room.Entity;
import androidx.room.PrimaryKey;

/**
 * Room entity for storing app settings as key-value pairs.
 * 
 * Used for non-sensitive settings like custom prompts that don't require encryption.
 * 
 * Example keys:
 * - "fact_extraction_prompt" - Custom prompt for extracting facts from text
 * - "flashcard_creation_prompt" - Custom prompt for generating flashcards
 */
@Entity(tableName = "app_settings")
public class AppSetting {
    
    /**
     * Setting key (e.g., "fact_extraction_prompt")
     */
    @PrimaryKey
    @NonNull
    public String key;
    
    /**
     * Setting value (can be null to indicate deletion/reset to default)
     */
    public String value;
    
    /**
     * Default constructor required by Room
     */
    public AppSetting() {
        this.key = "";
    }
    
    /**
     * Convenience constructor for creating a setting
     */
    public AppSetting(@NonNull String key, String value) {
        this.key = key;
        this.value = value;
    }
}
