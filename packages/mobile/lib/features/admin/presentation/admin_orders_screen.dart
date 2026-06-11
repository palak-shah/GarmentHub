import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/network/api_error.dart';
import '../../../shared/models/order.dart';

final adminOrdersProvider = FutureProvider<List<Order>>((ref) async {
  final list = await ref.read(adminApiProvider).getAllOrders();
  return list.map((e) => Order.fromJson(e as Map<String, dynamic>)).toList();
});

class AdminOrdersScreen extends ConsumerWidget {
  const AdminOrdersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(adminOrdersProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('All orders')),
      body: async.when(
        data: (orders) => ListView.builder(
          itemCount: orders.length,
          itemBuilder: (context, i) {
            final o = orders[i];
            return ListTile(
              title: Text(o.id),
              subtitle: Text(o.status),
              onTap: () => context.push('/orders/${o.id}'),
            );
          },
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(apiErrorMessageVerbose(e))),
      ),
    );
  }
}
