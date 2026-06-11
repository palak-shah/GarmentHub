import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/network/api_error.dart';
import 'vendor_ui_widgets.dart';

final vendorCatalogProvider = FutureProvider<List<dynamic>>((ref) async {
  return ref.read(vendorApiProvider).getCatalogCategories();
});

class VendorCatalogScreen extends ConsumerWidget {
  const VendorCatalogScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(vendorCatalogProvider);
    final theme = Theme.of(context);
    final color = theme.colorScheme;

    return Scaffold(
      backgroundColor: color.surface,
      appBar: AppBar(title: const Text('Catalog')),
      body: async.when(
        data: (list) => ListView.separated(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          itemCount: list.length,
          separatorBuilder: (_, _) => const SizedBox(height: 12),
          itemBuilder: (context, i) {
            final c = list[i] as Map<String, dynamic>;
            final defaults = (c['defaultAttributes'] as List?) ?? [];
            final vendorAttrs = (c['vendorAttributes'] as List?) ?? [];
            return VendorCard(
              padding: EdgeInsets.zero,
              child: Theme(
                data: theme.copyWith(dividerColor: Colors.transparent),
                child: ExpansionTile(
                  tilePadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  childrenPadding: const EdgeInsets.only(left: 8, right: 8, bottom: 8),
                  collapsedShape: const RoundedRectangleBorder(),
                  shape: const RoundedRectangleBorder(),
                  title: Text(
                    c['name']?.toString() ?? '',
                    style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  subtitle: Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      '${defaults.length} default · ${vendorAttrs.length} custom',
                      style: theme.textTheme.bodySmall?.copyWith(color: color.onSurfaceVariant, height: 1.35),
                    ),
                  ),
                  children: [
                    for (final a in vendorAttrs)
                      if (a is Map)
                        ListTile(
                          dense: true,
                          title: Text(a['name']?.toString() ?? ''),
                        ),
                  ],
                ),
              ),
            );
          },
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(apiErrorMessageVerbose(e))),
      ),
    );
  }
}
