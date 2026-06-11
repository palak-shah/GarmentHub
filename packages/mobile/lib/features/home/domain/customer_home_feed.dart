import '../../../shared/models/product.dart';

/// Normalizes curated share payload (lines may be missing).
Map<String, dynamic> normalizeReceivedShareMap(Map<String, dynamic> share) {
  final products = share['products'];
  if (share['lines'] is List && (share['lines'] as List).isNotEmpty) {
    return share;
  }
  if (products is! List) return share;
  final lines = <Map<String, dynamic>>[];
  for (final p in products) {
    if (p is! Map<String, dynamic>) continue;
    final prod = p['product'] is Map<String, dynamic> ? p['product'] as Map<String, dynamic> : p;
    lines.add({
      'productImageId': null,
      'traderOfferUnitPrice': p['traderOfferUnitPrice'],
      'product': prod,
    });
  }
  return {...share, 'lines': lines};
}

class CustomerTraderRow {
  CustomerTraderRow({required this.product, required this.photoCount});
  final Product product;
  final int photoCount;
}

class CustomerTraderBucket {
  CustomerTraderBucket({required this.traderId, required this.traderName, required this.rows});
  final String traderId;
  final String traderName;
  final List<CustomerTraderRow> rows;
}

class CustomerDateBucket {
  CustomerDateBucket({required this.dateKey, required this.traders});
  final String dateKey;
  final List<CustomerTraderBucket> traders;
}

List<CustomerDateBucket> buildCustomerDateBuckets(List<Map<String, dynamic>> normalizedShares) {
  final byDay = <String, List<Map<String, dynamic>>>{};
  final sorted = [...normalizedShares]
    ..sort((a, b) => DateTime.parse(b['createdAt'] as String).compareTo(DateTime.parse(a['createdAt'] as String)));
  for (final s in sorted) {
    final dk = DateTime.parse(s['createdAt'] as String).toUtc().toIso8601String().substring(0, 10);
    byDay.putIfAbsent(dk, () => []).add(s);
  }
  final dayKeys = byDay.keys.toList()..sort((a, b) => b.compareTo(a));

  final out = <CustomerDateBucket>[];
  for (final dk in dayKeys) {
    final bucketShares = byDay[dk]!;
    final byTrader = <String, List<Map<String, dynamic>>>{};
    for (final s in bucketShares) {
      final trader = s['trader'];
      final tid = trader is Map ? trader['id']?.toString() ?? '' : '';
      if (tid.isEmpty) continue;
      byTrader.putIfAbsent(tid, () => []).add(s);
    }
    final traders = <CustomerTraderBucket>[];
    for (final tShares in byTrader.values) {
      final perProduct = <String, ({Product product, int photoCount})>{};
      final orderedOldestFirst = [...tShares]
        ..sort((a, b) => DateTime.parse(a['createdAt'] as String).compareTo(DateTime.parse(b['createdAt'] as String)));
      for (final share in orderedOldestFirst) {
        final norm = normalizeReceivedShareMap(share);
        final lines = norm['lines'] as List? ?? [];
        for (final line in lines) {
          if (line is! Map<String, dynamic>) continue;
          final prodMap = line['product'];
          if (prodMap is! Map<String, dynamic>) continue;
          final pid = prodMap['id'] as String?;
          if (pid == null) continue;
          final cur = perProduct[pid];
          if (cur == null) {
            perProduct[pid] = (product: Product.fromJson(prodMap), photoCount: 1);
          } else {
            perProduct[pid] = (product: Product.fromJson(prodMap), photoCount: cur.photoCount + 1);
          }
        }
      }
      final trader = tShares.first['trader'];
      String traderName = 'Trader';
      if (trader is Map) {
        traderName = trader['businessName']?.toString().trim().isNotEmpty == true
            ? trader['businessName'] as String
            : (trader['name']?.toString() ?? traderName);
      }
      traders.add(
        CustomerTraderBucket(
          traderId: tShares.first['trader'] is Map ? (tShares.first['trader'] as Map)['id'].toString() : '',
          traderName: traderName,
          rows: perProduct.values
              .map((e) => CustomerTraderRow(product: e.product, photoCount: e.photoCount))
              .toList(),
        ),
      );
    }
    traders.sort((a, b) => a.traderName.toLowerCase().compareTo(b.traderName.toLowerCase()));
    out.add(CustomerDateBucket(dateKey: dk, traders: traders));
  }
  return out;
}

/// PWA: sharesByTrader → flat unique products per trader (latest share order).
List<({String traderId, String traderLabel, List<Product> products})> buildTraderStories(
  List<Map<String, dynamic>> normalizedShares,
) {
  final byTrader = <String, List<Map<String, dynamic>>>{};
  for (final share in normalizedShares) {
    final trader = share['trader'];
    final tid = trader is Map ? trader['id']?.toString() ?? '' : '';
    if (tid.isEmpty) continue;
    byTrader.putIfAbsent(tid, () => []).add(share);
  }
  final groups = <({String traderId, String traderLabel, List<Product> products})>[];
  for (final e in byTrader.entries) {
    final tid = e.key;
    final shares = [...e.value]
      ..sort((a, b) => DateTime.parse(b['createdAt'] as String).compareTo(DateTime.parse(a['createdAt'] as String)));
    final trader = shares.first['trader'];
    String label = 'Trader';
    if (trader is Map) {
      label = trader['businessName']?.toString().trim().isNotEmpty == true
          ? trader['businessName'] as String
          : (trader['name']?.toString() ?? label);
    }
    final seen = <String>{};
    final products = <Product>[];
    for (final s in shares) {
      final norm = normalizeReceivedShareMap(s);
      final lines = norm['lines'] as List? ?? [];
      for (final line in lines) {
        if (line is! Map<String, dynamic>) continue;
        final pm = line['product'];
        if (pm is! Map<String, dynamic>) continue;
        final id = pm['id'] as String?;
        if (id == null || seen.contains(id)) continue;
        seen.add(id);
        products.add(Product.fromJson(pm));
      }
    }
    groups.add((traderId: tid, traderLabel: label, products: products));
  }
  groups.sort((a, b) {
    bool hasUnread(String tid) => normalizedShares.any((s) {
          final tr = s['trader'];
          final id = tr is Map ? tr['id']?.toString() : null;
          return id == tid && s['isRead'] != true;
        });
    final au = hasUnread(a.traderId);
    final bu = hasUnread(b.traderId);
    if (au != bu) return au ? -1 : 1;
    DateTime? latest(String tid) {
      DateTime? best;
      for (final s in normalizedShares) {
        final tr = s['trader'];
        final id = tr is Map ? tr['id']?.toString() : null;
        if (id != tid) continue;
        final t = DateTime.tryParse(s['createdAt'] as String? ?? '');
        if (t != null && (best == null || t.isAfter(best))) best = t;
      }
      return best;
    }
    final ta = latest(a.traderId);
    final tb = latest(b.traderId);
    if (ta != null && tb != null) return tb.compareTo(ta);
    return 0;
  });
  return groups;
}

List<Product> flattenFeedPage(Map<String, dynamic> page) {
  final n = page['newProducts'] as List? ?? [];
  final p = page['pendingProducts'] as List? ?? [];
  final d = page['doneProducts'] as List? ?? [];
  final out = <Product>[];
  for (final x in [...n, ...p, ...d]) {
    if (x is Map) out.add(Product.fromJson(Map<String, dynamic>.from(x)));
  }
  return out;
}

/// Curated-first + network remainder (PWA `customerFeed`), optional category filter.
List<Product> mergeCustomerFeed({
  required List<({String traderId, String traderLabel, List<Product> products})> stories,
  required List<Product> networkFlat,
  String? categoryId,
}) {
  final curatedIds = <String>{};
  for (final g in stories) {
    for (final p in g.products) {
      curatedIds.add(p.id);
    }
  }
  var curatedFirst = stories.expand((g) => g.products).toList();
  var networkRest = networkFlat.where((p) => !curatedIds.contains(p.id)).toList();
  if (categoryId != null && categoryId.isNotEmpty) {
    bool match(Product p) => p.categoryId == categoryId;
    curatedFirst = curatedFirst.where(match).toList();
    networkRest = networkRest.where(match).toList();
  }
  return [...curatedFirst, ...networkRest];
}

String formatShareSectionDateLabel(String dateKey) {
  if (dateKey == '_orphan') return 'Earlier shares';
  final today = DateTime.now().toUtc().toIso8601String().substring(0, 10);
  if (dateKey == today) return 'Today';
  final y = DateTime.now().subtract(const Duration(days: 1)).toUtc().toIso8601String().substring(0, 10);
  if (dateKey == y) return 'Yesterday';
  final dt = DateTime.tryParse('${dateKey}T12:00:00Z');
  if (dt == null) return dateKey;
  return '${dt.day} ${_monthShort(dt.month)} ${dt.year}';
}

String _monthShort(int m) {
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return names[m - 1];
}
