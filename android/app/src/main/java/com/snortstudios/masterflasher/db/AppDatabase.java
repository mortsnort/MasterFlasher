package com.snortstudios.masterflasher.db;

import android.content.Context;

import androidx.annotation.NonNull;
import androidx.room.Database;
import androidx.room.Room;
import androidx.room.RoomDatabase;
import androidx.room.migration.Migration;
import androidx.sqlite.db.SupportSQLiteDatabase;

/**
 * Room database for MasterFlasher inbox entries, generated cards, and app settings.
 *
 * Uses singleton pattern to ensure only one database instance exists.
 *
 * Version History:
 * - v1: Initial schema with inbox_entries and generated_cards tables
 * - v2: Added app_settings table for custom prompts and other settings
 */
@Database(
    entities = {InboxEntry.class, GeneratedCard.class, AppSetting.class},
    version = 2,
    exportSchema = false
)
public abstract class AppDatabase extends RoomDatabase {
    
    private static final String DATABASE_NAME = "masterflasher_inbox.db";
    
    private static volatile AppDatabase INSTANCE;
    
    /**
     * Get the DAO for inbox operations
     */
    public abstract InboxDao inboxDao();
    
    /**
     * Migration from version 1 to 2: adds app_settings table
     */
    static final Migration MIGRATION_1_2 = new Migration(1, 2) {
        @Override
        public void migrate(@NonNull SupportSQLiteDatabase database) {
            database.execSQL(
                "CREATE TABLE IF NOT EXISTS app_settings (" +
                "key TEXT PRIMARY KEY NOT NULL, " +
                "value TEXT)"
            );
        }
    };
    
    /**
     * Get the singleton database instance
     */
    public static AppDatabase getInstance(Context context) {
        if (INSTANCE == null) {
            synchronized (AppDatabase.class) {
                if (INSTANCE == null) {
                    INSTANCE = Room.databaseBuilder(
                        context.getApplicationContext(),
                        AppDatabase.class,
                        DATABASE_NAME
                    )
                    // Allow queries on main thread for simplicity in Capacitor plugin
                    // In a production app, consider using background threads
                    .allowMainThreadQueries()
                    // Add migrations to preserve user data across schema changes
                    .addMigrations(MIGRATION_1_2)
                    .build();
                }
            }
        }
        return INSTANCE;
    }
    
    /**
     * Clear the singleton instance (useful for testing)
     */
    public static void destroyInstance() {
        INSTANCE = null;
    }
}
