import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/network/api_error.dart';
import '../../../shared/models/order.dart';
import '../../../shared/models/product.dart';
import '../../../shared/models/user.dart';
import '../domain/order_workflow.dart';

final orderDetailFamily = FutureProvider.family<Order, String>((ref, id) async {
  final map = await ref.read(orderApiProvider).getById(id);
  return Order.fromJson(map);
});

class OrderDetailScreen extends ConsumerWidget {
  const OrderDetailScreen({super.key, required this.orderId});

  final String orderId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authSessionProvider);
    final async = ref.watch(orderDetailFamily(orderId));
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(
        title: Text('Order ${orderId.length > 6 ? orderId.substring(orderId.length - 6).toUpperCase() : orderId}'),
        centerTitle: false,
      ),
      body: async.when(
        data: (order) {
          final role = auth.user?.role ?? UserRole.customer;
          CustomerDecisionLabel? cl;
          TraderStage? ts;
          if (role == UserRole.customer) {
            cl = getCustomerOrderDecisionLabel(order, order.items);
          }
          if (role == UserRole.trader) {
            ts = getTraderOrderStage(order, order.items);
          }
          final managed = order.orderMode == 'MANAGED';

          return Column(
            children: [
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                  children: [
                    Card(
                      elevation: 0,
                      color: scheme.surfaceContainerLow,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (cl != null) ...[
                              Text(cl.headline, style: text.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                              if (cl.subline != null) ...[
                                const SizedBox(height: 6),
                                Text(cl.subline!, style: text.bodyMedium?.copyWith(color: scheme.onSurfaceVariant)),
                              ],
                            ] else if (ts != null) ...[
                              Text(ts.stageLabel, style: text.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                              const SizedBox(height: 6),
                              Text(ts.detail, style: text.bodyMedium?.copyWith(color: scheme.onSurfaceVariant)),
                            ] else ...[
                              Text('Order status', style: text.labelSmall?.copyWith(color: scheme.onSurfaceVariant)),
                              const SizedBox(height: 4),
                              Text(order.status, style: text.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                            ],
                            const SizedBox(height: 12),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: [
                                Chip(
                                  label: Text(order.status, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                                  backgroundColor: scheme.secondaryContainer,
                                  side: BorderSide.none,
                                ),
                                Chip(
                                  label: Text(managed ? 'Managed' : 'Direct', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                                  backgroundColor: managed ? scheme.primaryContainer : scheme.surfaceContainerHighest,
                                  side: BorderSide.none,
                                ),
                              ],
                            ),
                            if (order.note != null && order.note!.trim().isNotEmpty) ...[
                              const SizedBox(height: 12),
                              Text('Note', style: text.labelSmall?.copyWith(color: scheme.onSurfaceVariant)),
                              Text(order.note!, style: text.bodyMedium),
                            ],
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    Text('Line items', style: text.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 10),
                    for (final it in order.items)
                      Card(
                        elevation: 0,
                        margin: const EdgeInsets.only(bottom: 10),
                        color: scheme.surfaceContainerLow,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Row(
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(10),
                                child: SizedBox(
                                  width: 52,
                                  height: 52,
                                  child: _itemThumb(it, scheme),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(it.product['name']?.toString() ?? 'Product', style: text.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                                    const SizedBox(height: 4),
                                    Text('Qty ${it.requestedQty} · ${it.status}', style: text.bodySmall?.copyWith(color: scheme.onSurfaceVariant)),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              SafeArea(
                minimum: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                child: Builder(
                  builder: (context) {
                    final showConfirm = role == UserRole.customer && cl?.actionRequired == true;
                    final showRelease = role == UserRole.trader &&
                        order.orderMode == 'MANAGED' &&
                        order.releasedToVendorsAt == null &&
                        order.status == 'PENDING';
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        if (showConfirm)
                          FilledButton(
                            style: FilledButton.styleFrom(
                              minimumSize: const Size.fromHeight(48),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                            ),
                            onPressed: () async {
                              try {
                                await ref.read(orderApiProvider).confirm(orderId);
                                ref.invalidate(orderDetailFamily(orderId));
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Confirmed')));
                                }
                              } catch (e) {
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
                                }
                              }
                            },
                            child: const Text('Confirm order'),
                          ),
                        if (showConfirm && showRelease) const SizedBox(height: 10),
                        if (showRelease)
                          FilledButton(
                            style: FilledButton.styleFrom(
                              minimumSize: const Size.fromHeight(48),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                            ),
                            onPressed: () async {
                              try {
                                await ref.read(orderApiProvider).releaseToVendors(orderId);
                                ref.invalidate(orderDetailFamily(orderId));
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Released to vendors')));
                                }
                              } catch (e) {
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
                                }
                              }
                            },
                            child: const Text('Release to vendors'),
                          ),
                      ],
                    );
                  },
                ),
              ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(apiErrorMessage(e)))),
      ),
    );
  }

  static Widget _itemThumb(OrderItem it, ColorScheme scheme) {
    try {
      final p = Product.fromJson(it.product);
      final url = p.primaryImageUrl;
      if (url.isEmpty) {
        return ColoredBox(color: scheme.surfaceContainerHighest, child: Icon(Icons.image_outlined, color: scheme.onSurfaceVariant));
      }
      return Image.network(url, fit: BoxFit.cover);
    } catch (_) {
      return ColoredBox(color: scheme.surfaceContainerHighest, child: Icon(Icons.image_outlined, color: scheme.onSurfaceVariant));
    }
  }
}
