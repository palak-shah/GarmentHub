import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_error.dart';
import '../vendor_providers.dart';

class VendorOrderHistoryScreen extends ConsumerWidget {
  const VendorOrderHistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(vendorIncomingProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Order history')),
      body: async.when(
        data: (list) {
          final done = list.where((e) => e is Map && e['status'] != 'PENDING').toList();
          return ListView.builder(
            itemCount: done.length,
            itemBuilder: (context, i) {
              final it = done[i] as Map<String, dynamic>;
              final product = it['product'] as Map<String, dynamic>? ?? {};
              return ListTile(
                title: Text(product['name']?.toString() ?? ''),
                subtitle: Text('${it['status']} · responded ${it['respondedAt'] ?? it['createdAt']}'),
              );
            },
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(apiErrorMessage(e))),
      ),
    );
  }
}
