import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/network/api_error.dart';
import '../vendor_providers.dart';

class VendorIncomingOrdersScreen extends ConsumerWidget {
  const VendorIncomingOrdersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(vendorIncomingProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Incoming orders')),
      body: async.when(
        data: (list) {
          final pending = list.where((e) => e is Map && e['status'] == 'PENDING').toList();
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(vendorIncomingProvider),
            child: ListView.builder(
              itemCount: pending.length,
              itemBuilder: (context, i) {
                final it = pending[i] as Map<String, dynamic>;
                final product = it['product'] as Map<String, dynamic>? ?? {};
                final itemId = it['id'] as String? ?? '';
                return ListTile(
                  title: Text(product['name']?.toString() ?? 'Product'),
                  subtitle: Text('Qty ${it['requestedQty']}'),
                  trailing: FilledButton.tonal(
                    onPressed: () async {
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
                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
                        }
                      }
                    },
                    child: const Text('Accept'),
                  ),
                );
              },
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(apiErrorMessage(e))),
      ),
    );
  }
}
