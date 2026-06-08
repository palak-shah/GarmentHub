import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/network/api_error.dart';

final vendorBrandsProvider = FutureProvider<List<dynamic>>((ref) async {
  return ref.read(brandApiProvider).listMy();
});

class VendorBrandListScreen extends ConsumerWidget {
  const VendorBrandListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(vendorBrandsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Brands')),
      floatingActionButton: FloatingActionButton(
        onPressed: () async {
          final name = await showDialog<String>(
            context: context,
            builder: (ctx) {
              final c = TextEditingController();
              return AlertDialog(
                title: const Text('New brand'),
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
            await ref.read(brandApiProvider).create(name);
            ref.invalidate(vendorBrandsProvider);
          } catch (e) {
            if (context.mounted) {
              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
            }
          }
        },
        child: const Icon(Icons.add),
      ),
      body: async.when(
        data: (list) => ListView.builder(
          itemCount: list.length,
          itemBuilder: (context, i) {
            final b = list[i] as Map<String, dynamic>;
            return ListTile(title: Text(b['name']?.toString() ?? ''));
          },
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(apiErrorMessage(e))),
      ),
    );
  }
}
