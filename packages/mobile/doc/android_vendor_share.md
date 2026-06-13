# Android: share photos into GarmentHub

## System share sheet

- The app declares `ACTION_SEND` / `ACTION_SEND_MULTIPLE` for `image/*` so **GarmentHub** appears when you share from Photos, Files, etc. (after install / first use it may appear lower in the list until Android ranks it).
- The launcher / share label is **`GarmentHub`** (`android:label` → `res/values/strings.xml`).

## Sharing Shortcuts (direct-share rows for listings)

Android 10+ **Sharing Shortcuts** require a declared share target in XML plus matching shortcut categories (see [Provide direct share targets](https://developer.android.com/training/sharing/direct-share-targets)):

- [`gh_share_targets.xml`](../android/app/src/main/res/xml/gh_share_targets.xml) — `<share-target>` for `MainActivity`, `image/*`, and category `com.garmenthub.garmenthub_mobile.category.IMAGE_SHARE_TARGET` (must match [`GarmentHubSharePlugin.SHARE_TARGET_CATEGORY`](../android/app/src/main/kotlin/com/garmenthub/garmenthub_mobile/GarmentHubSharePlugin.kt)).
- [`AndroidManifest.xml`](../android/app/src/main/AndroidManifest.xml) on `MainActivity`:
  - `meta-data` `android.app.shortcuts` → `@xml/gh_share_targets`
  - `meta-data` `android.service.chooser.chooser_target_service` → `androidx.sharetarget.ChooserTargetServiceCompat` (dependency [`androidx.sharetarget:sharetarget`](../android/app/build.gradle.kts)).

[`ShareShortcutPublisher.kt`](../android/app/src/main/kotlin/com/garmenthub/garmenthub_mobile/ShareShortcutPublisher.kt) publishes **dynamic** shortcuts with that category whenever pins/MRU change (`VendorSharePrefs` → `ShareTargetsPlatform.syncRecentTargets`). The number of shortcuts is **`min(merged listings, ShortcutManager.getMaxShortcutCountPerActivity())`** (API 25+; older devices get no dynamic share rows). The share sheet **UI** may still show fewer rows than published (OEM/layout).

Each shortcut sends `ACTION_SEND` `image/*` into `MainActivity` with extras `EXTRA_PRODUCT_ID` / `EXTRA_PRODUCT_NAME`, plus a **`garmenthub://share/product/{productId}?productName=...`** data URI (second path if OEM strips extras). Legacy shortcuts may still use **`garmenthub-share://direct-listing?productId=...&productName=...`**, which the app continues to parse.

`MainActivity` copies those extras into a small static cache in `GarmentHubSharePlugin.cacheShareExtrasFromIntent` as soon as `onCreate` / `onNewIntent` runs (before `super`), so they still survive if the activity intent is replaced before Dart runs.

Flutter reads those extras through `GarmentHubSharePlugin` (`peekShareProductExtra` then `consumeShareProductExtra` on `com.garmenthub/share_targets`) so routing sees the listing id before extras are cleared. When a **direct-share row** (listing shortcut) is used, [`GarmentHubApp`](../lib/app.dart) validates the product, **uploads shared images first**, then opens **product edit** so the editor load includes new photos; root **SnackBars** report progress. It does **not** open **Add to catalog** unless you used the main GarmentHub target without a row or the app falls back (e.g. no valid image files, invalid id, or upload error). If the share arrives before the vendor session is ready, `VendorSharePrefs` stores paths **and** optional listing id/name so after login the same direct-share flow runs instead of losing the shortcut context.

Optional: `getMaxShareTargets` on the same channel returns the OS shortcut budget for UI hints (see `ShareTargetsPlatform.getMaxShareTargetsForDevice()`).

## Pins + MRU

- **Pinned** listings (up to 32 in-app, **My products** screen) are merged **first**, then **MRU** (deduped), and sent to native for publishing.
- **MRU** (up to 8) is still built from products you last opened or uploaded to in the app.

## Inside GarmentHub

- **Direct-share listing row:** validates the listing, uploads shared photos, then opens the **product editor** with those images already on the product; success/error via **SnackBar** (see [`app.dart`](../lib/app.dart) and [`vendor_share_upload.dart`](../lib/features/vendor/domain/vendor_share_upload.dart)). **Add to catalog** only runs for the generic target or on fallback; if routed there with a preselected listing (e.g. after a failed upload), the screen **starts upload automatically** for that product.
- **Main GarmentHub share target (no row):** **Add to catalog** with image previews, pinned + recent listing buttons, and **Browse all products**.

## Temporary on-device share debug

On **Android/iOS** (not web), a bottom **Share debug** panel shows `[share-debug]` lines during development (`kDebugMode`). For a **release** test APK, build with `--dart-define=SHARE_DEBUG_OVERLAY=true`. Remove the define before store release. Implementation: [`share_debug_log.dart`](../lib/core/debug/share_debug_log.dart).

**Native Logcat (Android):** filter tag **`GHShare`** (e.g. `adb logcat -s GHShare`). Logs run only when **`BuildConfig.DEBUG`** is true (debug APK). Helpers: [`GhShareLog.kt`](../android/app/src/main/kotlin/com/garmenthub/garmenthub_mobile/GhShareLog.kt); `buildConfig` is enabled in [`build.gradle.kts`](../android/app/build.gradle.kts).

## Native files

- [`gh_share_targets.xml`](../android/app/src/main/res/xml/gh_share_targets.xml)
- [`ShareShortcutPublisher.kt`](../android/app/src/main/kotlin/com/garmenthub/garmenthub_mobile/ShareShortcutPublisher.kt)
- [`GarmentHubSharePlugin.kt`](../android/app/src/main/kotlin/com/garmenthub/garmenthub_mobile/GarmentHubSharePlugin.kt)
- [`MainActivity.kt`](../android/app/src/main/kotlin/com/garmenthub/garmenthub_mobile/MainActivity.kt)
- [`vendor_share_upload.dart`](../lib/features/vendor/domain/vendor_share_upload.dart)
