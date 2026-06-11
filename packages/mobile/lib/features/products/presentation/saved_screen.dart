import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/network/api_error.dart';
import '../../../shared/models/product.dart';
import '../../../shared/models/user.dart';
import '../../../shared/widgets/gh_empty_state.dart';
import '../../../shared/widgets/gh_product_grid_tile.dart';

final savedProductsProvider = FutureProvider<List<Product>>((ref) async {
  final list = await ref.read(productApiProvider).getSavedProducts();
  final out = <Product>[];
  for (final e in list) {
    if (e is Map) out.add(Product.fromJson(Map<String, dynamic>.from(e)));
  }
  return out;
});

class SavedScreen extends ConsumerWidget {
  const SavedScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(savedProductsProvider);
    final role = ref.watch(authSessionProvider.select((a) => a.user?.role));
    return Scaffold(
      appBar: AppBar(
        title: const Text('Saved'),
        centerTitle: false,
        titleTextStyle: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
      ),
      body: async.when(
        data: (list) {
          if (list.isEmpty) {
            return GhEmptyState(
              icon: Icons.bookmark_outline,
              title: 'Nothing saved yet',
              subtitle: 'Save products from the feed or search to find them here.',
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(savedProductsProvider),
            child: GridView.builder(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 88),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                mainAxisSpacing: 10,
                crossAxisSpacing: 10,
                childAspectRatio: 3 / 4,
              ),
              itemCount: list.length,
              itemBuilder: (context, i) {
                final p = list[i];
                final path = role == UserRole.trader ? '/products/${p.id}/gallery' : '/products/${p.id}';
                return GhProductGridTile(
                  product: p,
                  showCenterPrompt: false,
                  centerHint: '',
                  cornerPhotoCount: p.mediaCount > 0 ? p.mediaCount : null,
                  onTap: () => context.push(path),
                );
              },
            ),
          );
        },
        loading: () => GridView.builder(
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 88),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            mainAxisSpacing: 10,
            crossAxisSpacing: 10,
            childAspectRatio: 3 / 4,
          ),
          itemCount: 6,
          itemBuilder: (_, i) => _SkeletonTile(),
        ),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(apiErrorMessage(e), textAlign: TextAlign.center),
          ),
        ),
      ),
    );
  }
}

class _SkeletonTile extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: ColoredBox(
        color: Theme.of(context).colorScheme.surfaceContainerHigh,
        child: const SizedBox.expand(),
      ),
    );
  }
}
