import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/network/api_error.dart';
import '../../../shared/models/order.dart';
import '../../../shared/widgets/gh_empty_state.dart';

final adminOrdersProvider = FutureProvider<List<Order>>((ref) async {
  final list = await ref.read(adminApiProvider).getAllOrders();
  return list.map((e) => Order.fromJson(e as Map<String, dynamic>)).toList();
});

class AdminOrdersScreen extends ConsumerWidget {
  const AdminOrdersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final async = ref.watch(adminOrdersProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('All orders')),
      body: async.when(
        data: (orders) {
          if (orders.isEmpty) {
            return const GhEmptyState(
              icon: Icons.receipt_long_outlined,
              title: 'No orders',
              subtitle: 'Orders will appear here once customers place them.',
            );
          }
          return ListView.builder(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
            itemCount: orders.length,
            itemBuilder: (context, i) {
              final o = orders[i];
              final managed = o.orderMode == 'MANAGED';
              final parsed = DateTime.tryParse(o.createdAt);
              final dateStr = parsed != null
                  ? DateFormat.yMMMd().add_jm().format(parsed.toLocal())
                  : o.createdAt;
              return Card(
                elevation: 0,
                margin: const EdgeInsets.only(bottom: 10),
                color: scheme.surfaceContainerLow,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                child: InkWell(
                  onTap: () => context.push('/orders/${o.id}'),
                  borderRadius: BorderRadius.circular(14),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Row(
                      children: [
                        DecoratedBox(
                          decoration: BoxDecoration(
                            color: scheme.primaryContainer.withValues(alpha: 0.5),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(10),
                            child: Icon(Icons.receipt_long_outlined, color: scheme.onPrimaryContainer, size: 22),
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                o.id,
                                style: text.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 4),
                              Text(dateStr, style: text.bodySmall?.copyWith(color: scheme.onSurfaceVariant)),
                              const SizedBox(height: 8),
                              Wrap(
                                spacing: 8,
                                runSpacing: 6,
                                children: [
                                  Chip(
                                    label: Text(o.status, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                                    visualDensity: VisualDensity.compact,
                                    padding: EdgeInsets.zero,
                                    backgroundColor: scheme.secondaryContainer,
                                    side: BorderSide.none,
                                  ),
                                  Chip(
                                    label: Text(
                                      managed ? 'Managed' : 'Direct',
                                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
                                    ),
                                    visualDensity: VisualDensity.compact,
                                    padding: EdgeInsets.zero,
                                    backgroundColor: managed ? scheme.primaryContainer : scheme.surfaceContainerHighest,
                                    side: BorderSide.none,
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        Icon(Icons.chevron_right_rounded, color: scheme.onSurfaceVariant),
                      ],
                    ),
                  ),
                ),
              );
            },
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
