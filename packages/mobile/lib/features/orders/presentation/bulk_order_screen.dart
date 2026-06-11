import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/network/api_error.dart';
import '../../../shared/models/product.dart';
import '../domain/bulk_order_draft.dart';

class _PackedRow {
  _PackedRow({
    required this.lineKey,
    required this.product,
    this.productImageId,
    required this.defaultQty,
    this.previewUrl,
  });

  final String lineKey;
  final Product product;
  final String? productImageId;
  final int defaultQty;
  final String? previewUrl;
}

class BulkOrderScreen extends ConsumerStatefulWidget {
  const BulkOrderScreen({super.key, this.draft});

  final BulkOrderDraft? draft;

  @override
  ConsumerState<BulkOrderScreen> createState() => _BulkOrderScreenState();
}

class _BulkOrderScreenState extends ConsumerState<BulkOrderScreen> {
  List<_PackedRow>? _rows;
  final Map<String, int> _quantities = {};
  Object? _loadError;
  bool _loading = true;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    final d = widget.draft;
    if (d == null || d.lines.isEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) context.go('/');
      });
      return;
    }
    _load(d);
  }

  Future<void> _load(BulkOrderDraft d) async {
    setState(() {
      _loading = true;
      _loadError = null;
    });
    try {
      final uids = d.lines.map((l) => l.productId).toSet().toList();
      final maps = await Future.wait(uids.map((id) => ref.read(productApiProvider).getById(id)));
      final pmap = <String, Product>{};
      for (var i = 0; i < uids.length; i++) {
        pmap[uids[i]] = Product.fromJson(maps[i]);
      }
      final rows = <_PackedRow>[];
      for (var idx = 0; idx < d.lines.length; idx++) {
        final line = d.lines[idx];
        final prod = pmap[line.productId];
        if (prod == null) continue;
        final lineKey = '${line.productId}_${line.productImageId ?? idx}';
        rows.add(
          _PackedRow(
            lineKey: lineKey,
            product: prod,
            productImageId: line.productImageId,
            defaultQty: line.quantity > 0 ? line.quantity : (prod.moq ?? 1),
            previewUrl: line.previewUrl,
          ),
        );
      }
      if (!mounted) return;
      setState(() {
        _rows = rows;
        _quantities.clear();
        for (final r in rows) {
          _quantities[r.lineKey] = r.defaultQty;
        }
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loadError = e;
        _loading = false;
      });
    }
  }

  int _qty(String lineKey, int moq) {
    final q = _quantities[lineKey] ?? moq;
    return q < moq ? moq : q;
  }

  void _adjust(String lineKey, int delta, int moq) {
    setState(() {
      final cur = _qty(lineKey, moq);
      final next = cur + delta;
      _quantities[lineKey] = next < moq ? moq : next;
    });
  }

  Future<void> _placeOrder(BulkOrderDraft d) async {
    final rows = _rows;
    if (rows == null || rows.isEmpty) return;
    setState(() => _submitting = true);
    try {
      final items = <Map<String, dynamic>>[];
      for (final r in rows) {
        final q = _qty(r.lineKey, r.product.moq ?? 1);
        items.add({
          'productId': r.product.id,
          'quantity': q,
          if (r.productImageId != null && r.productImageId!.isNotEmpty) 'productImageId': r.productImageId,
        });
      }
      var mode = d.orderMode;
      final tid = d.traderId;
      if (mode == 'MANAGED' && (tid == null || tid.isEmpty)) {
        mode = 'DIRECT';
      }
      await ref.read(orderApiProvider).create({
        'items': items,
        'orderMode': mode,
        if (tid != null && tid.isNotEmpty) 'traderId': tid,
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Order placed!')));
      context.go('/orders');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessageVerbose(e))));
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final d = widget.draft;
    if (d == null || d.lines.isEmpty) {
      return const Scaffold(body: SizedBox.shrink());
    }

    if (_loading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Review order')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_loadError != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Review order')),
        body: Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(apiErrorMessageVerbose(_loadError!)))),
      );
    }

    final rows = _rows ?? [];
    if (rows.isEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) context.go('/');
      });
      return const Scaffold(body: SizedBox.shrink());
    }

    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Review order')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            'Set quantity for each line (minimum MOQ per product).',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: scheme.onSurfaceVariant),
          ),
          const SizedBox(height: 16),
          for (final r in rows) ...[
            Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: SizedBox(
                        width: 64,
                        height: 64,
                        child: (r.previewUrl != null && r.previewUrl!.isNotEmpty)
                            ? Image.network(r.previewUrl!, fit: BoxFit.cover)
                            : (r.product.primaryImageUrl.isNotEmpty
                                ? Image.network(r.product.primaryImageUrl, fit: BoxFit.cover)
                                : ColoredBox(color: scheme.surfaceContainerHighest, child: const Icon(Icons.image_outlined))),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(r.product.name, style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                          const SizedBox(height: 4),
                          Text('MOQ ${r.product.moq ?? 1}', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: scheme.onSurfaceVariant)),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              IconButton.filledTonal(
                                onPressed: () => _adjust(r.lineKey, -1, r.product.moq ?? 1),
                                icon: const Icon(Icons.remove),
                              ),
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 12),
                                child: Text(
                                  '${_qty(r.lineKey, r.product.moq ?? 1)}',
                                  style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                                ),
                              ),
                              IconButton.filledTonal(
                                onPressed: () => _adjust(r.lineKey, 1, r.product.moq ?? 1),
                                icon: const Icon(Icons.add),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 8),
          ],
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _submitting ? null : () => _placeOrder(d),
            child: _submitting
                ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Text('Place order'),
          ),
        ],
      ),
    );
  }
}
