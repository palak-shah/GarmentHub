import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// Payload for Android Sharing Shortcuts (Direct Share).
class ShareProductPayload {
  ShareProductPayload({
    required this.productId,
    required this.productName,
    this.thumbnailUrl = '',
    this.pinnedFlag = false,
    required this.lastUsedTimestamp,
    this.useCount = 0,
  });

  final String productId;
  final String productName;
  final String thumbnailUrl;
  final bool pinnedFlag;
  final int lastUsedTimestamp;

  /// Share frequency for ranking (higher = more important after pin + recency).
  final int useCount;

  Map<String, Object?> toChannelMap() => {
        'productId': productId,
        'productName': productName,
        'thumbnailUrl': thumbnailUrl,
        'pinnedFlag': pinnedFlag,
        'lastUsedTimestamp': lastUsedTimestamp,
        'useCount': useCount,
      };
}

/// Native Android Sharing Shortcuts via MethodChannel [CHANNEL].
///
/// Wire into your app after `receive_sharing_intent` delivers media: call
/// [consumeDirectShareExtras] once to read `productId` / `productName` from the
/// shortcut intent, then navigate and upload.
class AndroidDirectShare {
  AndroidDirectShare._();

  static const _channel = MethodChannel('com.garmenthub/direct_share');

  static Future<void> publishRecentProducts(List<ShareProductPayload> products) async {
    if (kIsWeb || !Platform.isAndroid) return;
    try {
      await _channel.invokeMethod<void>(
        'publishRecentProducts',
        products.map((e) => e.toChannelMap()).toList(),
      );
    } catch (e, st) {
      debugPrint('AndroidDirectShare.publishRecentProducts failed: $e\n$st');
    }
  }

  static Future<void> clearPublishedProducts() async {
    if (kIsWeb || !Platform.isAndroid) return;
    try {
      await _channel.invokeMethod<void>('clearPublishedProducts');
    } catch (e, st) {
      debugPrint('AndroidDirectShare.clearPublishedProducts failed: $e\n$st');
    }
  }

  /// Consume-once: extras from the direct-share shortcut merged into ACTION_SEND.
  static Future<({String? productId, String? productName, String? shortcutId})>
      consumeDirectShareExtras() async {
    if (kIsWeb || !Platform.isAndroid) {
      return (productId: null, productName: null, shortcutId: null);
    }
    try {
      final m = await _channel.invokeMethod<Map<dynamic, dynamic>>('consumeDirectShareExtras');
      if (m == null) return (productId: null, productName: null, shortcutId: null);
      String? s(String k) {
        final v = m[k]?.toString().trim();
        if (v == null || v.isEmpty) return null;
        return v;
      }

      return (
        productId: s('productId'),
        productName: s('productName'),
        shortcutId: s('shortcutId'),
      );
    } catch (e, st) {
      debugPrint('AndroidDirectShare.consumeDirectShareExtras failed: $e\n$st');
      return (productId: null, productName: null, shortcutId: null);
    }
  }

  /// Optional: ask native to log the current activity intent (Logcat tag GarmentHubDirectShare).
  static Future<void> logLastShareIntent() async {
    if (kIsWeb || !Platform.isAndroid) return;
    try {
      await _channel.invokeMethod<void>('logLastShareIntent');
    } catch (_) {}
  }
}
