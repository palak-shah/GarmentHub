import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/network/api_error.dart';
import '../vendor_providers.dart';
import 'vendor_ui_widgets.dart';

class VendorIncomingOrdersScreen extends ConsumerWidget {
  const VendorIncomingOrdersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(vendorIncomingProvider);
    final theme = Theme.of(context);
    final color = theme.colorScheme;

    return Scaffold(
      backgroundColor: color.surface,
      appBar: AppBar(title: const Text('Incoming orders')),
      body: async.when(
        data: (list) {
          final pending = list.where((e) => e is Map && e['status'] == 'PENDING').toList();
          if (pending.isEmpty) {
            return RefreshIndicator(
              onRefresh: () async => ref.invalidate(vendorIncomingProvider),
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: const [
                  SizedBox(height: 120),
                  Center(child: Text('No pending orders')),
                ],
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(vendorIncomingProvider),
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              itemCount: pending.length,
              separatorBuilder: (_, _) => const SizedBox(height: 12),
              itemBuilder: (context, i) {
                final it = pending[i] as Map<String, dynamic>;
                final order = it['order'] is Map ? Map<String, dynamic>.from(it['order'] as Map) : <String, dynamic>{};
                final product = it['product'] is Map ? Map<String, dynamic>.from(it['product'] as Map) : <String, dynamic>{};
                final customerTitle = customerDisplayName(order);
                final productName = product['name']?.toString() ?? 'Product';
                final qty = it['requestedQty'];
                final qtyStr = qty == null ? '' : '$qty';
                final statusLabel = it['status']?.toString() ?? 'PENDING';
                final when = formatVendorOrderDate(it['createdAt']?.toString() ?? order['createdAt']?.toString());

                return VendorCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        customerTitle,
                        style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        productName,
                        style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w500, height: 1.3),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Qty $qtyStr · $statusLabel',
                        style: theme.textTheme.bodySmall?.copyWith(color: color.onSurfaceVariant, height: 1.3),
                      ),
                      if (when.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Text(
                          when,
                          style: theme.textTheme.bodySmall?.copyWith(color: color.onSurfaceVariant, height: 1.3),
                        ),
                      ],
                      const SizedBox(height: 14),
                      Row(
                        children: [
                          VendorPrimaryTextButton(
                            label: 'View order',
                            onPressed: () => showVendorOrderItemSheet(context, it),
                          ),
                          const Spacer(),
                          VendorAcceptButton(
                            onPressed: () async {
                              final itemId = it['id'] as String? ?? '';
                              try {
                                await ref.read(vendorApiProvider).respondToItem(itemId, {
                                  'action': 'ACCEPT',
                                });
                                ref.invalidate(vendorIncomingProvider);
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Accepted')));
                                }
                              } catch (e) {
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessageVerbose(e))));
                                }
                              }
                            },
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              },
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(apiErrorMessageVerbose(e)))),
      ),
    );
  }
}
