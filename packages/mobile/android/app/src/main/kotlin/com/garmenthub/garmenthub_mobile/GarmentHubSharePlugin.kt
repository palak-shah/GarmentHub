package com.garmenthub.garmenthub_mobile

import android.app.Activity
import android.content.Context
import android.content.Intent
import io.flutter.embedding.engine.plugins.FlutterPlugin
import io.flutter.embedding.engine.plugins.activity.ActivityAware
import io.flutter.embedding.engine.plugins.activity.ActivityPluginBinding
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel

/**
 * Method channel [CHANNEL]: sync Android share shortcuts, read ACTION_SEND extras for product id.
 */
class GarmentHubSharePlugin : FlutterPlugin, MethodChannel.MethodCallHandler, ActivityAware {
    private lateinit var channel: MethodChannel
    private lateinit var appContext: Context
    private var activity: Activity? = null

    @Volatile
    private var pendingProductId: String? = null

    @Volatile
    private var pendingProductName: String? = null

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
            captureFromIntent(intent)
            false
        }
        captureFromIntent(binding.activity.intent)
    }

    override fun onDetachedFromActivityForConfigChanges() {
        activity = null
    }

    override fun onReattachedToActivityForConfigChanges(binding: ActivityPluginBinding) {
        activity = binding.activity
        binding.addOnNewIntentListener { intent ->
            captureFromIntent(intent)
            false
        }
        captureFromIntent(binding.activity.intent)
    }

    override fun onDetachedFromActivity() {
        activity = null
    }

    private fun captureFromIntent(intent: Intent?) {
        if (intent == null) return
        pendingProductId = intent.getStringExtra(EXTRA_PRODUCT_ID)
        pendingProductName = intent.getStringExtra(EXTRA_PRODUCT_NAME)
    }

    override fun onMethodCall(call: MethodCall, result: MethodChannel.Result) {
        when (call.method) {
            "syncShareTargets" -> {
                @Suppress("UNCHECKED_CAST")
                val raw = call.arguments as? List<Map<String, Any?>> ?: emptyList()
                val pairs = raw.mapNotNull { m ->
                    val id = m["id"]?.toString()?.trim().orEmpty()
                    val name = m["name"]?.toString()?.trim().orEmpty()
                    if (id.isEmpty()) null else id to name
                }
                ShareShortcutPublisher.sync(activity?.applicationContext ?: appContext, pairs)
                result.success(null)
            }
            "consumeShareProductExtra" -> {
                val id = pendingProductId
                val name = pendingProductName
                pendingProductId = null
                pendingProductName = null
                result.success(
                    mapOf(
                        "productId" to id,
                        "productName" to name,
                    ),
                )
            }
            "consumeIosShareHandoff" -> result.success(null)
            else -> result.notImplemented()
        }
    }

    companion object {
        const val CHANNEL = "com.garmenthub/share_targets"
        const val EXTRA_PRODUCT_ID = "com.garmenthub.garmenthub_mobile.EXTRA_PRODUCT_ID"
        const val EXTRA_PRODUCT_NAME = "com.garmenthub.garmenthub_mobile.EXTRA_PRODUCT_NAME"
    }
}
