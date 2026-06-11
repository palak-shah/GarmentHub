import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../../core/platform/android_direct_share.dart';

const _recentKey = 'vendor_share_recent_products_v1';
const _pendingPathsKey = 'vendor_share_pending_paths_v1';
const _maxStored = 32;

class _Entry {
  _Entry({
    required this.id,
    required this.name,
    required this.thumbnailUrl,
    required this.lastUsedMs,
    required this.useCount,
    required this.pinned,
  });

  final String id;
  final String name;
  final String thumbnailUrl;
  final int lastUsedMs;
  final int useCount;
  final bool pinned;

  Map<String, Object?> toJson() => {
        'id': id,
        'name': name,
        'thumbnailUrl': thumbnailUrl,
        'lastUsedMs': lastUsedMs,
        'useCount': useCount,
        'pinned': pinned,
      };

  static _Entry? fromMap(Map<dynamic, dynamic> m) {
    final id = m['id']?.toString().trim();
    final name = m['name']?.toString().trim();
    if (id == null || id.isEmpty || name == null || name.isEmpty) return null;
    return _Entry(
      id: id,
      name: name,
      thumbnailUrl: m['thumbnailUrl']?.toString().trim() ?? '',
      lastUsedMs: _asInt(m['lastUsedMs']),
      useCount: _asInt(m['useCount']),
      pinned: m['pinned'] == true,
    );
  }

  static int _asInt(Object? v) {
    if (v is int) return v;
    if (v is num) return v.toInt();
    if (v is String) return int.tryParse(v.trim()) ?? 0;
    return 0;
  }

  int compareForShare(_Entry o) {
    if (pinned != o.pinned) return pinned ? -1 : 1;
    final t = o.lastUsedMs.compareTo(lastUsedMs);
    if (t != 0) return t;
    return o.useCount.compareTo(useCount);
  }
}

/// MRU + Android Sharing Shortcuts sync for vendors.
class VendorSharePrefs {
  VendorSharePrefs._();

  static Future<List<_Entry>> _loadAll() async {
    final p = await SharedPreferences.getInstance();
    final raw = p.getString(_recentKey);
    if (raw == null || raw.isEmpty) return [];
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! List) return [];
      final out = <_Entry>[];
      for (final e in decoded) {
        if (e is Map) {
          final en = _Entry.fromMap(Map<dynamic, dynamic>.from(e));
          if (en != null) out.add(en);
        }
      }
      return out;
    } catch (_) {
      return [];
    }
  }

  static Future<void> _saveAll(List<_Entry> list) async {
    final p = await SharedPreferences.getInstance();
    await p.setString(_recentKey, jsonEncode(list.map((e) => e.toJson()).toList()));
  }

  static List<_Entry> _ranked(List<_Entry> all) {
    final copy = [...all]..sort((a, b) => a.compareForShare(b));
    return copy.take(8).toList();
  }

  static Future<void> recordProductUsage({
    required String id,
    required String name,
    String? thumbnailUrl,
  }) async {
    if (kIsWeb) return;
    final now = DateTime.now().millisecondsSinceEpoch;
    var list = await _loadAll();
    final prev = list.where((e) => e.id == id).toList();
    final prevEntry = prev.isEmpty ? null : prev.first;
    list = list.where((e) => e.id != id).toList();
    final thumb = (thumbnailUrl != null && thumbnailUrl.trim().isNotEmpty)
        ? thumbnailUrl.trim()
        : (prevEntry?.thumbnailUrl ?? '');
    final use = (prevEntry?.useCount ?? 0) + 1;
    final pinned = prevEntry?.pinned ?? false;
    list.insert(
      0,
      _Entry(
        id: id,
        name: name,
        thumbnailUrl: thumb,
        lastUsedMs: now,
        useCount: use,
        pinned: pinned,
      ),
    );
    list.sort((a, b) => a.compareForShare(b));
    if (list.length > _maxStored) {
      list = list.sublist(0, _maxStored);
    }
    await _saveAll(list);
    await syncAndroidDirectShare();
  }

  static Future<List<({String id, String name})>> getRecentProducts() async {
    final ranked = _ranked(await _loadAll());
    return ranked.map((e) => (id: e.id, name: e.name)).toList();
  }

  static Future<void> syncAndroidDirectShare() async {
    if (kIsWeb || !Platform.isAndroid) return;
    final ranked = _ranked(await _loadAll());
    final payloads = ranked
        .map(
          (e) => ShareProductPayload(
            productId: e.id,
            productName: e.name,
            thumbnailUrl: e.thumbnailUrl,
            pinnedFlag: e.pinned,
            lastUsedTimestamp: e.lastUsedMs,
            useCount: e.useCount,
          ),
        )
        .toList();
    await AndroidDirectShare.publishRecentProducts(payloads);
  }

  static Future<void> clearAll() async {
    final p = await SharedPreferences.getInstance();
    await p.remove(_recentKey);
    await p.remove(_pendingPathsKey);
    await AndroidDirectShare.clearPublishedProducts();
  }

  static Future<void> savePendingSharePaths(List<String> paths) async {
    final p = await SharedPreferences.getInstance();
    await p.setString(_pendingPathsKey, jsonEncode(paths));
  }

  static Future<List<String>> readPendingSharePaths() async {
    final p = await SharedPreferences.getInstance();
    final raw = p.getString(_pendingPathsKey);
    if (raw == null || raw.isEmpty) return [];
    try {
      final d = jsonDecode(raw);
      if (d is! List) return [];
      return d.map((e) => e.toString()).where((s) => s.isNotEmpty).toList();
    } catch (_) {
      return [];
    }
  }

  static Future<void> clearPendingSharePaths() async {
    final p = await SharedPreferences.getInstance();
    await p.remove(_pendingPathsKey);
  }
}
