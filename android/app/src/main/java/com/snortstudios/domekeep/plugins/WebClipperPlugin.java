package com.snortstudios.domekeep.plugins;

import android.content.Intent;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WebClipper")
public class WebClipperPlugin extends Plugin {

    @PluginMethod
    public void open(PluginCall call) {
        String url = call.getString("url");
        if (url == null) {
            call.reject("URL is required");
            return;
        }

        Intent intent = new Intent(getContext(), WebClipperActivity.class);
        intent.putExtra("url", url);

        startActivityForResult(call, intent, "handleClipperResult");
    }

    @ActivityCallback
    private void handleClipperResult(PluginCall call, ActivityResult result) {
        if (call == null) return;

        if (result.getResultCode() == android.app.Activity.RESULT_OK && result.getData() != null) {
            Intent data = result.getData();
            JSObject ret = new JSObject();
            ret.put("title", data.getStringExtra("title"));
            ret.put("text", data.getStringExtra("text"));
            ret.put("url", data.getStringExtra("url"));
            call.resolve(ret);
        } else {
            call.reject("Clipper cancelled or failed");
        }
    }
}
