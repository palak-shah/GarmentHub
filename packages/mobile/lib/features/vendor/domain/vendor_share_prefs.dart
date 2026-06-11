import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/platform/share_targets_platform.dart';

/// Persists vendor "latest product" and a short **MRU list** for share-from-Photos
/// (inbound screen shows these as one-tap upload targets).
class VendorSharePrefs {
  VendorSharePrefs._();

  static const _lastProductId = 'vendor_last_product_id';
  static const _lastProductName = 'vendor_last_product_name';
  static const _pendingPaths = 'vendor_pending_share_paths_json';
  static const _recentProductsKey = 'vendor_recent_products_json';
  static const _maxRecent = 8;

  static Future<void> setLastProduct({required String id, required String name}) async {
    final p = await SharedPreferences.getInstance();
    await p.setString(_lastProductId, id);
    await p.setString(_lastProductName, name);
    await _upsertRecentProduct(p, id, name);
  }

  /// MRU list used on the inbound share screen (newest first).
  static Future<void> _upsertRecentProduct(SharedPreferences p, String id, String name) async {
    final list = await getRecentProducts();
    final next = <Map<String, String>>[
      {'id': id, 'name': name},
      ...list.where((e) => e.id != id).map((e) => {'id': e.id, 'name': e.name}),
    ];
    final trimmed = next.take(_maxRecent).toList();
    await p.setString(_recentProductsKey, jsonEncode(trimmed));
    await syncOsShareTargets();
  }

  /// Android direct-share shortcuts + iOS donated share intents (MRU).
  static Future<void> syncOsShareTargets() async {
    if (kIsWeb) return;
    if (!Platform.isAndroid && !Platform.isIOS) return;
    final recents = await getRecentProducts();
    await ShareTargetsPlatform.syncRecentTargets(recents);
  }

  static Future<List<({String id, String name})>> getRecentProducts() async {
    final p = await SharedPreferences.getInstance();
    final raw = p.getString(_recentProductsKey);
    if (raw != null && raw.isNotEmpty) {
      try {
        final decoded = jsonDecode(raw);
        if (decoded is List) {
          final out = <({String id, String name})>[];
          for (final e in decoded) {
            if (e is! Map) continue;
            final id = e['id']?.toString().trim();
            final n = e['name']?.toString().trim();
            if (id == null || id.isEmpty || n == null || n.isEmpty) continue;
            out.add((id: id, name: n));
          }
          if (out.isNotEmpty) return out;
        }
      } catch (_) {}
    }
    final id = p.getString(_lastProductId);
    final name = p.getString(_lastProductName);
    if (id != null && id.isNotEmpty && name != null && name.isNotEmpty) {
      return [(id: id, name: name)];
    }
    return [];
  }

  static Future<({String? id, String? name})> getLastProduct() async {
    final p = await SharedPreferences.getInstance();
    final id = p.getString(_lastProductId);
    final name = p.getString(_lastProductName);
    return (id: id, name: name);
  }

  static Future<void> clearLastProduct() async {
    final p = await SharedPreferences.getInstance();
    await p.remove(_lastProductId);
    await p.remove(_lastProductName);
    await syncOsShareTargets();
  }

  static Future<void> clearRecentProducts() async {
    final p = await SharedPreferences.getInstance();
    await p.remove(_recentProductsKey);
    await ShareTargetsPlatform.clearOsShareTargets();
  }

  static Future<void> savePendingSharePaths(List<String> paths) async {
    final p = await SharedPreferences.getInstance();
    await p.setString(_pendingPaths, jsonEncode(paths));
  }

  static Future<List<String>> readPendingSharePaths() async {
    final p = await SharedPreferences.getInstance();
    final raw = p.getString(_pendingPaths);
    if (raw == null || raw.isEmpty) return [];
    try {
      final list = jsonDecode(raw);
      if (list is! List) return [];
      return list.map((e) => e.toString()).where((s) => s.isNotEmpty).toList();
    } catch (_) {
      return [];
    }
  }

  static Future<void> clearPendingSharePaths() async {
    final p = await SharedPreferences.getInstance();
    await p.remove(_pendingPaths);
  }
}
