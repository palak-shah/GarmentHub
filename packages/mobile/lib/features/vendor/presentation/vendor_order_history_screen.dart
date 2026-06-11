import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_error.dart';
import '../vendor_providers.dart';
import 'vendor_ui_widgets.dart';

class VendorOrderHistoryScreen extends ConsumerWidget {
  const VendorOrderHistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(vendorIncomingProvider);
    final theme = Theme.of(context);
    final color = theme.colorScheme;

    return Scaffold(
      backgroundColor: color.surface,
      appBar: AppBar(title: const Text('Order history')),
      body: async.when(
        data: (list) {
          final done = list.where((e) => e is Map && e['status'] != 'PENDING').toList();
          if (done.isEmpty) {
            return Center(
              child: Text('No history yet', style: theme.textTheme.bodyLarge?.copyWith(color: color.onSurfaceVariant)),
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
            itemCount: done.length,
            separatorBuilder: (_, _) => const SizedBox(height: 12),
            itemBuilder: (context, i) {
              final it = done[i] as Map<String, dynamic>;
              final order = it['order'] is Map ? Map<String, dynamic>.from(it['order'] as Map) : <String, dynamic>{};
              final customerTitle = customerDisplayName(order);
              final status = it['status']?.toString() ?? '—';
              final qty = (it['requestedQty'] as num?)?.toInt() ?? 0;
              final when = formatVendorOrderDate(it['respondedAt']?.toString() ?? it['createdAt']?.toString());

              return VendorCard(
                onTap: () => showVendorOrderItemSheet(context, it),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            customerTitle,
                            style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 8,
                            runSpacing: 6,
                            crossAxisAlignment: WrapCrossAlignment.center,
                            children: [
                              OrderStatusChip(label: status),
                              QtyChip(qty: qty),
                            ],
                          ),
                          if (when.isNotEmpty) ...[
                            const SizedBox(height: 8),
                            Text(
                              when,
                              style: theme.textTheme.bodySmall?.copyWith(color: color.onSurfaceVariant, height: 1.3),
                            ),
                          ],
                        ],
                      ),
                    ),
                    Icon(Icons.chevron_right, color: color.onSurfaceVariant),
                  ],
                ),
              );
            },
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(apiErrorMessageVerbose(e)))),
      ),
    );
  }
}
