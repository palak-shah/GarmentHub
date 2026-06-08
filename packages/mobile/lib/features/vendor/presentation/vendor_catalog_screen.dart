import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/network/api_error.dart';

final vendorCatalogProvider = FutureProvider<List<dynamic>>((ref) async {
  return ref.read(vendorApiProvider).getCatalogCategories();
});

class VendorCatalogScreen extends ConsumerWidget {
  const VendorCatalogScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(vendorCatalogProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Catalog')),
      body: async.when(
        data: (list) => ListView.builder(
          itemCount: list.length,
          itemBuilder: (context, i) {
            final c = list[i] as Map<String, dynamic>;
            final defaults = (c['defaultAttributes'] as List?) ?? [];
            final vendorAttrs = (c['vendorAttributes'] as List?) ?? [];
            return ExpansionTile(
              title: Text(c['name']?.toString() ?? ''),
              subtitle: Text('${defaults.length} default · ${vendorAttrs.length} custom'),
              children: [
                for (final a in vendorAttrs)
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
        error: (e, _) => Center(child: Text(apiErrorMessage(e))),
      ),
    );
  }
}
