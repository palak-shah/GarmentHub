import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_error.dart';
import '../../../core/theme/app_theme.dart';
import '../vendor_providers.dart';

/// Vendor home — layout matches catalog + shortcuts design (centered header, catalog card, vertical shortcuts).
class VendorDashboardScreen extends ConsumerWidget {
  const VendorDashboardScreen({super.key});

  static const _actions = <_VendorShortcut>[
    _VendorShortcut(
      icon: Icons.inventory_2_outlined,
      title: 'Manage products',
      subtitle: 'Edit listings, MOQ, and attributes',
      path: '/vendor/products',
      showChevron: false,
    ),
    _VendorShortcut(
      icon: Icons.upload_file_outlined,
      title: 'Upload photos',
      subtitle: 'Add images to your products',
      path: '/vendor/upload',
      showChevron: false,
    ),
    _VendorShortcut(
      icon: Icons.assignment_outlined,
      title: 'Incoming orders',
      subtitle: 'Accept or decline line items',
      path: '/vendor/orders',
      showChevron: true,
    ),
    _VendorShortcut(
      icon: Icons.history,
      title: 'Order history',
      subtitle: 'Past vendor responses',
      path: '/vendor/history',
      showChevron: true,
    ),
    _VendorShortcut(
      icon: Icons.interests_outlined,
      title: 'Catalog attributes',
      subtitle: 'Category fields for your listings',
      path: '/vendor/catalog',
      showChevron: true,
    ),
    _VendorShortcut(
      icon: Icons.view_quilt_outlined,
      title: 'Brands',
      subtitle: 'Brand names you supply',
      path: '/vendor/brands',
      showChevron: true,
    ),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final color = theme.colorScheme;
    final async = ref.watch(vendorProductsProvider);

    return Scaffold(
      backgroundColor: AppTheme.pageBackgroundSoft,
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(apiErrorMessageVerbose(e), textAlign: TextAlign.center),
          ),
        ),
        data: (products) {
          return RefreshIndicator(
            color: color.primary,
            onRefresh: () async {
              ref.invalidate(vendorProductsProvider);
              await ref.read(vendorProductsProvider.future);
            },
            child: CustomScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              slivers: [
                SliverToBoxAdapter(
                  child: SafeArea(
                    bottom: false,
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
                      child: Column(
                        children: [
                          Text(
                            'Vendor',
                            style: theme.textTheme.headlineMedium?.copyWith(
                              fontWeight: FontWeight.w700,
                              color: color.primary,
                              letterSpacing: -0.5,
                            ),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'Manage catalog and fulfillment',
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: color.onSurfaceVariant,
                              height: 1.35,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                  sliver: SliverToBoxAdapter(
                    child: _CatalogSummaryCard(
                      count: products.length,
                      onTap: () => context.push('/vendor/products'),
                    ),
                  ),
                ),
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
                  sliver: SliverToBoxAdapter(
                    child: Text(
                      'Shortcuts',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: color.primary,
                      ),
                    ),
                  ),
                ),
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 28),
                  sliver: SliverList.separated(
                    itemCount: _actions.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 10),
                    itemBuilder: (context, i) {
                      final a = _actions[i];
                      return _ShortcutTile(shortcut: a);
                    },
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _VendorShortcut {
  const _VendorShortcut({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.path,
    required this.showChevron,
  });
  final IconData icon;
  final String title;
  final String subtitle;
  final String path;
  final bool showChevron;
}

class _CatalogSummaryCard extends StatelessWidget {
  const _CatalogSummaryCard({required this.count, required this.onTap});

  final int count;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = theme.colorScheme;
    return Material(
      color: Colors.white,
      elevation: 0,
      shadowColor: Colors.transparent,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: color.outlineVariant.withValues(alpha: 0.35)),
            color: Colors.white,
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 18),
            child: Row(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: color.primaryContainer.withValues(alpha: 0.55),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(Icons.inventory_2_outlined, color: color.primary, size: 26),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Your catalog',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: color.primary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '$count active listing${count == 1 ? '' : 's'}',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: color.onSurfaceVariant,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ShortcutTile extends StatelessWidget {
  const _ShortcutTile({required this.shortcut});

  final _VendorShortcut shortcut;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = theme.colorScheme;
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: () => context.push(shortcut.path),
        borderRadius: BorderRadius.circular(16),
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: color.outlineVariant.withValues(alpha: 0.3)),
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(
              children: [
                Icon(shortcut.icon, color: color.primary, size: 26),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        shortcut.title,
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: color.primary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        shortcut.subtitle,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: color.onSurfaceVariant,
                          height: 1.35,
                        ),
                      ),
                    ],
                  ),
                ),
                if (shortcut.showChevron)
                  Icon(Icons.chevron_right, color: color.onSurfaceVariant, size: 22),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
