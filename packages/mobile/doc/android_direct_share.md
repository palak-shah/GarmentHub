# Android Sharing Shortcuts (Direct Share)

GarmentHub publishes up to **8** dynamic shortcuts for **image/\*** shares using **Sharing Shortcuts** (no `ChooserTargetService`).

## Files

| Piece | Path |
|--------|------|
| Share-target XML | [`android/app/src/main/res/xml/shortcuts.xml`](../android/app/src/main/res/xml/shortcuts.xml) |
| Manifest + `meta-data` | [`android/app/src/main/AndroidManifest.xml`](../android/app/src/main/AndroidManifest.xml) |
| Publisher | [`ShareShortcutPublisher.kt`](../android/app/src/main/kotlin/com/garmenthub/garmenthub_mobile/ShareShortcutPublisher.kt) |
| MethodChannel | [`GarmentHubSharePlugin.kt`](../android/app/src/main/kotlin/com/garmenthub/garmenthub_mobile/GarmentHubSharePlugin.kt) |
| Category constant | [`ShareTargetsConstants.kt`](../android/app/src/main/kotlin/com/garmenthub/garmenthub_mobile/ShareTargetsConstants.kt) |
| Flutter API | [`lib/core/platform/android_direct_share.dart`](../lib/core/platform/android_direct_share.dart) |
| MRU + sync | [`lib/features/vendor/domain/vendor_share_prefs.dart`](../lib/features/vendor/domain/vendor_share_prefs.dart) |
| Inbound UI | [`lib/features/vendor/presentation/vendor_inbound_share_screen.dart`](../lib/features/vendor/presentation/vendor_inbound_share_screen.dart) |
| Share receiver | [`lib/app.dart`](../lib/app.dart) (`receive_sharing_intent` + routing) |

## Flutter usage

Automatic: [`VendorSharePrefs`](../lib/features/vendor/domain/vendor_share_prefs.dart) calls [`AndroidDirectShare.publishRecentProducts`](../lib/core/platform/android_direct_share.dart) when MRU changes (product list tap, edit load, upload). [`GarmentHubApp`](../lib/app.dart) consumes [`consumeDirectShareExtras`](../lib/core/platform/android_direct_share.dart) when shared media arrives and routes to `/vendor/inbound-share`.

You can still call manually:

```dart
await AndroidDirectShare.publishRecentProducts([
  ShareProductPayload(
    productId: '...',
    productName: 'Cotton Kurta',
    thumbnailUrl: 'https://.../thumb.jpg',
    pinnedFlag: false,
    lastUsedTimestamp: DateTime.now().millisecondsSinceEpoch,
    useCount: 3,
  ),
]);

// After receive_sharing_intent gives you paths:
final x = await AndroidDirectShare.consumeDirectShareExtras();
// Navigate to product x.productId and upload if non-null.
```

Ranking on the native side: **pinned first**, then **lastUsedTimestamp** desc, then **useCount** desc (max 8).

## Logcat

Filter: **`GarmentHubDirectShare`**

You will see: publish counts, shortcut ids/labels, `setDynamicShortcuts` success/failure, merged `incomingShare[...]` lines with `productId` / `shortcutId` / stream URI.

## adb verification

```bash
adb shell dumpsys shortcut | sed -n '/com.garmenthub.garmenthub_mobile/,/^$/p'
```

If supported on the device:

```bash
adb shell cmd shortcut help
```

## Manual test (device checklist)

1. **Logcat:** Android Studio / `adb logcat` filter **`GarmentHubDirectShare`**.
2. **Shortcuts published:** After vendor login, open 2–3 products; log lines should show `publishRecentProducts` and `setDynamicShortcuts completed`.
3. **adb:** `adb shell dumpsys shortcut | sed -n '/com.garmenthub.garmenthub_mobile/,/^$/p'` — confirm dynamic shortcut ids `share_product_*`.
4. **Gallery share:** Share an image to GarmentHub (app row or direct row if shown).
5. **Inbound:** App opens **Add to catalog**; pick a recent product or use **Browse**; upload should complete and navigate to product edit when applicable.

## Notes

- Thumbnails use a plain HTTP GET; auth-gated URLs need a local file path instead (future).
- Samsung/OnePlus may hide or deprioritize direct targets; `dumpsys shortcut` proves publication even when the UI is sparse.
