package com.garmenthub.garmenthub_mobile

import android.content.Intent
import android.os.Bundle
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine

class MainActivity : FlutterActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        GhShareLog.logIntent("MainActivity.onCreate BEFORE cache", intent)
        GarmentHubSharePlugin.cacheShareExtrasFromIntent(intent)
        super.onCreate(savedInstanceState)
        GhShareLog.logIntent("MainActivity.onCreate AFTER super", intent)
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        flutterEngine.plugins.add(GarmentHubSharePlugin())
    }

    override fun onNewIntent(intent: Intent) {
        GhShareLog.logIntent("MainActivity.onNewIntent BEFORE cache (param)", intent)
        GarmentHubSharePlugin.cacheShareExtrasFromIntent(intent)
        super.onNewIntent(intent)
        setIntent(intent)
        GhShareLog.logIntent("MainActivity.onNewIntent AFTER setIntent getIntent()", getIntent())
    }
}
