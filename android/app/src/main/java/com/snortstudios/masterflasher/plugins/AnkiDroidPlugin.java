package com.snortstudios.masterflasher.plugins;

import android.content.Context;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.ichi2.anki.api.AddContentApi;

import java.util.Map;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.json.JSONException;

@CapacitorPlugin(
    name = "AnkiDroid",
    permissions = {
        @Permission(
            strings = { "com.ichi2.anki.permission.READ_WRITE_DATABASE" },
            alias = "anki"
        )
    }
)
public class AnkiDroidPlugin extends Plugin {

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject ret = new JSObject();
        try {
            AddContentApi api = new AddContentApi(getContext());
            ret.put("value", true);
        } catch (Exception e) {
             ret.put("value", false);
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void hasPermission(PluginCall call) {
        JSObject ret = new JSObject();
        if (getPermissionState("anki") == PermissionState.GRANTED) {
             ret.put("value", true);
        } else {
             ret.put("value", false);
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (getPermissionState("anki") != PermissionState.GRANTED) {
            requestPermissionForAlias("anki", call, "permissionCallback");
        } else {
            JSObject ret = new JSObject();
            ret.put("value", true);
            call.resolve(ret);
        }
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        JSObject ret = new JSObject();
        if (getPermissionState("anki") == PermissionState.GRANTED) {
            ret.put("value", true);
        } else {
            ret.put("value", false);
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void addBasicCard(PluginCall call) {
        String deckName = call.getString("deckName");
        String modelName = call.getString("modelKey", "com.snortstudios.masterflasher.basic"); 
        String front = call.getString("front");
        String back = call.getString("back");
        JSArray tagsArray = call.getArray("tags");
        
        if (deckName == null || front == null || back == null) {
            call.reject("Missing required fields");
            return;
        }

        Set<String> tags = new HashSet<>();
        if (tagsArray != null) {
            try {
                List<Object> list = tagsArray.toList();
                for (Object o : list) {
                    tags.add(o.toString());
                }
            } catch (JSONException e) {
                // Ignore bad tags
            }
        }

        try {
            AddContentApi api = new AddContentApi(getContext());
            
            // 1. Get or Create Deck
            Long deckId = getDeckId(api, deckName);
            if (deckId == null) {
                call.reject("Could not create or find deck: " + deckName);
                return;
            }

            // 2. Get or Create Model
            Long modelId = getModelId(api, modelName); 
            if (modelId == null) {
                 call.reject("Could not create or find model: " + modelName);
                 return;
            }

            // 3. Add Note
            Long noteId = api.addNote(modelId, deckId, new String[]{front, back}, tags);
            
            if (noteId != null) {
                JSObject ret = new JSObject();
                ret.put("noteId", noteId);
                call.resolve(ret);
            } else {
                call.reject("Failed to add note (null ID returned)");
            }
            
        } catch (Exception e) {
            e.printStackTrace();
            call.reject("Anki Error: " + e.getMessage());
        }
    }

    private Long getDeckId(AddContentApi api, String name) {
        Map<Long, String> deckList = api.getDeckList();
        if (deckList != null) {
            for (Map.Entry<Long, String> entry : deckList.entrySet()) {
                if (name.equals(entry.getValue())) {
                    return entry.getKey();
                }
            }
        }
        return api.addNewDeck(name);
    }

    private Long getModelId(AddContentApi api, String name) {
        Map<Long, String> modelList = api.getModelList();
        if (modelList != null) {
            for (Map.Entry<Long, String> entry : modelList.entrySet()) {
                if (name.equals(entry.getValue())) {
                    return entry.getKey();
                }
            }
        }
        return api.addNewBasicModel(name);
    }
}
