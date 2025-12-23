package com.snortstudios.masterflasher.plugins;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.view.View;
import android.widget.Toast;
import com.snortstudios.masterflasher.R;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import org.json.JSONObject;

public class WebClipperActivity extends Activity {

    private WebView webView;
    private String readabilityJs;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_web_clipper);

        String url = getIntent().getStringExtra("url");
        webView = findViewById(R.id.webview);
        Button btnExtract = findViewById(R.id.btn_extract);

        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.setWebViewClient(new WebViewClient());
        
        // Load Readability from assets
        try {
            readabilityJs = loadReadability();
        } catch (Exception e) {
            e.printStackTrace();
            Toast.makeText(this, "Error loading Readability", Toast.LENGTH_LONG).show();
        }

        webView.loadUrl(url);

        btnExtract.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                attemptExtraction();
            }
        });
    }

    private String loadReadability() throws Exception {
         InputStream is = getAssets().open("Readability.js");
         BufferedReader reader = new BufferedReader(new InputStreamReader(is));
         StringBuilder sb = new StringBuilder();
         String line;
         while ((line = reader.readLine()) != null) {
             sb.append(line).append("\n");
         }
         return sb.toString();
    }

    private void attemptExtraction() {
        if (readabilityJs == null) return;
        
        String wrapper = 
            "javascript:(function() {" +
            "  try {" +
            readabilityJs +
            "    var documentClone = document.cloneNode(true);" + 
            "    var article = new Readability(documentClone).parse();" +
            "    return JSON.stringify(article);" +
            "  } catch(e) { return JSON.stringify({error: e.toString()}); }" +
            "})()";

        webView.evaluateJavascript(wrapper, value -> {
            // value is a JSON string, possibly quoted
            handleJsResult(value);
        });
    }

    private void handleJsResult(String jsonStr) {
        try {
            // evaluateJavascript returns the string "null" or "\"{\"title\"...}\"" (double encoded)
            if (jsonStr != null && jsonStr.startsWith("\"") && jsonStr.endsWith("\"")) {
                jsonStr = jsonStr.substring(1, jsonStr.length() - 1);
                // Unescape generic java string escapes if necessary, but usually handle complex unescape is needed
                // Basic unescape for quotes:
                jsonStr = jsonStr.replace("\\\"", "\"").replace("\\\\", "\\");
            }

            if ("null".equals(jsonStr) || jsonStr == null || jsonStr.isEmpty()) {
                 Toast.makeText(this, "Extraction failed (null)", Toast.LENGTH_SHORT).show();
                 return;
            }

            JSONObject json = new JSONObject(jsonStr);
            if (json.has("error")) {
                Toast.makeText(this, "Extraction error: " + json.getString("error"), Toast.LENGTH_LONG).show();
                return;
            }

            Intent result = new Intent();
            result.putExtra("title", json.optString("title", "No Title"));
            result.putExtra("text", json.optString("textContent", "")); // Readability returns content (HTML) and textContent
            if (result.getStringExtra("text").isEmpty()) {
                 // Fallback to content or raw
                  result.putExtra("text", json.optString("content", "")); 
            }
            // Truncate if too long (Native side safety)
            String text = result.getStringExtra("text");
            if (text != null && text.length() > 25000) {
                text = text.substring(0, 25000);
                result.putExtra("text", text);
            }
            
            result.putExtra("url", webView.getUrl());
            
            setResult(RESULT_OK, result);
            finish();

        } catch (Exception e) {
            e.printStackTrace();
            Toast.makeText(this, "Result parsing error", Toast.LENGTH_SHORT).show();
        }
    }
}
