# Android: share photos into GarmentHub

## System share sheet

- The app declares `ACTION_SEND` / `ACTION_SEND_MULTIPLE` for `image/*` so **GarmentHub** appears when you share from Photos, Files, etc. (after install / first use it may appear lower in the list until Android ranks it).
- The launcher / share label is **`GarmentHub`** (`android:label` → `res/values/strings.xml`).

## Direct-share rows (recent listings in the chooser)

- The app publishes **dynamic sharing shortcuts** via `ShortcutManagerCompat` (`ShareShortcutPublisher.kt`) whenever the vendor MRU changes (`VendorSharePrefs` → `ShareTargetsPlatform.syncRecentTargets`).
- Up to **four** shortcuts appear as **conversation-style** direct-share targets (OEM-dependent). Each shortcut sends `ACTION_SEND` `image/*` into `MainActivity` with extras `EXTRA_PRODUCT_ID` / `EXTRA_PRODUCT_NAME`.
- Flutter reads those extras through `GarmentHubSharePlugin` (`consumeShareProductExtra` on the `com.garmenthub/share_targets` channel) and opens **Add to catalog** with **auto-upload** to the chosen listing when paths are valid.
- Requires **API 25+** for dynamic shortcuts; older devices only see the main GarmentHub icon.

## Inside GarmentHub (after you tap GarmentHub or a shortcut row)

- You land on **Add to catalog** with previews of the shared images.
- **Recent listings** (up to 8) are built from products you last opened or uploaded to in the app (`VendorSharePrefs`). Tap one to upload there in one step, or use **Browse all products** for the full list.

## Native files

- [`ShareShortcutPublisher.kt`](../android/app/src/main/kotlin/com/garmenthub/garmenthub_mobile/ShareShortcutPublisher.kt)
- [`GarmentHubSharePlugin.kt`](../android/app/src/main/kotlin/com/garmenthub/garmenthub_mobile/GarmentHubSharePlugin.kt)
- [`MainActivity.kt`](../android/app/src/main/kotlin/com/garmenthub/garmenthub_mobile/MainActivity.kt)
