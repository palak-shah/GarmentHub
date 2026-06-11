import 'package:intl/intl.dart';

import '../../../shared/models/product.dart';

/// Matches PWA `formatRecipientPill` (`Home.tsx`).
String? formatRecipientPill(List<String> names) {
  final unique = names.map((n) => n.trim()).where((n) => n.isNotEmpty).toSet().toList()..sort();
  if (unique.isEmpty) return null;
  if (unique.length == 1) return unique[0];
  if (unique.length == 2) return '${unique[0]} · ${unique[1]}';
  return '${unique[0]} · ${unique[1]} +${unique.length - 2}';
}

/// PWA `formatShareSectionDateLabel` for trader sent-share sections (`Home.tsx`).
String formatTraderSharedSectionDateLabel(String dateKey) {
  if (dateKey == '_orphan') return 'Earlier shares';
  final today = DateTime.now().toUtc().toIso8601String().substring(0, 10);
  if (dateKey == today) return 'Today';
  final y = DateTime.fromMillisecondsSinceEpoch(DateTime.now().millisecondsSinceEpoch - 86400000)
      .toUtc()
      .toIso8601String()
      .substring(0, 10);
  if (dateKey == y) return 'Yesterday';
  final dt = DateTime.tryParse('${dateKey}T12:00:00.000Z');
  if (dt == null) return dateKey;
  return DateFormat('d MMM y', 'en_IN').format(dt.toUtc());
}

/// Product id → recipient summary (PWA `productSharedWithMap`).
Map<String, String> buildProductSharedWithMap(List<dynamic>? sentShares) {
  final map = <String, String>{};
  if (sentShares == null || sentShares.isEmpty) return map;

  final nameSets = <String, Set<String>>{};
  for (final raw in sentShares) {
    if (raw is! Map) continue;
    final share = Map<String, dynamic>.from(raw);
    final names = <String>[];
    final recipients = share['recipients'] as List? ?? [];
    for (final r in recipients) {
      if (r is! Map) continue;
      final rm = Map<String, dynamic>.from(r);
      final cust = rm['customer'];
      if (cust is! Map) continue;
      final cm = Map<String, dynamic>.from(cust);
      final business = cm['businessName']?.toString().trim() ?? '';
      final nm = cm['name']?.toString().trim() ?? '';
      final label = business.isNotEmpty ? business : nm;
      if (label.isNotEmpty) names.add(label);
    }
    final products = share['products'] as List? ?? [];
    for (final row in products) {
      if (row is! Map) continue;
      final pr = Map<String, dynamic>.from(row);
      final prod = pr['product'];
      String? pid;
      if (prod is Map) {
        pid = Map<String, dynamic>.from(prod)['id']?.toString();
      }
      if (pid == null || pid.isEmpty) continue;
      nameSets.putIfAbsent(pid, () => <String>{});
      for (final n in names) {
        nameSets[pid]!.add(n);
      }
    }
  }
  for (final e in nameSets.entries) {
    final pill = formatRecipientPill(e.value.toList());
    if (pill != null) map[e.key] = pill;
  }
  return map;
}

/// One product’s shared photos across all sent shares (newest share and its rows first).
class TraderSharedProductVisual {
  const TraderSharedProductVisual({
    required this.orderedImageIds,
    required this.idToUrl,
  });

  final List<String> orderedImageIds;
  final Map<String, String> idToUrl;

  String? get coverUrlRaw {
    for (final id in orderedImageIds) {
      final u = idToUrl[id];
      if (u != null && u.trim().isNotEmpty) return u.trim();
    }
    return null;
  }

  int get sharedPhotoCount => orderedImageIds.length;
}

String? _imageUrlForAssetOnProduct(Product? p, String imageId) {
  if (p == null || imageId.isEmpty) return null;
  final assets = p.raw['imageAssets'] ?? p.raw['image_assets'];
  if (assets is! List) return null;
  for (final e in assets) {
    if (e is! Map) continue;
    final m = Map<String, dynamic>.from(e);
    if (m['id']?.toString() == imageId) {
      final u = m['url']?.toString().trim();
      if (u != null && u.isNotEmpty) return u;
    }
  }
  return null;
}

/// Parses share line image id + url (API may use camelCase or snake_case; url may live only on workflow product).
({String id, String url})? _shareLineImageIdAndUrl(Map<String, dynamic> pr, Product? workflowProduct) {
  Map<String, dynamic>? im;
  final nested = pr['productImage'] ?? pr['product_image'];
  if (nested is Map) im = Map<String, dynamic>.from(nested);

  var iid = im?['id']?.toString().trim() ?? '';
  var url = im?['url']?.toString().trim() ?? '';

  if (iid.isEmpty) {
    final rawId = pr['productImageId'] ?? pr['product_image_id'];
    if (rawId != null) iid = rawId.toString().trim();
  }
  if (iid.isEmpty) return null;

  if (url.isEmpty) {
    url = _imageUrlForAssetOnProduct(workflowProduct, iid) ?? '';
  }
  return (id: iid, url: url);
}

Map<String, TraderSharedProductVisual> buildTraderSharedProductVisualMap(
  List<dynamic>? sentShares, {
  Map<String, Product>? workflowProductsById,
}) {
  final out = <String, TraderSharedProductVisual>{};
  if (sentShares == null || sentShares.isEmpty) return out;

  final sortedShares = <Map<String, dynamic>>[];
  for (final e in sentShares) {
    if (e is Map) sortedShares.add(Map<String, dynamic>.from(e));
  }
  sortedShares.sort((a, b) {
    final ta = DateTime.tryParse(a['createdAt']?.toString() ?? '')?.millisecondsSinceEpoch ?? 0;
    final tb = DateTime.tryParse(b['createdAt']?.toString() ?? '')?.millisecondsSinceEpoch ?? 0;
    return tb.compareTo(ta);
  });

  final orderedIdsByProduct = <String, List<String>>{};
  final idToUrlByProduct = <String, Map<String, String>>{};

  for (final share in sortedShares) {
    final rows = share['products'] as List? ?? [];
    for (final row in rows) {
      if (row is! Map) continue;
      final pr = Map<String, dynamic>.from(row);
      final prod = pr['product'];
      String? pid;
      if (prod is Map) pid = Map<String, dynamic>.from(prod)['id']?.toString();
      if (pid == null || pid.isEmpty) continue;

      final wf = workflowProductsById?[pid];
      final parsed = _shareLineImageIdAndUrl(pr, wf);
      if (parsed == null) continue;

      final list = orderedIdsByProduct.putIfAbsent(pid, () => <String>[]);
      if (list.contains(parsed.id)) continue;
      list.add(parsed.id);
      idToUrlByProduct.putIfAbsent(pid, () => <String, String>{})[parsed.id] = parsed.url;
    }
  }

  for (final e in orderedIdsByProduct.entries) {
    out[e.key] = TraderSharedProductVisual(
      orderedImageIds: e.value,
      idToUrl: idToUrlByProduct[e.key] ?? const {},
    );
  }
  return out;
}

class TraderSharedSection {
  const TraderSharedSection({required this.dateKey, required this.products});
  final String dateKey;
  final List<Product> products;
}

/// PWA `sharedGroupedSections` (`Home.tsx`).
List<TraderSharedSection> buildTraderSharedSections(List<dynamic>? sentShares, List<Product> workflowProducts) {
  if (sentShares == null || sentShares.isEmpty || workflowProducts.isEmpty) return [];

  final idSet = workflowProducts.map((p) => p.id).toSet();
  final byId = {for (final p in workflowProducts) p.id: p};

  final sortedShares = <Map<String, dynamic>>[];
  for (final e in sentShares) {
    if (e is Map) sortedShares.add(Map<String, dynamic>.from(e));
  }
  sortedShares.sort((a, b) {
    final ta = DateTime.tryParse(a['createdAt']?.toString() ?? '')?.millisecondsSinceEpoch ?? 0;
    final tb = DateTime.tryParse(b['createdAt']?.toString() ?? '')?.millisecondsSinceEpoch ?? 0;
    return tb.compareTo(ta);
  });

  final assigned = <String>{};
  final dateToProducts = <String, List<Product>>{};

  for (final share in sortedShares) {
    final created = DateTime.tryParse(share['createdAt']?.toString() ?? '');
    final dateKey = created != null ? created.toUtc().toIso8601String().substring(0, 10) : '';
    if (dateKey.isEmpty) continue;

    final rows = share['products'] as List? ?? [];
    for (final row in rows) {
      if (row is! Map) continue;
      final pr = Map<String, dynamic>.from(row);
      final prod = pr['product'];
      String? pid;
      if (prod is Map) pid = Map<String, dynamic>.from(prod)['id']?.toString();
      if (pid == null || pid.isEmpty || !idSet.contains(pid) || assigned.contains(pid)) continue;
      assigned.add(pid);
      final p = byId[pid];
      if (p == null) continue;
      dateToProducts.putIfAbsent(dateKey, () => []).add(p);
    }
  }

  final orphans = <Product>[];
  for (final p in workflowProducts) {
    if (!assigned.contains(p.id)) orphans.add(p);
  }
  if (orphans.isNotEmpty) {
    orphans.sort((a, b) {
      final ua = DateTime.tryParse(a.updatedAt ?? '')?.millisecondsSinceEpoch ?? 0;
      final ub = DateTime.tryParse(b.updatedAt ?? '')?.millisecondsSinceEpoch ?? 0;
      return ub.compareTo(ua);
    });
    dateToProducts['_orphan'] = orphans;
  }

  final normalDates = dateToProducts.keys.where((k) => k != '_orphan').toList()..sort((a, b) => b.compareTo(a));
  final sections = <TraderSharedSection>[];
  for (final dk in normalDates) {
    final prods = dateToProducts[dk];
    if (prods != null && prods.isNotEmpty) sections.add(TraderSharedSection(dateKey: dk, products: prods));
  }
  final orphanList = dateToProducts['_orphan'];
  if (orphanList != null && orphanList.isNotEmpty) {
    sections.add(TraderSharedSection(dateKey: '_orphan', products: orphanList));
  }
  return sections;
}

bool productMatchesTraderSharedSearch(Product p, String qLower, String sharedWithLower) {
  if (qLower.isEmpty) return true;
  if (p.name.toLowerCase().contains(qLower)) return true;
  final cat = p.categoryName?.toLowerCase() ?? '';
  if (cat.contains(qLower)) return true;
  final vn = p.vendorName?.toLowerCase() ?? '';
  if (vn.contains(qLower)) return true;
  final bn = p.brandName?.toLowerCase() ?? '';
  if (bn.contains(qLower)) return true;
  if (p.price != null && p.price.toString().contains(qLower)) return true;
  if (sharedWithLower.contains(qLower)) return true;
  return false;
}
