import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// Native OS share targets (Android dynamic shortcuts, iOS INSendMessageIntent donation + handoff).
class ShareTargetsPlatform {
  ShareTargetsPlatform._();

  static const _channel = MethodChannel('com.garmenthub/share_targets');

  /// Push pins + MRU to Android shortcuts / donate iOS intents (trimmed on native side).
  static Future<void> syncRecentTargets(List<({String id, String name})> recents) async {
    if (kIsWeb) return;
    if (!Platform.isAndroid && !Platform.isIOS) return;
    final list = recents.map((e) => <String, String>{'id': e.id, 'name': e.name}).toList();
    try {
      await _channel.invokeMethod<void>('syncShareTargets', list);
    } catch (_) {}
  }

  /// Android: [ShortcutManager.getMaxShortcutCountPerActivity]. iOS: conservative donation cap (no public API).
  static Future<int?> getMaxShareTargetsForDevice() async {
    if (kIsWeb) return null;
    if (!Platform.isAndroid && !Platform.isIOS) return null;
    try {
      final raw = await _channel.invokeMethod<dynamic>('getMaxShareTargets');
      if (raw is int) return raw;
      if (raw is num) return raw.toInt();
      return null;
    } catch (_) {
      return null;
    }
  }

  static Future<void> clearOsShareTargets() async {
    if (kIsWeb) return;
    if (!Platform.isAndroid && !Platform.isIOS) return;
    try {
      await _channel.invokeMethod<void>('syncShareTargets', <Map<String, String>>[]);
    } catch (_) {}
  }

  /// Android: read listing extras from the current share intent without clearing them.
  /// Call [consumeShareProductExtra] after routing so the next share does not reuse stale extras.
  ///
  /// [resolvedSource] is `extras`, `uri`, `cache`, or `none` from native resolution (missing on old APKs).
  static Future<
      ({
        String? productId,
        String? productName,
        String? resolvedSource,
        String? intentDataPreview,
      })> peekShareProductExtra() async {
    if (kIsWeb || !Platform.isAndroid) {
      return (
        productId: null,
        productName: null,
        resolvedSource: null,
        intentDataPreview: null,
      );
    }
    try {
      final raw = await _channel.invokeMethod<Map<dynamic, dynamic>>('peekShareProductExtra');
      return _parseShareProductExtraMap(raw);
    } catch (_) {
      return (
        productId: null,
        productName: null,
        resolvedSource: null,
        intentDataPreview: null,
      );
    }
  }

  /// Android: extras on the same ACTION_SEND intent as shared media. Consume-once.
  static Future<
      ({
        String? productId,
        String? productName,
        String? resolvedSource,
        String? intentDataPreview,
      })> consumeShareProductExtra() async {
    if (kIsWeb || !Platform.isAndroid) {
      return (
        productId: null,
        productName: null,
        resolvedSource: null,
        intentDataPreview: null,
      );
    }
    try {
      final raw = await _channel.invokeMethod<Map<dynamic, dynamic>>('consumeShareProductExtra');
      return _parseShareProductExtraMap(raw);
    } catch (_) {
      return (
        productId: null,
        productName: null,
        resolvedSource: null,
        intentDataPreview: null,
      );
    }
  }

  static ({
    String? productId,
    String? productName,
    String? resolvedSource,
    String? intentDataPreview,
  }) _parseShareProductExtraMap(Map<dynamic, dynamic>? raw) {
    if (raw == null) {
      return (
        productId: null,
        productName: null,
        resolvedSource: null,
        intentDataPreview: null,
      );
    }
    final id = raw['productId']?.toString().trim();
    final name = raw['productName']?.toString().trim();
    final src = raw['resolvedSource']?.toString().trim();
    final previewRaw = raw['intentDataPreview']?.toString();
    final preview = (previewRaw == null || previewRaw.isEmpty) ? null : previewRaw;
    return (
      productId: id?.isEmpty ?? true ? null : id,
      productName: name?.isEmpty ?? true ? null : name,
      resolvedSource: src?.isEmpty ?? true ? null : src,
      intentDataPreview: preview,
    );
  }

  /// iOS: share extension staged paths in App Group + opened `garmenthub://` handoff. Consume-once.
  static Future<ShareIosHandoff?> consumeIosShareHandoff() async {
    if (kIsWeb || !Platform.isIOS) return null;
    try {
      final raw = await _channel.invokeMethod<Map<dynamic, dynamic>>('consumeIosShareHandoff');
      if (raw == null) return null;
      final pathsRaw = raw['paths'];
      final paths = <String>[];
      if (pathsRaw is List) {
        for (final p in pathsRaw) {
          final s = p?.toString().trim();
          if (s != null && s.isNotEmpty) paths.add(s);
        }
      }
      final id = raw['productId']?.toString().trim();
      final name = raw['productName']?.toString().trim();
      if (paths.isEmpty) return null;
      return ShareIosHandoff(
        paths: paths,
        productId: id?.isEmpty ?? true ? null : id,
        productName: name?.isEmpty ?? true ? null : name,
      );
    } catch (_) {
      return null;
    }
  }
}

class ShareIosHandoff {
  const ShareIosHandoff({
    required this.paths,
    this.productId,
    this.productName,
  });

  final List<String> paths;
  final String? productId;
  final String? productName;
}
