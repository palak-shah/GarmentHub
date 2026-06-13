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
        GhShareLog.logIntent("GarmentHubSharePlugin.captureFromIntent", intent)
        if (intent == null) return
        val resolved = resolveListingFromIntentWithCache(intent)
        pendingProductId = resolved.productId
        pendingProductName = resolved.productName
        GhShareLog.logShareReceive(intent, resolved.source, resolved.productId, resolved.productName)
        GhShareLog.d(
            "captureFromIntent → pendingProductId=${pendingProductId ?: "(null)"} pendingProductName=${pendingProductName ?: "(null)"}",
        )
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
            "peekShareProductExtra" -> {
                GhShareLog.logIntent("peekShareProductExtra BEFORE capture activity.intent", activity?.intent)
                val peekResolved = resolveListingFromIntentWithCache(activity?.intent)
                GhShareLog.d(
                    "peekShareProductExtra activity.intent resolvedSource=${peekResolved.source} " +
                        "id=${peekResolved.productId ?: "(null)"}",
                )
                activity?.intent?.let { captureFromIntent(it) }
                val id = pendingProductId ?: cachedShareProductId
                val name = pendingProductName ?: cachedShareProductName
                GhShareLog.d(
                    "peekShareProductExtra → pendingId=${pendingProductId ?: "(null)"} pendingName=${pendingProductName ?: "(null)"} " +
                        "cachedId=${cachedShareProductId ?: "(null)"} cachedName=${cachedShareProductName ?: "(null)"} " +
                        "returnId=${id ?: "(null)"} returnName=${name ?: "(null)"}",
                )
                val diagIntent = activity?.intent
                val diagResolved = resolveListingFromIntentWithCache(diagIntent)
                val dataPreview = diagIntent?.dataString?.take(200)
                result.success(
                    mapOf(
                        "productId" to id,
                        "productName" to name,
                        "resolvedSource" to diagResolved.source,
                        "intentDataPreview" to dataPreview,
                    ),
                )
            }
            "consumeShareProductExtra" -> {
                GhShareLog.logIntent("consumeShareProductExtra BEFORE capture activity.intent", activity?.intent)
                // Re-sync from the live activity intent so extras aren't missed vs Flutter init order.
                activity?.intent?.let { captureFromIntent(it) }
                val id = pendingProductId ?: cachedShareProductId
                val name = pendingProductName ?: cachedShareProductName
                GhShareLog.d(
                    "consumeShareProductExtra returning id=${id ?: "(null)"} name=${name ?: "(null)"} then clearing pending+cache",
                )
                val diagIntent = activity?.intent
                val diagResolved = resolveListingFromIntentWithCache(diagIntent)
                val dataPreview = diagIntent?.dataString?.take(200)
                pendingProductId = null
                pendingProductName = null
                cachedShareProductId = null
                cachedShareProductName = null
                result.success(
                    mapOf(
                        "productId" to id,
                        "productName" to name,
                        "resolvedSource" to diagResolved.source,
                        "intentDataPreview" to dataPreview,
                    ),
                )
            }
            "consumeIosShareHandoff" -> result.success(null)
            "getMaxShareTargets" -> {
                result.success(ShareShortcutPublisher.maxShortcutsForDevice(appContext))
            }
            else -> result.notImplemented()
        }
    }

    companion object {
        const val CHANNEL = "com.garmenthub/share_targets"
        const val EXTRA_PRODUCT_ID = "com.garmenthub.garmenthub_mobile.EXTRA_PRODUCT_ID"
        const val EXTRA_PRODUCT_NAME = "com.garmenthub.garmenthub_mobile.EXTRA_PRODUCT_NAME"
        /** Must match `<category>` in `res/xml/gh_share_targets.xml` for Sharing Shortcuts. */
        const val SHARE_TARGET_CATEGORY = "com.garmenthub.garmenthub_mobile.category.IMAGE_SHARE_TARGET"

        /**
         * Primary URI transport for shortcuts: `garmenthub://share/product/{productId}?productName=`.
         * Must match manifest `<data>` scheme/host/pathPrefix.
         */
        const val SHARE_PRODUCT_URI_SCHEME = "garmenthub"
        const val SHARE_PRODUCT_URI_HOST = "share"

        /**
         * Legacy listing URI (older shortcuts); still parsed for backward compatibility.
         * Query: `productId`, `productName`.
         */
        const val SHARE_LISTING_URI_SCHEME = "garmenthub-share"
        const val SHARE_LISTING_URI_HOST = "direct-listing"

        /** Survives intent mutation before Flutter reads extras (e.g. receive_sharing_intent). */
        @Volatile
        private var cachedShareProductId: String? = null

        @Volatile
        private var cachedShareProductName: String? = null

        /**
         * Intent-only: [EXTRA_PRODUCT_ID], then `garmenthub://share/product/{id}`, then legacy `garmenthub-share` query URI.
         * Source is `extras`, `uri`, or `none` (never `cache` — use [resolveListingFromIntentWithCache] for full order).
         */
        private fun parseListingFromIntent(intent: Intent?): ResolvedShareListing {
            if (intent == null) return ResolvedShareListing(null, null, "none")
            val extraId = intent.getStringExtra(EXTRA_PRODUCT_ID)?.trim().orEmpty()
            val extraName = intent.getStringExtra(EXTRA_PRODUCT_NAME)
            if (extraId.isNotEmpty()) {
                return ResolvedShareListing(extraId, extraName, "extras")
            }
            val uri = intent.data ?: return ResolvedShareListing(null, null, "none")

            if (SHARE_PRODUCT_URI_SCHEME == uri.scheme && SHARE_PRODUCT_URI_HOST == uri.host) {
                val segments = uri.pathSegments
                val p = segments.indexOf("product")
                if (p >= 0 && p + 1 < segments.size) {
                    val pathId = segments[p + 1].trim()
                    if (pathId.isNotEmpty()) {
                        val qName = uri.getQueryParameter("productName")
                        return ResolvedShareListing(pathId, qName, "uri")
                    }
                }
            }

            if (SHARE_LISTING_URI_SCHEME == uri.scheme && SHARE_LISTING_URI_HOST == uri.host) {
                val qId = uri.getQueryParameter("productId")?.trim().orEmpty()
                val qName = uri.getQueryParameter("productName")
                if (qId.isNotEmpty()) {
                    return ResolvedShareListing(qId, qName, "uri")
                }
            }

            return ResolvedShareListing(null, null, "none")
        }

        /**
         * Full resolution order: extras, URI (new or legacy), then [cachedShareProductId].
         * Log source: `extras`, `uri`, `cache`, or `none`.
         */
        private fun resolveListingFromIntentWithCache(intent: Intent?): ResolvedShareListing {
            val fromIntent = parseListingFromIntent(intent)
            val id = fromIntent.productId?.trim().orEmpty()
            if (id.isNotEmpty()) return fromIntent
            val cId = cachedShareProductId?.trim().orEmpty()
            if (cId.isNotEmpty()) {
                return ResolvedShareListing(cachedShareProductId, cachedShareProductName, "cache")
            }
            return ResolvedShareListing(null, null, "none")
        }

        /**
         * Call from [MainActivity] as early as possible (before [super.onCreate] / [super.onNewIntent])
         * so listing extras are preserved if the embedding replaces the activity intent.
         */
        @JvmStatic
        fun cacheShareExtrasFromIntent(intent: Intent?) {
            if (intent == null) {
                GhShareLog.d("cacheShareExtrasFromIntent intent=null → skip")
                return
            }
            val action = intent.action ?: run {
                GhShareLog.d("cacheShareExtrasFromIntent action=null → skip")
                return
            }
            if (action != Intent.ACTION_SEND && action != Intent.ACTION_SEND_MULTIPLE) {
                GhShareLog.d("cacheShareExtrasFromIntent action=$action not SEND → skip")
                return
            }
            val fromIntent = parseListingFromIntent(intent)
            GhShareLog.logShareReceive(intent, fromIntent.source, fromIntent.productId, fromIntent.productName)
            GhShareLog.logIntent("cacheShareExtrasFromIntent candidate", intent)
            val type = intent.type
            val hasImageType = type?.startsWith("image/") == true
            val pid = fromIntent.productId?.trim().orEmpty()
            val pname = fromIntent.productName
            GhShareLog.d(
                "cacheShareExtrasFromIntent hasImageType=$hasImageType resolvedSource=${fromIntent.source} pidLen=${pid.length}",
            )
            if (!hasImageType && pid.isEmpty()) {
                GhShareLog.d("cacheShareExtrasFromIntent → SKIP (not image type and no listing id from extras/uri)")
                return
            }
            if (pid.isNotEmpty()) {
                cachedShareProductId = pid
                cachedShareProductName = pname
                GhShareLog.d(
                    "cacheShareExtrasFromIntent → CACHED cachedShareProductId=$pid cachedShareProductName=${pname ?: "(null)"}",
                )
            } else {
                GhShareLog.d("cacheShareExtrasFromIntent → no write (pid empty after gate)")
            }
        }
    }
}

private data class ResolvedShareListing(
    val productId: String?,
    val productName: String?,
    /** `extras`, `uri`, `cache`, or `none` (cache/none only from [GarmentHubSharePlugin] merge path). */
    val source: String,
)
