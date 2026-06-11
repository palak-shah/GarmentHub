import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/network/api_error.dart';
import '../../../shared/widgets/gh_empty_state.dart';
import '../vendor_providers.dart';

class VendorIncomingOrdersScreen extends ConsumerWidget {
  const VendorIncomingOrdersScreen({super.key});

  static String? _firstImageUrl(Map<String, dynamic> product) {
    final images = product['images'];
    if (images is! List || images.isEmpty) return null;
    final first = images.first;
    if (first is String) return first;
    if (first is Map<String, dynamic>) return first['url']?.toString();
    return null;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final async = ref.watch(vendorIncomingProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Incoming orders')),
      body: async.when(
        data: (list) {
          final pending = list.where((e) => e is Map && e['status'] == 'PENDING').toList();
          if (pending.isEmpty) {
            return GhEmptyState(
              icon: Icons.inbox_outlined,
              title: 'Nothing pending',
              subtitle: 'Released line items that need your response appear here.',
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(vendorIncomingProvider),
            child: ListView.builder(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              itemCount: pending.length,
              itemBuilder: (context, i) {
                final it = pending[i] as Map<String, dynamic>;
                final product = it['product'] as Map<String, dynamic>? ?? {};
                final order = it['order'] as Map<String, dynamic>? ?? {};
                final itemId = it['id'] as String? ?? '';
                final orderId = order['id'] as String? ?? '';
                final name = product['name']?.toString() ?? 'Product';
                final qty = it['requestedQty'];
                final thumb = _firstImageUrl(product);
                final created = order['createdAt'];
                String? dateLine;
                if (created is String) {
                  final dt = DateTime.tryParse(created);
                  if (dt != null) dateLine = DateFormat.yMMMd().add_jm().format(dt.toLocal());
                }

                return Card(
                  elevation: 0,
                  margin: const EdgeInsets.only(bottom: 12),
                  color: scheme.surfaceContainerLow,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
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
                                  const SizedBox(height: 4),
                                  Text('Qty $qty · Pending', style: text.bodySmall?.copyWith(color: scheme.onSurfaceVariant)),
                                  if (dateLine != null) Text(dateLine, style: text.labelSmall?.copyWith(color: scheme.onSurfaceVariant)),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            if (orderId.isNotEmpty)
                              TextButton(
                                onPressed: () => context.push('/orders/$orderId'),
                                child: const Text('View order'),
                              ),
                            const Spacer(),
                            FilledButton.tonal(
                              onPressed: () async {
                                try {
                                  await ref.read(vendorApiProvider).respondToItem(itemId, {'action': 'ACCEPT'});
                                  ref.invalidate(vendorIncomingProvider);
                                  if (context.mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Accepted')));
                                  }
                                } catch (e) {
                                  if (context.mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
                                  }
                                }
                              },
                              child: const Text('Accept'),
                            ),
                          ],
                        ),
                      ],
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
