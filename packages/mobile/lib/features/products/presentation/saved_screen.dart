import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/network/api_error.dart';
import '../../../shared/models/product.dart';

final savedProductsProvider = FutureProvider<List<Product>>((ref) async {
  final list = await ref.read(productApiProvider).getSavedProducts();
  return list.map((e) => Product.fromJson(e as Map<String, dynamic>)).toList();
});

class SavedScreen extends ConsumerWidget {
  const SavedScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(savedProductsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Saved')),
      body: async.when(
        data: (list) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(savedProductsProvider),
          child: ListView.builder(
            itemCount: list.length,
            itemBuilder: (context, i) {
              final p = list[i];
              return ListTile(
                leading: p.primaryImageUrl.isEmpty
                    ? const Icon(Icons.bookmark_outline)
                    : Image.network(p.primaryImageUrl, width: 48, height: 48, fit: BoxFit.cover),
                title: Text(p.name),
                onTap: () => context.push('/products/${p.id}'),
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
