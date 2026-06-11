package com.garmenthub.garmenthub_mobile

import android.app.Activity
import android.content.Intent
import android.os.Build
import android.util.Log
import io.flutter.embedding.engine.plugins.FlutterPlugin
import io.flutter.embedding.engine.plugins.activity.ActivityAware
import io.flutter.embedding.engine.plugins.activity.ActivityPluginBinding
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel

/**
 * [CHANNEL]: publish/clear Sharing Shortcuts; consume product extras from direct-share intents.
 */
class GarmentHubSharePlugin : FlutterPlugin, MethodChannel.MethodCallHandler, ActivityAware {
    private lateinit var channel: MethodChannel
    private lateinit var appContext: android.content.Context
    private var activity: Activity? = null

    @Volatile
    private var pendingProductId: String? = null

    @Volatile
    private var pendingProductName: String? = null

    @Volatile
    private var pendingShortcutId: String? = null

    override fun onAttachedToEngine(binding: FlutterPlugin.FlutterPluginBinding) {
        appContext = binding.applicationContext
        channel = MethodChannel(binding.binaryMessenger, CHANNEL)
        channel.setMethodCallHandler(this)
    }

    override fun onDetachedFromEngine(binding: FlutterPlugin.FlutterPluginBinding) {
        channel.setMethodCallHandler(null)
    }

    override fun onAttachedToActivity(binding: ActivityPluginBinding) {
        activity = binding.activity
        binding.addOnNewIntentListener { intent ->
            logIncomingShareIntent("onNewIntent", intent)
            captureFromIntent(intent)
            false
        }
        logIncomingShareIntent("onAttachedToActivity", binding.activity.intent)
        captureFromIntent(binding.activity.intent)
    }

    override fun onDetachedFromActivityForConfigChanges() {
        activity = null
    }

    override fun onReattachedToActivityForConfigChanges(binding: ActivityPluginBinding) {
        activity = binding.activity
        binding.addOnNewIntentListener { intent ->
            logIncomingShareIntent("onNewIntent(reconfig)", intent)
            captureFromIntent(intent)
            false
        }
        logIncomingShareIntent("onReattachedToActivity", binding.activity.intent)
        captureFromIntent(binding.activity.intent)
    }

    override fun onDetachedFromActivity() {
        activity = null
    }

    private fun logIncomingShareIntent(where: String, intent: Intent?) {
        if (intent == null) {
            Log.d(ShareTargetsConstants.TAG, "incomingShare[$where]: null intent")
            return
        }
        val action = intent.action
        val type = intent.type
        val stream = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            intent.getParcelableExtra(Intent.EXTRA_STREAM, android.net.Uri::class.java)
        } else {
            @Suppress("DEPRECATION")
            intent.getParcelableExtra<android.net.Uri>(Intent.EXTRA_STREAM)
        }
        val clip = intent.clipData?.description?.toString()
        val pid = intent.getStringExtra(ShareTargetsConstants.EXTRA_PRODUCT_ID)
        val pname = intent.getStringExtra(ShareTargetsConstants.EXTRA_PRODUCT_NAME)
        val shortcutId = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            intent.getStringExtra(Intent.EXTRA_SHORTCUT_ID)
        } else {
            null
        }
        val keys = intent.extras?.keySet()?.joinToString(",") ?: ""
        Log.i(
            ShareTargetsConstants.TAG,
            "incomingShare[$where]: action=$action type=$type stream=$stream clip=$clip productId=$pid productName=$pname shortcutId=$shortcutId extraKeys=[$keys]",
        )
    }

    private fun captureFromIntent(intent: Intent?) {
        if (intent == null) return
        pendingProductId = intent.getStringExtra(ShareTargetsConstants.EXTRA_PRODUCT_ID)
        pendingProductName = intent.getStringExtra(ShareTargetsConstants.EXTRA_PRODUCT_NAME)
        pendingShortcutId = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            intent.getStringExtra(Intent.EXTRA_SHORTCUT_ID)
        } else {
            null
        }
    }

    override fun onMethodCall(call: MethodCall, result: MethodChannel.Result) {
        when (call.method) {
            "publishRecentProducts" -> {
                val items = parseProducts(call.arguments)
                Log.i(ShareTargetsConstants.TAG, "publishRecentProducts: parsedCount=${items.size}")
                ShareShortcutPublisher.publish(activity?.applicationContext ?: appContext, items)
                result.success(null)
            }
            "clearPublishedProducts" -> {
                ShareShortcutPublisher.clear(activity?.applicationContext ?: appContext)
                result.success(null)
            }
            "consumeDirectShareExtras" -> {
                val id = pendingProductId
                val name = pendingProductName
                val sid = pendingShortcutId
                pendingProductId = null
                pendingProductName = null
                pendingShortcutId = null
                Log.i(
                    ShareTargetsConstants.TAG,
                    "consumeDirectShareExtras: productId=$id productName=$name shortcutId=$sid",
                )
                result.success(
                    mapOf(
                        "productId" to id,
                        "productName" to name,
                        "shortcutId" to sid,
                    ),
                )
            }
            "logLastShareIntent" -> {
                logIncomingShareIntent("method_logLastShareIntent", activity?.intent)
                result.success(null)
            }
            else -> result.notImplemented()
        }
    }

    private fun parseProducts(arguments: Any?): List<ShareProductInput> {
        val raw = arguments as? List<*> ?: return emptyList()
        val out = ArrayList<ShareProductInput>()
        for (e in raw) {
            if (e !is Map<*, *>) continue
            val m = e.entries.associate { it.key.toString() to it.value }
            val id = m["productId"]?.toString()?.trim().orEmpty()
            if (id.isEmpty()) continue
            val name = m["productName"]?.toString()?.trim().orEmpty()
            val thumb = m["thumbnailUrl"]?.toString()?.trim()?.takeIf { it.isNotEmpty() }
            val pinned = m["pinnedFlag"] == true
            val lastUsed = asLong(m["lastUsedTimestamp"])
            val useCount = asInt(m["useCount"])
            out.add(
                ShareProductInput(
                    productId = id,
                    productName = name,
                    thumbnailUrl = thumb,
                    pinned = pinned,
                    lastUsedTimestamp = lastUsed,
                    useCount = useCount,
                ),
            )
        }
        return out
    }

    private fun asLong(v: Any?): Long = when (v) {
        is Long -> v
        is Int -> v.toLong()
        is Double -> v.toLong()
        is String -> v.trim().toLongOrNull() ?: 0L
        else -> 0L
    }

    private fun asInt(v: Any?): Int = when (v) {
        is Int -> v
        is Long -> v.toInt()
        is Double -> v.toInt()
        is String -> v.trim().toIntOrNull() ?: 0
        else -> 0
    }

    companion object {
        const val CHANNEL = "com.garmenthub/direct_share"
    }
}
