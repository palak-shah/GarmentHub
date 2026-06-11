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

Each shortcut sends `ACTION_SEND` `image/*` into `MainActivity` with extras `EXTRA_PRODUCT_ID` / `EXTRA_PRODUCT_NAME`.

Flutter reads those extras through `GarmentHubSharePlugin` (`consumeShareProductExtra` on the `com.garmenthub/share_targets` channel) and opens **Add to catalog** with **auto-upload** to the chosen listing when paths are valid.

Optional: `getMaxShareTargets` on the same channel returns the OS shortcut budget for UI hints (see `ShareTargetsPlatform.getMaxShareTargetsForDevice()`).

## Pins + MRU

- **Pinned** listings (up to 32 in-app, **My products** screen) are merged **first**, then **MRU** (deduped), and sent to native for publishing.
- **MRU** (up to 8) is still built from products you last opened or uploaded to in the app.

## Inside GarmentHub (after you tap GarmentHub or a shortcut row)

- You land on **Add to catalog** with previews of the shared images.
- **Recent listings** and pins appear as one-tap upload targets, or use **Browse all products** for the full list.

## Native files

- [`gh_share_targets.xml`](../android/app/src/main/res/xml/gh_share_targets.xml)
- [`ShareShortcutPublisher.kt`](../android/app/src/main/kotlin/com/garmenthub/garmenthub_mobile/ShareShortcutPublisher.kt)
- [`GarmentHubSharePlugin.kt`](../android/app/src/main/kotlin/com/garmenthub/garmenthub_mobile/GarmentHubSharePlugin.kt)
- [`MainActivity.kt`](../android/app/src/main/kotlin/com/garmenthub/garmenthub_mobile/MainActivity.kt)
