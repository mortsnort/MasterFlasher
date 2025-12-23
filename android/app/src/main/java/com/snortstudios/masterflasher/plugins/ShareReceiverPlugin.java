package com.snortstudios.masterflasher.plugins;

import android.app.Activity;
import android.content.Intent;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ShareReceiver")
public class ShareReceiverPlugin extends Plugin {

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        processIntent(intent, true);
    }

    @PluginMethod
    public void getSharedText(PluginCall call) {
        Activity activity = getActivity();
        Intent intent = activity.getIntent();
        
        JSObject ret = processIntent(intent, false);
        call.resolve(ret);
    }

    private JSObject processIntent(Intent intent, boolean notifyListeners) {
        JSObject ret = new JSObject();
        String action = intent.getAction();
        String type = intent.getType();

        if (Intent.ACTION_SEND.equals(action) && type != null) {
            if ("text/plain".equals(type)) {
                String sharedText = intent.getStringExtra(Intent.EXTRA_TEXT);
                if (sharedText != null) {
                    ret.put("value", sharedText);
                    
                    if (sharedText.matches("(?i)^https?://.*")) {
                         ret.put("mode", "url");
                    } else {
                         ret.put("mode", "text");
                    }
                    
                    if (notifyListeners) {
                        notifyListeners("shareReceived", ret);
                    }
                    return ret;
                }
            }
        }
        
        ret.put("value", null);
        ret.put("mode", null);
        return ret;
    }
}
