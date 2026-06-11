import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/network/api_error.dart';
import '../../../shared/models/product.dart';
import '../../../shared/models/user.dart';
import '../../../shared/widgets/gh_empty_state.dart';
import '../../../shared/widgets/gh_product_grid_tile.dart';

class ProductListScreen extends ConsumerStatefulWidget {
  const ProductListScreen({super.key});

  @override
  ConsumerState<ProductListScreen> createState() => _ProductListScreenState();
}

class _ProductListScreenState extends ConsumerState<ProductListScreen> {
  final _search = TextEditingController();
  List<Product> _products = [];
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await ref.read(productApiProvider).list(query: {
        'search': _search.text.trim().isEmpty ? null : _search.text.trim(),
        'page': 1,
        'limit': 24,
      });
      final list = (data['products'] as List?) ?? [];
      final out = <Product>[];
      for (final e in list) {
        if (e is Map) out.add(Product.fromJson(Map<String, dynamic>.from(e)));
      }
      setState(() {
        _products = out;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = apiErrorMessage(e);
        _loading = false;
      });
    }
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Search'),
        centerTitle: false,
        titleTextStyle: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
            child: SearchBar(
              controller: _search,
              hintText: 'Search products…',
              leading: const Icon(Icons.search),
              trailing: [
                IconButton(icon: const Icon(Icons.send), onPressed: _loading ? null : _load),
              ],
              onSubmitted: (_) => _load(),
            ),
          ),
          if (_loading) const LinearProgressIndicator(minHeight: 2),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.all(12),
              child: Text(_error!, style: TextStyle(color: scheme.error)),
            ),
          Expanded(
            child: _loading && _products.isEmpty
                ? GridView.builder(
                    padding: const EdgeInsets.all(12),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      mainAxisSpacing: 10,
                      crossAxisSpacing: 10,
                      childAspectRatio: 3 / 4,
                    ),
                    itemCount: 6,
                    itemBuilder: (_, unused) => ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: ColoredBox(color: scheme.surfaceContainerHigh),
                    ),
                  )
                : _products.isEmpty
                    ? GhEmptyState(
                        icon: Icons.search_off_outlined,
                        title: 'No products found',
                        subtitle: 'Try different keywords or check spelling.',
                      )
                    : RefreshIndicator(
                        onRefresh: _load,
                        child: GridView.builder(
                          padding: const EdgeInsets.fromLTRB(12, 8, 12, 24),
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            mainAxisSpacing: 10,
                            crossAxisSpacing: 10,
                            childAspectRatio: 3 / 4,
                          ),
                          itemCount: _products.length,
                          itemBuilder: (context, i) {
                            final p = _products[i];
                            final role = ref.watch(authSessionProvider.select((a) => a.user?.role));
                            final path =
                                role == UserRole.trader ? '/products/${p.id}/gallery' : '/products/${p.id}';
                            return GhProductGridTile(
                              product: p,
                              showCenterPrompt: false,
                              centerHint: '',
                              cornerPhotoCount: p.mediaCount > 0 ? p.mediaCount : null,
                              onTap: () => context.push(path),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }
}
