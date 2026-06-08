import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/config/environment.dart';
import '../../../core/network/api_error.dart';
import '../../../shared/models/product.dart';

final _productDetailFamily = FutureProvider.family<Product, String>((ref, id) async {
  final map = await ref.read(productApiProvider).getById(id);
  return Product.fromJson(map);
});

class ProductDetailScreen extends ConsumerWidget {
  const ProductDetailScreen({super.key, required this.productId});

  final String productId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(_productDetailFamily(productId));

    return Scaffold(
      appBar: AppBar(title: const Text('Product')),
      body: async.when(
        data: (p) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (p.images.isNotEmpty)
              SizedBox(
                height: 220,
                child: PageView(
                  children: [
                    for (final url in p.images)
                      Image.network(Environment.resolveMediaUrl(url), fit: BoxFit.contain),
                  ],
                ),
              ),
            Text(p.name, style: Theme.of(context).textTheme.headlineSmall),
            if (p.brandName != null) Text('Brand: ${p.brandName}'),
            if (p.vendorName != null) Text('Vendor: ${p.vendorName}'),
            if (p.price != null) Text('From ${p.price}'),
            if (p.moq != null) Text('MOQ: ${p.moq}'),
            const SizedBox(height: 16),
            Row(
              children: [
                FilledButton(
                  onPressed: () async {
                    try {
                      await ref.read(productApiProvider).saveProduct(productId);
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Saved')));
                      }
                    } catch (e) {
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
                      }
                    }
                  },
                  child: const Text('Save'),
                ),
                const SizedBox(width: 12),
                OutlinedButton(
                  onPressed: () async {
                    try {
                      await ref.read(productApiProvider).unsaveProduct(productId);
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Removed from saved')));
                      }
                    } catch (e) {
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
                      }
                    }
                  },
                  child: const Text('Unsave'),
                ),
              ],
            ),
          ],
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(apiErrorMessage(e))),
      ),
    );
  }
}
