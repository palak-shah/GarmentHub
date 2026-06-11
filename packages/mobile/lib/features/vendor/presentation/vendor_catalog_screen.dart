import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/network/api_error.dart';
import '../../../shared/widgets/gh_empty_state.dart';

final vendorCatalogProvider = FutureProvider<List<dynamic>>((ref) async {
  return ref.read(vendorApiProvider).getCatalogCategories();
});

class VendorCatalogScreen extends ConsumerWidget {
  const VendorCatalogScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final async = ref.watch(vendorCatalogProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Catalog')),
      body: async.when(
        data: (list) {
          if (list.isEmpty) {
            return const GhEmptyState(
              icon: Icons.category_outlined,
              title: 'No categories',
              subtitle: 'Categories from the platform will appear here.',
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(vendorCatalogProvider),
            child: ListView.builder(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              itemCount: list.length,
              itemBuilder: (context, i) {
                final c = list[i] as Map<String, dynamic>;
                final defaults = (c['defaultAttributes'] as List?) ?? [];
                final vendorAttrs = (c['vendorAttributes'] as List?) ?? [];
                return Card(
                  elevation: 0,
                  margin: const EdgeInsets.only(bottom: 10),
                  color: scheme.surfaceContainerLow,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  clipBehavior: Clip.antiAlias,
                  child: Theme(
                    data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                    child: ExpansionTile(
                      tilePadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                      childrenPadding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                      title: Text(
                        c['name']?.toString() ?? '',
                        style: text.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                      ),
                      subtitle: Text(
                        '${defaults.length} default · ${vendorAttrs.length} custom',
                        style: text.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
                      ),
                      children: [
                        if (vendorAttrs.isEmpty)
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            child: Text(
                              'No custom attributes for this category.',
                              style: text.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
                            ),
                          )
                        else
                          for (final a in vendorAttrs)
                            if (a is Map)
                              Padding(
                                padding: const EdgeInsets.only(bottom: 6),
                                child: Align(
                                  alignment: Alignment.centerLeft,
                                  child: Chip(
                                    label: Text(
                                      a['name']?.toString() ?? '',
                                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                                    ),
                                    visualDensity: VisualDensity.compact,
                                    backgroundColor: scheme.secondaryContainer,
                                    side: BorderSide.none,
                                  ),
                                ),
                              ),
                      ],
                    ),
                  ),
                );
              },
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
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
