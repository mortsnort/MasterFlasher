package com.snortstudios.masterflasher.db;

import android.content.Context;

import androidx.room.Database;
import androidx.room.Room;
import androidx.room.RoomDatabase;

/**
 * Room database for MasterFlasher inbox entries and generated cards.
 * 
 * Uses singleton pattern to ensure only one database instance exists.
 */
@Database(
    entities = {InboxEntry.class, GeneratedCard.class},
    version = 1,
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
