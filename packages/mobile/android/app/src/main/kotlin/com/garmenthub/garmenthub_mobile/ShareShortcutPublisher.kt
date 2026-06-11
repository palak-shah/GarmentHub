package com.garmenthub.garmenthub_mobile

import android.content.Context
import android.content.Intent
import androidx.core.content.pm.ShortcutInfoCompat
import androidx.core.content.pm.ShortcutManagerCompat
import androidx.core.graphics.drawable.IconCompat

/**
 * Publishes dynamic shortcuts so recent listings appear as direct-share rows in the system chooser.
 */
object ShareShortcutPublisher {
    private const val MAX_SHORTCUTS = 4
    /** Shortcuts short-label limit (matches platform shortcut label caps). */
    private const val SHORT_LABEL_MAX_LEN = 10
    private const val LONG_LABEL_MAX_LEN = 25
    /** Conversation-style category for direct-share shortcuts (AndroidX). */
    private const val CATEGORY_CONVERSATION = "androidx.core.content.pm.shortcuts.conversation"

    fun sync(context: Context, items: List<Pair<String, String>>) {
        val trimmed = items.take(MAX_SHORTCUTS)
        if (trimmed.isEmpty()) {
            val existing = ShortcutManagerCompat.getDynamicShortcuts(context)
            val ids = existing.map { it.id }
            if (ids.isNotEmpty()) {
                ShortcutManagerCompat.removeDynamicShortcuts(context, ids)
            }
            return
        }
        val shortcuts = trimmed.mapIndexed { index, pair ->
            val (rawId, name) = pair
            val id = sanitizeShortcutId(rawId)
            val intent = Intent(Intent.ACTION_SEND).apply {
                component = android.content.ComponentName(context, MainActivity::class.java)
                type = "image/*"
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
                .setCategories(setOf(CATEGORY_CONVERSATION))
                .setLongLived(true)
                .setRank(index)
                .setIcon(IconCompat.createWithResource(context, android.R.drawable.ic_menu_gallery))
                .build()
        }
        try {
            ShortcutManagerCompat.setDynamicShortcuts(context, shortcuts)
        } catch (_: Exception) {
            // Rate limits / OEM restrictions
        }
    }

    private fun sanitizeShortcutId(raw: String): String =
        raw.replace(Regex("[^a-zA-Z0-9_-]"), "_").take(64)
}
