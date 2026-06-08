import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/network/api_error.dart';
import '../../../shared/models/product.dart';

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
        'limit': 20,
      });
      final list = (data['products'] as List?) ?? [];
      setState(() {
        _products = list.map((e) => Product.fromJson(e as Map<String, dynamic>)).toList();
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
    return Scaffold(
      appBar: AppBar(title: const Text('Search')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _search,
                    decoration: const InputDecoration(hintText: 'Search products'),
                    onSubmitted: (_) => _load(),
                  ),
                ),
                IconButton(onPressed: _load, icon: const Icon(Icons.search)),
              ],
            ),
          ),
          if (_loading) const LinearProgressIndicator(),
          if (_error != null) Padding(padding: const EdgeInsets.all(8), child: Text(_error!)),
          Expanded(
            child: ListView.builder(
              itemCount: _products.length,
              itemBuilder: (context, i) {
                final p = _products[i];
                return ListTile(
                  leading: p.primaryImageUrl.isEmpty
                      ? const Icon(Icons.image_outlined)
                      : Image.network(p.primaryImageUrl, width: 48, height: 48, fit: BoxFit.cover),
                  title: Text(p.name),
                  subtitle: Text(p.vendorName ?? ''),
                  onTap: () => context.push('/products/${p.id}'),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
