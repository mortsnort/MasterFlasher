package com.snortstudios.masterflasher;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.snortstudios.masterflasher.plugins.AnkiDroidPlugin;
import com.snortstudios.masterflasher.plugins.InboxPlugin;
import com.snortstudios.masterflasher.plugins.SettingsPlugin;
import com.snortstudios.masterflasher.plugins.ShareReceiverPlugin;
import com.snortstudios.masterflasher.plugins.WebClipperPlugin;
import com.snortstudios.masterflasher.plugins.CameraOCRPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AnkiDroidPlugin.class);
        registerPlugin(InboxPlugin.class);
        registerPlugin(SettingsPlugin.class);
        registerPlugin(ShareReceiverPlugin.class);
        registerPlugin(WebClipperPlugin.class);
        registerPlugin(CameraOCRPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
