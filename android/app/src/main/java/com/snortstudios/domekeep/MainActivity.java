package com.snortstudios.domekeep;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.snortstudios.domekeep.plugins.AnkiDroidPlugin;
import com.snortstudios.domekeep.plugins.ShareReceiverPlugin;
import com.snortstudios.domekeep.plugins.WebClipperPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AnkiDroidPlugin.class);
        registerPlugin(ShareReceiverPlugin.class);
        registerPlugin(WebClipperPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
