import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/network/api_error.dart';

final customerGroupDetailFamily = FutureProvider.family<Map<String, dynamic>, String>((ref, id) async {
  return ref.read(curationApiProvider).getCustomerGroup(id);
});

class CustomerGroupDetailScreen extends ConsumerWidget {
  const CustomerGroupDetailScreen({super.key, required this.groupId});

  final String groupId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(customerGroupDetailFamily(groupId));
    return Scaffold(
      appBar: AppBar(title: const Text('Group')),
      body: async.when(
        data: (g) {
          final members = (g['members'] as List?) ?? [];
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(g['name']?.toString() ?? '', style: Theme.of(context).textTheme.titleLarge),
              const Divider(),
              for (final m in members)
                if (m is Map<String, dynamic>)
                  ListTile(
                    title: Text(m['customer'] is Map ? (m['customer']['name'] ?? '').toString() : ''),
                    subtitle: Text(m['customerId']?.toString() ?? ''),
                  ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(apiErrorMessageVerbose(e))),
      ),
    );
  }
}
