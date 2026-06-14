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
        appContextForRegistry = binding.applicationContext
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
        val resolved = resolveWithCache(intent)
        lastResolvedShareListing = resolved
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
                activity?.intent?.let { captureFromIntent(it) }
                val id = pendingProductId ?: cachedShareProductId
                val name = pendingProductName ?: cachedShareProductName
                GhShareLog.d(
                    "peekShareProductExtra → pendingId=${pendingProductId ?: "(null)"} pendingName=${pendingProductName ?: "(null)"} " +
                        "cachedId=${cachedShareProductId ?: "(null)"} cachedName=${cachedShareProductName ?: "(null)"} " +
                        "returnId=${id ?: "(null)"} returnName=${name ?: "(null)"}",
                )
                val diagIntent = activity?.intent
                val resolvedSource = if (diagIntent != null) {
                    lastResolvedShareListing?.source ?: "none"
                } else {
                    "none"
                }
                val dataPreview = diagIntent?.dataString?.take(200)
                result.success(
                    mapOf(
                        "productId" to id,
                        "productName" to name,
                        "resolvedSource" to resolvedSource,
                        "intentDataPreview" to dataPreview,
                    ),
                )
            }
            "consumeShareProductExtra" -> {
                GhShareLog.logIntent("consumeShareProductExtra BEFORE capture activity.intent", activity?.intent)
                activity?.intent?.let { captureFromIntent(it) }
                val id = pendingProductId ?: cachedShareProductId
                val name = pendingProductName ?: cachedShareProductName
                val resolvedSource = if (activity?.intent != null) {
                    lastResolvedShareListing?.source ?: "none"
                } else {
                    "none"
                }
                val dataPreview = activity?.intent?.dataString?.take(200)
                GhShareLog.d(
                    "consumeShareProductExtra returning id=${id ?: "(null)"} name=${name ?: "(null)"} then clearing pending+cache",
                )
                pendingProductId = null
                pendingProductName = null
                cachedShareProductId = null
                cachedShareProductName = null
                lastResolvedShareListing = null
                result.success(
                    mapOf(
                        "productId" to id,
                        "productName" to name,
                        "resolvedSource" to resolvedSource,
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

        /** Application context for shortcut-id registry lookup (set in [onAttachedToEngine]). */
        @Volatile
        private var appContextForRegistry: Context? = null

        /** Last full resolution ([resolveWithCache]) from [captureFromIntent]; used for Flutter `resolvedSource`. */
        @Volatile
        private var lastResolvedShareListing: ResolvedShareListing? = null

        /** Survives intent mutation before Flutter reads extras (e.g. receive_sharing_intent). */
        @Volatile
        private var cachedShareProductId: String? = null

        @Volatile
        private var cachedShareProductName: String? = null

        /**
         * Strict intent-only ladder: **extra** → **uri** → **shortcutId** → **none**.
         * Stops at first non-empty [productId]. Does not read [cachedShareProductId].
         */
        private fun resolveIntentOnly(intent: Intent?, lookupContext: Context?): ResolvedShareListing {
            if (intent == null) return ResolvedShareListing(null, null, "none")
            val extraId = intent.getStringExtra(EXTRA_PRODUCT_ID)?.trim().orEmpty()
            val extraName = intent.getStringExtra(EXTRA_PRODUCT_NAME)
            if (extraId.isNotEmpty()) {
                return ResolvedShareListing(extraId, extraName, "extra")
            }
            val uri = intent.data
            if (uri != null) {
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
            }

            val shortcutId = intent.getStringExtra(Intent.EXTRA_SHORTCUT_ID)?.trim().orEmpty()
            if (shortcutId.isNotEmpty()) {
                val ctx = lookupContext?.applicationContext
                if (ctx != null) {
                    ShareShortcutIdRegistry.lookup(ctx, shortcutId)?.let { (pid, pname) ->
                        return ResolvedShareListing(pid, pname, "shortcutId")
                    }
                }
                if (shortcutId.startsWith("share_product_")) {
                    val suffix = shortcutId.removePrefix("share_product_").trim()
                    if (suffix.isNotEmpty()) {
                        return ResolvedShareListing(suffix, null, "shortcutId")
                    }
                }
            }

            return ResolvedShareListing(null, null, "none")
        }

        /**
         * Full ladder: [resolveIntentOnly], then [cachedShareProductId] if still no id.
         * Canonical [ResolvedShareListing.source]: `extra`, `uri`, `shortcutId`, `cache`, or `none`.
         */
        private fun resolveWithCache(intent: Intent?): ResolvedShareListing {
            val fromIntent = resolveIntentOnly(intent, appContextForRegistry)
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
        fun cacheShareExtrasFromIntent(context: Context?, intent: Intent?) {
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
            val lookupCtx = context?.applicationContext
            val fromIntent = resolveIntentOnly(intent, lookupCtx)
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
                GhShareLog.d(
                    "cacheShareExtrasFromIntent → SKIP (not image type and no listing id from extra/uri/shortcutId)",
                )
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
    /** `extra`, `uri`, `shortcutId`, `cache`, or `none`. */
    val source: String,
)
