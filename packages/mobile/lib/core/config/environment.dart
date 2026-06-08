import 'dart:io';

/// Full API root including `/api`, e.g. `https://example.com/api`.
///
/// Set at compile time: `--dart-define=API_BASE_URL=http://127.0.0.1:4000/api`
class Environment {
  Environment._();

  static const String _define = String.fromEnvironment('API_BASE_URL');

  /// Android emulator → host loopback; iOS simulator can use localhost via define.
  static String get apiBaseUrl {
    if (_define.isNotEmpty) {
      return _define.replaceAll(RegExp(r'/$'), '');
    }
    if (Platform.isAndroid) {
      return 'http://10.0.2.2:4000/api';
    }
    return 'http://127.0.0.1:4000/api';
  }

  /// Origin for resolving relative media paths (`/uploads/...`).
  static String get mediaOrigin {
    final base = apiBaseUrl;
    if (base.endsWith('/api')) {
      return base.substring(0, base.length - 4);
    }
    return base;
  }

  static String resolveMediaUrl(String? src) {
    if (src == null || src.trim().isEmpty) return '';
    final s = src.trim();
    if (s.startsWith('http://') || s.startsWith('https://')) return s;
    final path = s.startsWith('/') ? s : '/$s';
    return '${mediaOrigin.replaceAll(RegExp(r'/$'), '')}$path';
  }
}
