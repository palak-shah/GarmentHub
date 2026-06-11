import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/network/api_error.dart';

final adminCategoriesProvider = FutureProvider<List<dynamic>>((ref) async {
  return ref.read(adminApiProvider).getCategories();
});

class AdminSettingsScreen extends ConsumerWidget {
  const AdminSettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(adminCategoriesProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Categories')),
      floatingActionButton: FloatingActionButton(
        onPressed: () async {
          final name = await showDialog<String>(
            context: context,
            builder: (ctx) {
              final c = TextEditingController();
              return AlertDialog(
                title: const Text('New category'),
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
            await ref.read(adminApiProvider).createCategory(name, null);
            ref.invalidate(adminCategoriesProvider);
          } catch (e) {
            if (context.mounted) {
              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessageVerbose(e))));
            }
          }
        },
        child: const Icon(Icons.add),
      ),
      body: async.when(
        data: (list) => ListView.builder(
          itemCount: list.length,
          itemBuilder: (context, i) {
            final c = list[i] as Map<String, dynamic>;
            final attrs = (c['attributes'] as List?) ?? [];
            return ExpansionTile(
              title: Text(c['name']?.toString() ?? ''),
              subtitle: Text('${attrs.length} attributes'),
              children: [
                for (final a in attrs)
                  if (a is Map)
                    ListTile(
                      dense: true,
                      title: Text(a['name']?.toString() ?? ''),
                    ),
              ],
            );
          },
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(apiErrorMessageVerbose(e))),
      ),
    );
  }
}
