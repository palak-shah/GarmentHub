import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/network/api_error.dart';
import '../../../shared/widgets/gh_empty_state.dart';
import '../vendor_providers.dart';

class VendorOrderHistoryScreen extends ConsumerWidget {
  const VendorOrderHistoryScreen({super.key});

  static String? _firstImageUrl(Map<String, dynamic> product) {
    final images = product['images'];
    if (images is! List || images.isEmpty) return null;
    final first = images.first;
    if (first is String) return first;
    if (first is Map<String, dynamic>) return first['url']?.toString();
    return null;
  }

  static String? _formatIso(dynamic v) {
    if (v is! String || v.isEmpty) return null;
    final dt = DateTime.tryParse(v);
    if (dt == null) return v;
    return DateFormat.yMMMd().add_jm().format(dt.toLocal());
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final async = ref.watch(vendorIncomingProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Order history')),
      body: async.when(
        data: (list) {
          final done = list.where((e) => e is Map && e['status'] != 'PENDING').toList();
          if (done.isEmpty) {
            return const GhEmptyState(
              icon: Icons.history,
              title: 'No completed responses yet',
              subtitle: 'Accepted or declined line items will show here.',
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(vendorIncomingProvider),
            child: ListView.builder(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              itemCount: done.length,
              itemBuilder: (context, i) {
                final it = done[i] as Map<String, dynamic>;
                final product = it['product'] as Map<String, dynamic>? ?? {};
                final order = it['order'] as Map<String, dynamic>? ?? {};
                final name = product['name']?.toString() ?? 'Product';
                final status = it['status']?.toString() ?? '';
                final orderId = order['id'] as String? ?? '';
                final qty = it['requestedQty'];
                final thumb = _firstImageUrl(product);
                final when = _formatIso(it['respondedAt']) ?? _formatIso(it['createdAt']);

                return Card(
                  elevation: 0,
                  margin: const EdgeInsets.only(bottom: 10),
                  color: scheme.surfaceContainerLow,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  child: InkWell(
                    onTap: orderId.isEmpty ? null : () => context.push('/orders/$orderId'),
                    borderRadius: BorderRadius.circular(14),
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Row(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(10),
                            child: SizedBox(
                              width: 52,
                              height: 52,
                              child: thumb == null || thumb.isEmpty
                                  ? ColoredBox(
                                      color: scheme.surfaceContainerHighest,
                                      child: Icon(Icons.image_outlined, color: scheme.onSurfaceVariant, size: 22),
                                    )
                                  : Image.network(thumb, fit: BoxFit.cover),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(name, style: text.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                                const SizedBox(height: 6),
                                Wrap(
                                  spacing: 8,
                                  runSpacing: 6,
                                  children: [
                                    Chip(
                                      label: Text(status, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                                      visualDensity: VisualDensity.compact,
                                      padding: EdgeInsets.zero,
                                      backgroundColor: scheme.secondaryContainer,
                                      side: BorderSide.none,
                                    ),
                                    if (qty != null)
                                      Chip(
                                        label: Text('Qty $qty', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                                        visualDensity: VisualDensity.compact,
                                        padding: EdgeInsets.zero,
                                        backgroundColor: scheme.surfaceContainerHighest,
                                        side: BorderSide.none,
                                      ),
                                  ],
                                ),
                                if (when != null) ...[
                                  const SizedBox(height: 4),
                                  Text(when, style: text.labelSmall?.copyWith(color: scheme.onSurfaceVariant)),
                                ],
                              ],
                            ),
                          ),
                          if (orderId.isNotEmpty)
                            Icon(Icons.chevron_right_rounded, color: scheme.onSurfaceVariant),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(apiErrorMessage(e), textAlign: TextAlign.center),
          ),
        ),
      ),
    );
  }
}
