import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/config/environment.dart';
import '../../../core/network/api_error.dart';
import '../../orders/domain/bulk_order_draft.dart';

final _sharedPhotosFamily = FutureProvider.family<Map<String, dynamic>, String>((ref, id) async {
  return ref.read(curationApiProvider).getSharedPhotosForProduct(id);
});

/// Buyer shared-photo picker (PWA `CustomerSharedGallery`).
class CustomerSharedPhotosScreen extends ConsumerStatefulWidget {
  const CustomerSharedPhotosScreen({
    super.key,
    required this.productId,
    this.shareOrderContext,
  });

  final String productId;
  final ShareOrderContext? shareOrderContext;

  @override
  ConsumerState<CustomerSharedPhotosScreen> createState() => _CustomerSharedPhotosScreenState();
}

class _CustomerSharedPhotosScreenState extends ConsumerState<CustomerSharedPhotosScreen> {
  final Set<String> _selected = {};

  void _toggle(String imageId) {
    setState(() {
      if (_selected.contains(imageId)) {
        _selected.remove(imageId);
      } else {
        _selected.add(imageId);
      }
    });
  }

  void _selectAll(List<Map<String, dynamic>> photos) {
    setState(() {
      if (_selected.length == photos.length) {
        _selected.clear();
      } else {
        _selected
          ..clear()
          ..addAll(photos.map((p) => p['id'].toString()).where((id) => id.isNotEmpty));
      }
    });
  }

  void _goToBulkOrder(Map<String, dynamic> data, List<Map<String, dynamic>> sortedPhotos) {
    if (_selected.isEmpty) return;
    final prod = data['product'] is Map<String, dynamic> ? data['product'] as Map<String, dynamic> : <String, dynamic>{};
    final moq = (prod['moq'] as num?)?.toInt() ?? 1;

    String? traderId;
    var orderMode = widget.shareOrderContext?.orderMode ?? 'DIRECT';
    final idToUrl = <String, String>{};
    for (final ph in sortedPhotos) {
      final id = ph['id']?.toString();
      if (id == null || id.isEmpty) continue;
      idToUrl[id] = Environment.resolveMediaUrl(ph['url']?.toString());
      if (_selected.contains(id)) {
        traderId ??= ph['traderId']?.toString();
        final m = ph['orderMode']?.toString();
        if (m != null && m.isNotEmpty) orderMode = m;
      }
    }
    traderId ??= widget.shareOrderContext?.traderId;

    final lines = _selected.map((id) {
      return BulkOrderLine(
        productId: widget.productId,
        productImageId: id,
        quantity: moq,
        previewUrl: idToUrl[id],
      );
    }).toList();

    final draft = BulkOrderDraft(
      lines: lines,
      traderId: traderId,
      orderMode: orderMode == 'MANAGED' && (traderId == null || traderId.isEmpty) ? 'DIRECT' : orderMode,
    );
    context.push('/bulk-order', extra: draft);
  }

  List<Map<String, dynamic>> _sortedPhotos(Map<String, dynamic> data) {
    final raw = (data['photos'] as List?) ?? [];
    final list = <Map<String, dynamic>>[];
    for (final e in raw) {
      if (e is Map<String, dynamic>) list.add(e);
    }
    list.sort((a, b) {
      final ta = DateTime.tryParse(a['sharedAt']?.toString() ?? '') ?? DateTime.fromMillisecondsSinceEpoch(0);
      final tb = DateTime.tryParse(b['sharedAt']?.toString() ?? '') ?? DateTime.fromMillisecondsSinceEpoch(0);
      return tb.compareTo(ta);
    });
    return list;
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(_sharedPhotosFamily(widget.productId));
    return async.when(
      loading: () => Scaffold(
        appBar: AppBar(title: const Text('Shared photos')),
        body: const Center(child: CircularProgressIndicator()),
      ),
      error: (e, _) => Scaffold(
        appBar: AppBar(title: const Text('Shared photos')),
        body: Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(apiErrorMessageVerbose(e)))),
      ),
      data: (data) {
        final photos = _sortedPhotos(data);
        final scheme = Theme.of(context).colorScheme;
        return Scaffold(
          appBar: AppBar(
            title: const Text('Shared photos'),
            actions: [
              if (photos.isNotEmpty)
                TextButton(
                  onPressed: () => _selectAll(photos),
                  child: Text(_selected.length == photos.length ? 'Clear all' : 'Select all'),
                ),
            ],
          ),
          body: photos.isEmpty
              ? const Center(child: Text('No shared photos for this product yet.'))
              : GridView.builder(
                  padding: const EdgeInsets.all(8),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 3,
                    mainAxisSpacing: 8,
                    crossAxisSpacing: 8,
                  ),
                  itemCount: photos.length,
                  itemBuilder: (context, i) {
                    final ph = photos[i];
                    final id = ph['id']?.toString() ?? '';
                    final url = Environment.resolveMediaUrl(ph['url']?.toString());
                    final sel = _selected.contains(id);
                    return GestureDetector(
                      onTap: id.isEmpty ? null : () => _toggle(id),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(10),
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            border: Border.all(
                              color: sel ? scheme.primary : Colors.transparent,
                              width: 3,
                            ),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Stack(
                            fit: StackFit.expand,
                            children: [
                              ColoredBox(
                                color: scheme.surfaceContainerHighest,
                                child: url.isEmpty
                                    ? const Icon(Icons.image_not_supported_outlined)
                                    : Image.network(url, fit: BoxFit.cover),
                              ),
                              if (sel)
                                Positioned(
                                  top: 4,
                                  right: 4,
                                  child: Icon(Icons.check_circle, color: scheme.primary, size: 28),
                                ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
          bottomNavigationBar: photos.isEmpty
              ? null
              : SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                    child: FilledButton(
                      onPressed: _selected.isEmpty ? null : () => _goToBulkOrder(data, photos),
                      child: Text(_selected.isEmpty ? 'Select photos to order' : 'Order (${_selected.length})'),
                    ),
                  ),
                ),
        );
      },
    );
  }
}
