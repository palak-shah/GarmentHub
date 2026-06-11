/// Compile-time client debug flag (matches PWA `VITE_CLIENT_DEBUG` concept).
///
/// ```bash
/// flutter run --dart-define=CLIENT_DEBUG=true
/// ```
const bool kClientDebug = bool.fromEnvironment('CLIENT_DEBUG', defaultValue: false);
