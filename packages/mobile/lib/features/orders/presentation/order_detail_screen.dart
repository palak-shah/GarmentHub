import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/network/api_error.dart';
import '../../../shared/models/user.dart';
import '../domain/order_workflow.dart';
import '../../../shared/models/order.dart';

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

    return Scaffold(
      appBar: AppBar(title: Text('Order $orderId')),
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
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              if (cl != null) ...[
                Text(cl.headline, style: Theme.of(context).textTheme.titleLarge),
                if (cl.subline != null) Text(cl.subline!),
                const SizedBox(height: 12),
              ],
              if (ts != null) ...[
                Text(ts.stageLabel, style: Theme.of(context).textTheme.titleLarge),
                Text(ts.detail),
                const SizedBox(height: 12),
              ],
              Text('Status: ${order.status}'),
              if (order.note != null) Text('Note: ${order.note}'),
              const Divider(),
              for (final it in order.items)
                ListTile(
                  title: Text(it.product['name']?.toString() ?? 'Product'),
                  subtitle: Text('Qty ${it.requestedQty} · ${it.status}'),
                ),
              const SizedBox(height: 24),
              if (role == UserRole.customer && cl?.actionRequired == true)
                FilledButton(
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
              if (role == UserRole.trader &&
                  order.orderMode == 'MANAGED' &&
                  order.releasedToVendorsAt == null &&
                  order.status == 'PENDING')
                FilledButton(
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
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(apiErrorMessage(e))),
      ),
    );
  }
}
