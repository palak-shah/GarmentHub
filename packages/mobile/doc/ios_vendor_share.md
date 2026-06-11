# iOS: share photos into GarmentHub (suggestions + share extension)

**After `git pull`:** use the short Xcode checklist in [`../ios/README.md`](../ios/README.md) (same repo; Xcode does not show reminders on pull—open that file or this doc).

## Overview

- **Runner** donates **`INSendMessageIntent`** interactions for up to four recent listings (same MRU as `VendorSharePrefs`), using `conversationIdentifier` = product id and `speakableGroupName` = product name. This powers **GarmentHub-branded suggestion chips** in the system share sheet when iOS surfaces them (heuristic; may require real usage before they appear).
- **`GarmentHubShareExtension`** (share extension target) declares **`IntentsSupported` → `INSendMessageIntent`** per Apple’s [conversation suggestions](https://developer.apple.com/documentation/foundation/supporting-suggestions-in-your-app-s-share-extension) guidance. When the user picks a suggestion or the extension, images are copied into the **App Group** container and the host app is opened via **`garmenthub://handoff`**. Flutter then reads staged paths through the same `com.garmenthub/share_targets` method channel (`consumeIosShareHandoff`).
- **Runner** `Info.plist` includes **`NSUserActivityTypes`** (`INSendMessageIntent`) and **URL scheme** `garmenthub`. **App Group** id: `group.com.garmenthub.garmenthubMobile` (must exist for your team in the Apple Developer portal; enable **App Groups** + **Siri** capabilities in Xcode if signing fails).

## Flutter bridge

- [`share_targets_platform.dart`](../lib/core/platform/share_targets_platform.dart) — `syncRecentTargets`, `consumeIosShareHandoff`, `consumeShareProductExtra` (Android-only consumer on iOS returns empty).

## Xcode layout

- [`Runner/GarmentHubShareIOS.swift`](../ios/Runner/GarmentHubShareIOS.swift) — method channel + donation + handoff read.
- [`ShareExtension/`](../ios/ShareExtension/) — `ShareViewController.swift`, `Info.plist`, `ShareExtension.entitlements`.

## Testing

- Use a **physical device**; simulator behavior for suggestion intents can differ.
- After uploading to a few products, share from Photos and look for GarmentHub suggestions, then confirm auto-upload + navigation.
