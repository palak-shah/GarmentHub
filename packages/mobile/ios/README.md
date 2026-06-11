# iOS (Xcode) — quick checklist after `git pull`

Open **`Runner.xcworkspace`** (not `Runner.xcodeproj` alone).

## Every machine / fresh clone

1. **Signing** — Select targets **Runner** and **GarmentHubShareExtension** → *Signing & Capabilities* → pick your **Team**.
2. **App Groups** — On **both** targets → *+ Capability* → **App Groups** → enable  
   `group.com.garmenthub.garmenthubMobile`  
   (Create/link it in [Apple Developer](https://developer.apple.com) for both bundle IDs if Xcode errors.)
3. **Siri** (Runner only, if Xcode warns) — *+ Capability* → **Siri** — needed for `INSendMessageIntent` donation.
4. **Build on a real device** — Share suggestions / extension behavior are unreliable in the Simulator.

Full detail: [`../doc/ios_vendor_share.md`](../doc/ios_vendor_share.md)
