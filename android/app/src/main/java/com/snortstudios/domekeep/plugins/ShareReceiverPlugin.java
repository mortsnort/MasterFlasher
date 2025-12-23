package com.snortstudios.domekeep.plugins;

import android.app.Activity;
import android.content.Intent;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ShareReceiver")
public class ShareReceiverPlugin extends Plugin {

    @PluginMethod
    public void getSharedText(PluginCall call) {
        Activity activity = getActivity();
        Intent intent = activity.getIntent();
        String action = intent.getAction();
        String type = intent.getType();

        JSObject ret = new JSObject();

        if (Intent.ACTION_SEND.equals(action) && type != null) {
            if ("text/plain".equals(type)) {
                String sharedText = intent.getStringExtra(Intent.EXTRA_TEXT);
                if (sharedText != null) {
                    ret.put("value", sharedText);
                    
                    // Simple heuristic for URL vs Text
                    // Plan says: "If string matches /^https?:\/\//i -> { mode: "url", url }"
                    // We'll do a simple check.
                    if (sharedText.matches("(?i)^https?://.*")) {
                         ret.put("mode", "url");
                    } else {
                         ret.put("mode", "text");
                    }
                    
                    call.resolve(ret);
                    return;
                }
            }
        }
        
        // No share found
        ret.put("value", null);
        ret.put("mode", null);
        call.resolve(ret);
    }
}
