# Install GarmentHub mobile on an iPhone (device testing)

You **cannot** build or sign an iOS app on Linux. Use a **Mac** with **Xcode** (from the App Store). Your repo and `flutter build ios` can live on the same machine you use for development, or copy/clone the repo onto the Mac.

The Android APK uses a compile-time API URL; iOS uses the same flag:

`--dart-define=API_BASE_URL=https://service.garmenthub.in/api`

Optional: **invite links** copied from People/Connect use `--dart-define=WEB_APP_URL=https://<your-pwa-host>` (no trailing slash) so the clipboard includes `/login?invite=…`. If omitted, only the invite code is copied.

Optional: append technical HTTP/Dio details to on-screen API errors while debugging: `--dart-define=CLIENT_DEBUG=true` (same as Android; default off for production).

## 1. On the Mac — install tools

1. **Xcode** (App Store) — install and open once to finish components.
2. **Xcode command-line tools** (Terminal):

   ```bash
   xcode-select --install
   ```

3. **Flutter** (same stable channel as your Linux machine helps):

   ```bash
   git clone https://github.com/flutter/flutter.git -b stable "$HOME/flutter"
   echo 'export PATH="$PATH:$HOME/flutter/bin"' >> ~/.zshrc   # or ~/.bash_profile
   source ~/.zshrc
   flutter doctor
   ```

4. Fix anything **red** in `flutter doctor` (accept Xcode license: `sudo xcodebuild -license`).

5. **CocoaPods** is optional for this template if Flutter uses Swift Package Manager only; if `flutter doctor` asks for CocoaPods:

   ```bash
   sudo gem install cocoapods
   ```

   If `ios/Podfile` exists in your checkout, run:

   ```bash
   cd ios && pod install && cd ..
   ```

## 2. Get the project on the Mac

Clone or copy `garmenthub` so you have `packages/mobile` (same layout as on Ubuntu).

```bash
cd /path/to/garmenthub/packages/mobile
flutter pub get
```

## 3. Build the iOS release (no signing yet)

```bash
flutter build ios --release \
  --dart-define=API_BASE_URL=https://service.garmenthub.in/api
```

## 4. Signing and install on **your** iPhone (USB)

1. Connect the iPhone with USB → unlock → **Trust** this computer.
2. On iPhone: **Settings → Privacy & Security → Developer Mode** → On (iOS 16+) → restart if asked.
3. Open **`ios/Runner.xcworkspace`** in Xcode (use the **.xcworkspace** if both exist).
4. Select the **Runner** target → **Signing & Capabilities**:
   - Enable **Automatically manage signing**.
   - **Team**: pick your Apple ID (free or paid developer account).
5. Top bar: select your **iPhone** as the run destination (not a simulator).
6. Press **Run** (▶) once, or from Terminal:

   ```bash
   cd /path/to/garmenthub/packages/mobile
   flutter run --release \
     --dart-define=API_BASE_URL=https://service.garmenthub.in/api
   ```

7. First launch on device: if iOS says the developer is untrusted → **Settings → General → VPN & Device Management** → trust your developer app.

**Free Apple ID:** signing may expire after about **7 days**; then rebuild/reinstall. **Apple Developer Program** ($/year) gives longer-lived installs and TestFlight.

## 5. “Installer” for a second tester — TestFlight (optional)

1. Enroll in **Apple Developer Program** and create the app in **App Store Connect** with bundle ID **`com.garmenthub.garmenthubMobile`** (must match Xcode; see `ios/Runner.xcodeproj`).
2. In Xcode: **Product → Archive** → **Distribute App** → App Store Connect → upload.
3. In App Store Connect: processing completes → **TestFlight** → add testers by email.
4. Testers install the **TestFlight** app from the App Store and accept the invite.

There is no supported equivalent of “email a single `.apk` to any phone” for arbitrary iPhones; distribution goes through **Xcode**, **TestFlight**, or the **App Store**.

## 6. Bundle ID note

Current bundle ID: **`com.garmenthub.garmenthubMobile`**. It must be **unique in your Apple Developer account**. If Xcode says the ID is taken, change it in Xcode for the Runner target (and in App Store Connect if you already created an app there) consistently.

## 7. Troubleshooting

| Issue | What to try |
|--------|-------------|
| Signing failed | Pick a Team; use a unique bundle ID; enable “Automatically manage signing”. |
| Network / API errors | Confirm `https://service.garmenthub.in/api/...` works in **Safari on the iPhone**. |
| Build errors after `git pull` | `flutter clean && flutter pub get && flutter build ios ...` again. |
