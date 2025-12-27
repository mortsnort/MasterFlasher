package com.snortstudios.masterflasher;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.snortstudios.masterflasher.plugins.AnkiDroidPlugin;
import com.snortstudios.masterflasher.plugins.InboxPlugin;
import com.snortstudios.masterflasher.plugins.ShareReceiverPlugin;
import com.snortstudios.masterflasher.plugins.WebClipperPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AnkiDroidPlugin.class);
        registerPlugin(InboxPlugin.class);
        registerPlugin(ShareReceiverPlugin.class);
        registerPlugin(WebClipperPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
