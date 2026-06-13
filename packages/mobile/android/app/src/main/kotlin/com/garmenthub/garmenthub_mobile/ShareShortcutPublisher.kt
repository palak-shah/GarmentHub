package com.garmenthub.garmenthub_mobile

import android.content.Context
import android.content.Intent
import android.content.pm.ShortcutManager
import android.net.Uri
import android.os.Build
import androidx.core.content.pm.ShortcutInfoCompat
import androidx.core.content.pm.ShortcutManagerCompat
import androidx.core.graphics.drawable.IconCompat
import com.garmenthub.garmenthub_mobile.BuildConfig

/**
 * Publishes dynamic sharing shortcuts so pinned + recent listings appear as direct-share rows.
 */
object ShareShortcutPublisher {
    /** Shortcuts short-label limit (matches platform shortcut label caps). */
    private const val SHORT_LABEL_MAX_LEN = 10
    private const val LONG_LABEL_MAX_LEN = 25

    /** Fallback when [ShortcutManager] is unavailable (pre–API 25). */
    private const val FALLBACK_MAX_SHORTCUTS = 0

    /**
     * Max dynamic shortcuts this activity may publish (OS limit). Used by Flutter for UI hints.
     */
    fun maxShortcutsForDevice(context: Context): Int {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N_MR1) {
            return FALLBACK_MAX_SHORTCUTS
        }
        val sm = context.getSystemService(ShortcutManager::class.java) ?: return FALLBACK_MAX_SHORTCUTS
        val v = sm.maxShortcutCountPerActivity
        return if (v > 0) v else 15
    }

    fun sync(context: Context, items: List<Pair<String, String>>) {
        val max = maxShortcutsForDevice(context)
        val trimmed = if (max <= 0) {
            emptyList()
        } else {
            items.take(max)
        }
        if (trimmed.isEmpty()) {
            val existing = ShortcutManagerCompat.getDynamicShortcuts(context)
            val ids = existing.map { it.id }
            if (ids.isNotEmpty()) {
                ShortcutManagerCompat.removeDynamicShortcuts(context, ids)
            }
            return
        }
        val category = GarmentHubSharePlugin.SHARE_TARGET_CATEGORY
        val shortcuts = trimmed.mapIndexed { index, pair ->
            val (rawId, name) = pair
            val id = sanitizeShortcutId(rawId)
            val intent = Intent(Intent.ACTION_SEND).apply {
                component = android.content.ComponentName(context, MainActivity::class.java)
                val listingUri = Uri.Builder()
                    .scheme(GarmentHubSharePlugin.SHARE_PRODUCT_URI_SCHEME)
                    .authority(GarmentHubSharePlugin.SHARE_PRODUCT_URI_HOST)
                    .appendPath("product")
                    .appendPath(rawId)
                    .appendQueryParameter("productName", name)
                    .build()
                setDataAndType(listingUri, "image/*")
                putExtra(GarmentHubSharePlugin.EXTRA_PRODUCT_ID, rawId)
                putExtra(GarmentHubSharePlugin.EXTRA_PRODUCT_NAME, name)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
            }
            val label = name.ifEmpty { "Listing" }.take(SHORT_LABEL_MAX_LEN)
            val longLabel = name.ifEmpty { "Listing" }.take(LONG_LABEL_MAX_LEN)
            ShortcutInfoCompat.Builder(context, "share_product_$id")
                .setShortLabel(label)
                .setLongLabel(longLabel)
                .setIntent(intent)
                .setCategories(setOf(category))
                .setLongLived(true)
                .setRank(index)
                .setIcon(IconCompat.createWithResource(context, android.R.drawable.ic_menu_gallery))
                .build()
        }
        try {
            if (BuildConfig.DEBUG && shortcuts.isNotEmpty()) {
                GhShareLog.logIntent("ShareShortcutPublisher.sync FIRST shortcut template", shortcuts[0].intent)
                GhShareLog.d("ShareShortcutPublisher.sync publishedCount=${shortcuts.size}")
            }
            ShortcutManagerCompat.setDynamicShortcuts(context, shortcuts)
        } catch (_: Exception) {
            // Rate limits / OEM restrictions
        }
    }

    private fun sanitizeShortcutId(raw: String): String =
        raw.replace(Regex("[^a-zA-Z0-9_-]"), "_").take(64)
}
