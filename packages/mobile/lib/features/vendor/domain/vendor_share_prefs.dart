import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/platform/share_targets_platform.dart';

/// Persists vendor "latest product", MRU list, and **pinned** listings for share-from-Photos
/// (inbound screen + OS share sheet targets).
class VendorSharePrefs {
  VendorSharePrefs._();

  static const _lastProductId = 'vendor_last_product_id';
  static const _lastProductName = 'vendor_last_product_name';
  static const _pendingPaths = 'vendor_pending_share_paths_json';
  static const _pendingShareProductIdKey = 'vendor_pending_share_product_id';
  static const _pendingShareProductNameKey = 'vendor_pending_share_product_name';
  static const _recentProductsKey = 'vendor_recent_products_json';
  static const _pinnedForShareKey = 'vendor_pinned_share_products_json';
  static const _maxRecent = 8;

  /// In-app cap for pinned listings (OS may show fewer).
  static const maxPinnedForShareInApp = 32;

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

  /// Pinned listings first, then MRU (deduped by id). Used for OS share targets.
  static Future<List<({String id, String name})>> getOrderedShareTargetsForSync() async {
    final pins = await getPinnedForShare();
    final recent = await getRecentProducts();
    final seen = <String>{};
    final out = <({String id, String name})>[];
    for (final e in pins) {
      if (seen.add(e.id)) out.add(e);
    }
    for (final e in recent) {
      if (seen.add(e.id)) out.add(e);
    }
    return out;
  }

  /// Android direct-share shortcuts + iOS donated share intents (pins + MRU).
  static Future<void> syncOsShareTargets() async {
    if (kIsWeb) return;
    if (!Platform.isAndroid && !Platform.isIOS) return;
    final ordered = await getOrderedShareTargetsForSync();
    await ShareTargetsPlatform.syncRecentTargets(ordered);
  }

  static Future<List<({String id, String name})>> getPinnedForShare() async {
    final p = await SharedPreferences.getInstance();
    final raw = p.getString(_pinnedForShareKey);
    if (raw == null || raw.isEmpty) return [];
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! List) return [];
      final out = <({String id, String name})>[];
      for (final e in decoded) {
        if (e is! Map) continue;
        final id = e['id']?.toString().trim();
        final n = e['name']?.toString().trim();
        if (id == null || id.isEmpty || n == null || n.isEmpty) continue;
        out.add((id: id, name: n));
      }
      return out;
    } catch (_) {
      return [];
    }
  }

  static Future<Set<String>> getPinnedProductIds() async {
    final pins = await getPinnedForShare();
    return pins.map((e) => e.id).toSet();
  }

  /// Pin or unpin. Returns `true` if pin was requested but [maxPinnedForShareInApp] was reached.
  static Future<bool> togglePinForShare({required String id, required String name}) async {
    final p = await SharedPreferences.getInstance();
    final pins = await getPinnedForShare();
    if (pins.any((e) => e.id == id)) {
      final next = pins.where((e) => e.id != id).map((e) => {'id': e.id, 'name': e.name}).toList();
      await p.setString(_pinnedForShareKey, jsonEncode(next));
      await syncOsShareTargets();
      return false;
    }
    if (pins.length >= maxPinnedForShareInApp) {
      return true;
    }
    final next = <Map<String, String>>[
      ...pins.map((e) => {'id': e.id, 'name': e.name}),
      {'id': id, 'name': name},
    ];
    await p.setString(_pinnedForShareKey, jsonEncode(next));
    await syncOsShareTargets();
    return false;
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

  /// Clears MRU only; pinned listings stay. Re-syncs OS targets (pins + last product fallback).
  static Future<void> clearRecentProducts() async {
    final p = await SharedPreferences.getInstance();
    await p.remove(_recentProductsKey);
    await syncOsShareTargets();
  }

  /// Persists image paths for a share received before vendor session was ready.
  /// Optionally persists [productId] / [productName] from a direct-share shortcut.
  static Future<void> savePendingSharePaths(List<String> paths) async {
    await savePendingSharePathsWithProduct(paths);
  }

  static Future<void> savePendingSharePathsWithProduct(
    List<String> paths, {
    String? productId,
    String? productName,
  }) async {
    final p = await SharedPreferences.getInstance();
    await p.setString(_pendingPaths, jsonEncode(paths));
    final pid = productId?.trim();
    if (pid != null && pid.isNotEmpty) {
      await p.setString(_pendingShareProductIdKey, pid);
      final pn = productName?.trim();
      if (pn != null && pn.isNotEmpty) {
        await p.setString(_pendingShareProductNameKey, pn);
      } else {
        await p.remove(_pendingShareProductNameKey);
      }
    } else {
      await p.remove(_pendingShareProductIdKey);
      await p.remove(_pendingShareProductNameKey);
    }
  }

  static Future<({List<String> paths, String? productId, String? productName})> readPendingShareContext() async {
    final p = await SharedPreferences.getInstance();
    final raw = p.getString(_pendingPaths);
    List<String> paths = [];
    if (raw != null && raw.isNotEmpty) {
      try {
        final list = jsonDecode(raw);
        if (list is List) {
          paths = list.map((e) => e.toString()).where((s) => s.isNotEmpty).toList();
        }
      } catch (_) {}
    }
    final id = p.getString(_pendingShareProductIdKey)?.trim();
    final name = p.getString(_pendingShareProductNameKey);
    return (
      paths: paths,
      productId: (id != null && id.isNotEmpty) ? id : null,
      productName: (name != null && name.trim().isNotEmpty) ? name.trim() : null,
    );
  }

  static Future<List<String>> readPendingSharePaths() async {
    final ctx = await readPendingShareContext();
    return ctx.paths;
  }

  static Future<void> clearPendingSharePaths() async {
    final p = await SharedPreferences.getInstance();
    await p.remove(_pendingPaths);
    await p.remove(_pendingShareProductIdKey);
    await p.remove(_pendingShareProductNameKey);
  }
}
