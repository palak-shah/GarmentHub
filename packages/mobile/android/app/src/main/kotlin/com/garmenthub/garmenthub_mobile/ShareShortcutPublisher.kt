package com.garmenthub.garmenthub_mobile

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.core.app.Person
import androidx.core.content.pm.ShortcutInfoCompat
import androidx.core.content.pm.ShortcutManagerCompat
import androidx.core.graphics.drawable.IconCompat
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

data class ShareProductInput(
    val productId: String,
    val productName: String,
    val thumbnailUrl: String?,
    val pinned: Boolean,
    val lastUsedTimestamp: Long,
    val useCount: Int,
)

/**
 * Publishes / clears dynamic **Sharing Shortcuts** (Direct Share) via [ShortcutManagerCompat].
 * Does not use ChooserTargetService.
 */
object ShareShortcutPublisher {
    private const val MAX_SHORTCUTS = 8
    private const val THUMB_MAX_EDGE_PX = 192
    private const val CONNECT_TIMEOUT_MS = 8_000
    private const val READ_TIMEOUT_MS = 12_000
    private const val SHORT_LABEL_MAX = 12
    private const val LONG_LABEL_MAX = 40

    private val executor = Executors.newSingleThreadExecutor()
    private val mainHandler = Handler(Looper.getMainLooper())

    private fun rankCompare(a: ShareProductInput, b: ShareProductInput): Int {
        if (a.pinned != b.pinned) return if (a.pinned) -1 else 1
        val t = b.lastUsedTimestamp.compareTo(a.lastUsedTimestamp)
        if (t != 0) return t
        return b.useCount.compareTo(a.useCount)
    }

    fun clear(context: Context) {
        val app = context.applicationContext
        Log.i(ShareTargetsConstants.TAG, "clearPublishedProducts: scheduling dynamic shortcut removal")
        executor.execute {
            val existing = ShortcutManagerCompat.getDynamicShortcuts(app)
            val ids = existing.map { it.id }
            Log.i(
                ShareTargetsConstants.TAG,
                "clearPublishedProducts: removing ${ids.size} shortcuts ids=$ids",
            )
            mainHandler.post {
                try {
                    if (ids.isNotEmpty()) {
                        ShortcutManagerCompat.removeDynamicShortcuts(app, ids)
                    }
                    val after = ShortcutManagerCompat.getDynamicShortcuts(app).size
                    Log.i(ShareTargetsConstants.TAG, "clearPublishedProducts: success remainingDynamic=$after")
                } catch (t: Throwable) {
                    Log.e(ShareTargetsConstants.TAG, "clearPublishedProducts: remove failed", t)
                }
            }
        }
    }

    fun publish(context: Context, rawItems: List<ShareProductInput>) {
        val app = context.applicationContext
        val sorted = rawItems.sortedWith(::rankCompare).take(MAX_SHORTCUTS)
        Log.i(
            ShareTargetsConstants.TAG,
            "publishRecentProducts: inputCount=${rawItems.size} afterRankTake=${sorted.size}",
        )
        sorted.forEachIndexed { i, p ->
            Log.d(
                ShareTargetsConstants.TAG,
                "  [$i] id=${p.productId} name=${p.productName} pinned=${p.pinned} lastUsed=${p.lastUsedTimestamp} useCount=${p.useCount} thumbLen=${p.thumbnailUrl?.length ?: 0}",
            )
        }
        if (sorted.isEmpty()) {
            clear(app)
            return
        }
        executor.execute {
            val shortcuts = sorted.mapIndexed { index, item ->
                buildOneShortcut(app, item, index)
            }
            mainHandler.post {
                try {
                    ShortcutManagerCompat.setDynamicShortcuts(app, shortcuts)
                    Log.i(
                        ShareTargetsConstants.TAG,
                        "setDynamicShortcuts completed count=${shortcuts.size} ids=${shortcuts.map { it.id }} labels=${shortcuts.map { it.shortLabel }}",
                    )
                    shortcuts.forEach { s ->
                        Log.d(
                            ShareTargetsConstants.TAG,
                            "published shortcut id=${s.id} shortLabel=${s.shortLabel} longLabel=${s.longLabel}",
                        )
                    }
                    val verify = ShortcutManagerCompat.getDynamicShortcuts(app)
                    Log.i(
                        ShareTargetsConstants.TAG,
                        "verify dynamicShortcutsCount=${verify.size} verifyIds=${verify.map { it.id }}",
                    )
                } catch (t: Throwable) {
                    Log.e(ShareTargetsConstants.TAG, "setDynamicShortcuts failed", t)
                }
            }
        }
    }

    private fun buildOneShortcut(context: Context, item: ShareProductInput, rank: Int): ShortcutInfoCompat {
        val rawId = item.productId
        val name = item.productName.ifEmpty { "Listing" }
        val sid = "share_product_${sanitizeShortcutId(rawId)}"
        val intent = Intent(Intent.ACTION_SEND).apply {
            component = android.content.ComponentName(context, MainActivity::class.java)
            type = "image/*"
            putExtra(ShareTargetsConstants.EXTRA_PRODUCT_ID, rawId)
            putExtra(ShareTargetsConstants.EXTRA_PRODUCT_NAME, name)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                putExtra(Intent.EXTRA_SHORTCUT_ID, sid)
            }
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                Intent.FLAG_ACTIVITY_CLEAR_TOP or
                Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val icon = loadShortcutIcon(context, sanitizeShortcutId(rawId), item.thumbnailUrl)
        val shortLabel = name.take(SHORT_LABEL_MAX)
        val longLabel = name.take(LONG_LABEL_MAX)
        val builder = ShortcutInfoCompat.Builder(context, sid)
            .setShortLabel(shortLabel)
            .setLongLabel(longLabel)
            .setIntent(intent)
            .setCategories(setOf(ShareTargetsConstants.IMAGE_SHARE_TARGET_CATEGORY))
            .setLongLived(true)
            .setRank(rank)
            .setIcon(icon)
        try {
            builder.addCapabilityBinding(
                "actions.intent.SEND",
                "mimeType",
                listOf("image/*"),
            )
        } catch (t: Throwable) {
            Log.w(ShareTargetsConstants.TAG, "addCapabilityBinding(SEND) not applied", t)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            try {
                val person = Person.Builder()
                    .setName(longLabel)
                    .setIcon(icon)
                    .setImportant(true)
                    .setKey("person_$sid")
                    .build()
                builder.setPerson(person)
            } catch (t: Throwable) {
                Log.w(ShareTargetsConstants.TAG, "setPerson skipped", t)
            }
        }
        return builder.build()
    }

    private fun loadShortcutIcon(context: Context, sanitizedId: String, url: String?): IconCompat {
        val fallback = IconCompat.createWithResource(context, android.R.drawable.ic_menu_gallery)
        if (url.isNullOrBlank()) {
            Log.d(ShareTargetsConstants.TAG, "icon: no thumbnailUrl for id=$sanitizedId, using fallback")
            return fallback
        }
        val dir = File(context.cacheDir, "share_shortcut_icons")
        dir.mkdirs()
        val cacheFile = File(dir, "$sanitizedId.png")
        try {
            val conn = (URL(url).openConnection() as HttpURLConnection).apply {
                connectTimeout = CONNECT_TIMEOUT_MS
                readTimeout = READ_TIMEOUT_MS
                instanceFollowRedirects = true
                useCaches = true
            }
            conn.inputStream.use { input ->
                val decoded = BitmapFactory.decodeStream(input) ?: return fallback.also {
                    Log.w(ShareTargetsConstants.TAG, "icon: decodeStream null for id=$sanitizedId")
                }
                val scaled = scaleToMaxEdge(decoded, THUMB_MAX_EDGE_PX)
                if (scaled != decoded && !decoded.isRecycled) decoded.recycle()
                FileOutputStream(cacheFile).use { out ->
                    if (!scaled.compress(Bitmap.CompressFormat.PNG, 92, out)) {
                        Log.w(ShareTargetsConstants.TAG, "icon: compress failed id=$sanitizedId")
                        return fallback
                    }
                }
                if (!scaled.isRecycled) scaled.recycle()
            }
            val fromFile = BitmapFactory.decodeFile(cacheFile.absolutePath)
                ?: return fallback.also { Log.w(ShareTargetsConstants.TAG, "icon: decodeFile null id=$sanitizedId") }
            Log.d(ShareTargetsConstants.TAG, "icon: loaded from cache for id=$sanitizedId path=${cacheFile.absolutePath}")
            return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                IconCompat.createWithAdaptiveBitmap(fromFile)
            } else {
                IconCompat.createWithBitmap(fromFile)
            }
        } catch (t: Throwable) {
            Log.w(ShareTargetsConstants.TAG, "icon: download/cache failed id=$sanitizedId url=$url", t)
            return fallback
        }
    }

    private fun scaleToMaxEdge(bitmap: Bitmap, max: Int): Bitmap {
        val w = bitmap.width
        val h = bitmap.height
        val maxDim = maxOf(w, h)
        if (maxDim <= max) return bitmap
        val scale = max.toFloat() / maxDim
        val nw = (w * scale).toInt().coerceAtLeast(1)
        val nh = (h * scale).toInt().coerceAtLeast(1)
        return Bitmap.createScaledBitmap(bitmap, nw, nh, true)
    }

    fun sanitizeShortcutId(raw: String): String =
        raw.replace(Regex("[^a-zA-Z0-9_-]"), "_").take(64)
}
