package com.garmenthub.garmenthub_mobile

import android.content.Context
import org.json.JSONObject

/**
 * Persists dynamic share shortcut id → listing identity when shortcuts are published.
 * Used when OEMs strip [GarmentHubSharePlugin.EXTRA_PRODUCT_ID] / [Intent.data] but keep
 * [Intent.EXTRA_SHORTCUT_ID] (e.g. some Samsung share paths).
 */
object ShareShortcutIdRegistry {
    private const val PREFS_NAME = "gh_share_shortcut_id_registry"
    private const val KEY_MAP_JSON = "shortcut_id_to_product_json"

    /** Same rules as [ShareShortcutPublisher] shortcut id segment (must stay in sync). */
    fun sanitizeShortcutIdSegment(raw: String): String =
        raw.replace(Regex("[^a-zA-Z0-9_-]"), "_").take(64)

    fun dynamicShortcutIdForProduct(rawProductId: String): String =
        "share_product_${sanitizeShortcutIdSegment(rawProductId)}"

    /**
     * Replaces the whole map with the current published shortcuts (matches [ShareShortcutPublisher.sync]).
     */
    fun replaceAll(context: Context, items: List<Pair<String, String>>) {
        val app = context.applicationContext
        val root = JSONObject()
        for ((rawId, name) in items) {
            val sid = dynamicShortcutIdForProduct(rawId)
            val entry = JSONObject()
            entry.put("productId", rawId)
            entry.put("productName", name)
            root.put(sid, entry)
        }
        app.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_MAP_JSON, root.toString())
            .apply()
    }

    fun clear(context: Context) {
        val app = context.applicationContext
        app.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .remove(KEY_MAP_JSON)
            .apply()
    }

    /**
     * @return pair of (productId, productName?) or null if unknown id
     */
    fun lookup(context: Context, shortcutId: String): Pair<String, String?>? {
        val raw = context.applicationContext
            .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getString(KEY_MAP_JSON, null)
            ?: return null
        return try {
            val root = JSONObject(raw)
            if (!root.has(shortcutId)) return null
            val entry = root.getJSONObject(shortcutId)
            val pid = entry.getString("productId").trim()
            if (pid.isEmpty()) return null
            val pname = if (entry.has("productName") && !entry.isNull("productName")) {
                entry.getString("productName")
            } else {
                null
            }
            pid to pname
        } catch (_: Exception) {
            null
        }
    }
}
