import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_error.dart';
import '../../../shared/models/product.dart';
import '../vendor_providers.dart';

class VendorProductListScreen extends ConsumerWidget {
  const VendorProductListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(vendorProductsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('My products')),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/vendor/products/new'),
        child: const Icon(Icons.add),
      ),
      body: async.when(
        data: (list) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(vendorProductsProvider),
          child: ListView.builder(
            itemCount: list.length,
            itemBuilder: (context, i) {
              final p = list[i];
              return ListTile(
                leading: p.primaryImageUrl.isEmpty
                    ? const Icon(Icons.image_outlined)
                    : Image.network(p.primaryImageUrl, width: 48, height: 48, fit: BoxFit.cover),
                title: Text(p.name),
                subtitle: Text(p.statusLabel),
                onTap: () => context.push('/vendor/products/${p.id}/edit'),
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

extension on Product {
  String get statusLabel => raw['status']?.toString() ?? '';
}
