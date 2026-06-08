import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/network/api_error.dart';
import '../../../shared/models/order.dart';

final ordersListProvider = FutureProvider<List<Order>>((ref) async {
  final raw = await ref.read(orderApiProvider).list();
  if (raw is List) {
    final out = <Order>[];
    for (final e in raw) {
      if (e is Map<String, dynamic>) {
        if (e.containsKey('items')) {
          out.add(Order.fromJson(e));
        }
      }
    }
    return out;
  }
  return [];
});

class OrdersListScreen extends ConsumerWidget {
  const OrdersListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(ordersListProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Orders')),
      body: async.when(
        data: (orders) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(ordersListProvider),
          child: ListView.builder(
            itemCount: orders.length,
            itemBuilder: (context, i) {
              final o = orders[i];
              final preview = o.previewProduct();
              return ListTile(
                title: Text('Order ${o.id.substring(0, 8)}…'),
                subtitle: Text('${o.status} · ${o.items.length} lines'),
                trailing: preview != null && preview.primaryImageUrl.isNotEmpty
                    ? Image.network(preview.primaryImageUrl, width: 48, height: 48, fit: BoxFit.cover)
                    : null,
                onTap: () => context.push('/orders/${o.id}'),
              );
            },
          ),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(apiErrorMessage(e))),
      ),
    );
  }
}
