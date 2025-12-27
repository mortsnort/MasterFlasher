package com.snortstudios.masterflasher.plugins;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.snortstudios.masterflasher.db.AppDatabase;
import com.snortstudios.masterflasher.db.AppSetting;
import com.snortstudios.masterflasher.db.InboxDao;

/**
 * Capacitor plugin for app settings storage.
 * 
 * Provides key-value storage for non-sensitive settings like custom prompts.
 * Uses Room database for persistence, consistent with other app data.
 * 
 * Exposed methods:
 * - getSetting({ key: string }) -> { value: string | null }
 * - setSetting({ key: string, value: string }) -> void
 * - deleteSetting({ key: string }) -> void
 */
@CapacitorPlugin(name = "Settings")
public class SettingsPlugin extends Plugin {
    
    private InboxDao getDao() {
        return AppDatabase.getInstance(getContext()).inboxDao();
    }
    
    /**
     * Get a setting value by key
     * 
     * Params: { key: string }
     * Returns: { value: string | null }
     */
    @PluginMethod
    public void getSetting(PluginCall call) {
        String key = call.getString("key");
        if (key == null || key.isEmpty()) {
            call.reject("Missing required parameter: key");
            return;
        }
        
        try {
            AppSetting setting = getDao().getSetting(key);
            JSObject result = new JSObject();
            result.put("value", setting != null ? setting.value : null);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to get setting: " + e.getMessage(), e);
        }
    }
    
    /**
     * Set a setting value
     * 
     * Params: { key: string, value: string }
     */
    @PluginMethod
    public void setSetting(PluginCall call) {
        String key = call.getString("key");
        String value = call.getString("value");
        
        if (key == null || key.isEmpty()) {
            call.reject("Missing required parameter: key");
            return;
        }
        
        // value can be null or empty to clear a setting
        
        try {
            AppSetting setting = new AppSetting(key, value);
            getDao().setSetting(setting);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to set setting: " + e.getMessage(), e);
        }
    }
    
    /**
     * Delete a setting by key
     * 
     * Params: { key: string }
     */
    @PluginMethod
    public void deleteSetting(PluginCall call) {
        String key = call.getString("key");
        if (key == null || key.isEmpty()) {
            call.reject("Missing required parameter: key");
            return;
        }
        
        try {
            getDao().deleteSetting(key);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to delete setting: " + e.getMessage(), e);
        }
    }
}
