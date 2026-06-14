package com.garmenthub.garmenthub_mobile

import android.content.Intent
import android.util.Log
import com.garmenthub.garmenthub_mobile.BuildConfig

/**
 * Temporary Logcat tracing for direct-share / shortcut extras (tag **GHShare**).
 * Gated by [BuildConfig.DEBUG] so release builds stay quiet unless you use a debug APK.
 */
object GhShareLog {
    const val TAG = "GHShare"

    fun logIntent(label: String, intent: Intent?) {
        if (!BuildConfig.DEBUG) return
        if (intent == null) {
            Log.d(TAG, "$label intent=null")
            return
        }
        val extras = intent.extras
        val keys = extras?.keySet()?.sorted()?.joinToString(",") ?: "(no extras bundle)"
        val pid = intent.getStringExtra(GarmentHubSharePlugin.EXTRA_PRODUCT_ID)
        val pname = intent.getStringExtra(GarmentHubSharePlugin.EXTRA_PRODUCT_NAME)
        val shortcutId = intent.getStringExtra(Intent.EXTRA_SHORTCUT_ID)
        Log.d(
            TAG,
            "$label action=${intent.action} type=${intent.type} component=${intent.component} extraKeys=$keys " +
                "EXTRA_PRODUCT_ID=${pid ?: "(null)"} EXTRA_PRODUCT_NAME=${pname ?: "(null)"} " +
                "EXTRA_SHORTCUT_ID=${shortcutId ?: "(null)"}",
        )
    }

    fun d(message: String) {
        if (BuildConfig.DEBUG) {
            Log.d(TAG, message)
        }
    }

    /**
     * One-line receive diagnostic: action, [Intent.getDataString], extra keys, and how listing id was resolved.
     */
    fun logShareReceive(
        intent: Intent?,
        resolvedSource: String,
        resolvedProductId: String?,
        resolvedProductName: String?,
    ) {
        if (!BuildConfig.DEBUG) return
        if (intent == null) {
            Log.d(TAG, "SHARE_RECEIVE intent=null resolvedSource=$resolvedSource")
            return
        }
        val action = intent.action ?: "(null)"
        val dataString = intent.dataString ?: "(null)"
        val extras = intent.extras
        val keys = extras?.keySet()?.sorted()?.joinToString(",") ?: "(no extras bundle)"
        val shortcutId = intent.getStringExtra(Intent.EXTRA_SHORTCUT_ID)
        Log.d(
            TAG,
            "SHARE_RECEIVE action=$action dataString=$dataString extraKeys=$keys " +
                "EXTRA_SHORTCUT_ID=${shortcutId ?: "(null)"} " +
                "resolvedSource=$resolvedSource productId=${resolvedProductId ?: "(null)"} " +
                "productName=${resolvedProductName ?: "(null)"}",
        )
    }
}
