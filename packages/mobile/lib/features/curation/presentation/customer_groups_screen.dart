import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/network/api_error.dart';

final customerGroupsProvider = FutureProvider<List<dynamic>>((ref) async {
  return ref.read(curationApiProvider).listCustomerGroups();
});

class CustomerGroupsScreen extends ConsumerWidget {
  const CustomerGroupsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(customerGroupsProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Customer groups'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () async {
              final name = await showDialog<String>(
                context: context,
                builder: (ctx) {
                  final c = TextEditingController();
                  return AlertDialog(
                    title: const Text('New group'),
                    content: TextField(controller: c, decoration: const InputDecoration(labelText: 'Name')),
                    actions: [
                      TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
                      FilledButton(onPressed: () => Navigator.pop(ctx, c.text.trim()), child: const Text('Create')),
                    ],
                  );
                },
              );
              if (name == null || name.isEmpty) return;
              try {
                await ref.read(curationApiProvider).createCustomerGroup({'name': name});
                ref.invalidate(customerGroupsProvider);
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessageVerbose(e))));
                }
              }
            },
          ),
        ],
      ),
      body: async.when(
        data: (list) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(customerGroupsProvider),
          child: ListView.builder(
            itemCount: list.length,
            itemBuilder: (context, i) {
              final g = list[i] as Map<String, dynamic>;
              final count = g['_count'] is Map ? (g['_count'] as Map)['members'] : null;
              return ListTile(
                title: Text(g['name']?.toString() ?? ''),
                subtitle: Text('Members: ${count ?? '?'}'),
                onTap: () => context.push('/trader/groups/${g['id']}'),
              );
            },
          ),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(apiErrorMessageVerbose(e))),
      ),
    );
  }
}
