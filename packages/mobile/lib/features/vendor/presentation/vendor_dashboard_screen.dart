import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_error.dart';
import '../vendor_providers.dart';

class VendorDashboardScreen extends ConsumerWidget {
  const VendorDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final async = ref.watch(vendorProductsProvider);

    return Scaffold(
      appBar: AppBar(
        toolbarHeight: 72,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Vendor'),
            Text(
              'Manage catalog and fulfillment',
              style: text.bodySmall?.copyWith(color: scheme.onSurfaceVariant, fontWeight: FontWeight.normal),
            ),
          ],
        ),
      ),
      body: async.when(
        data: (products) {
          final count = products.length;
          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
            children: [
              Card(
                elevation: 0,
                color: scheme.surfaceContainerLow,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Row(
                    children: [
                      DecoratedBox(
                        decoration: BoxDecoration(
                          color: scheme.primaryContainer.withValues(alpha: 0.6),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Icon(Icons.inventory_2_outlined, color: scheme.onPrimaryContainer, size: 28),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Your catalog', style: text.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                            const SizedBox(height: 4),
                            Text(
                              count == 0 ? 'No products yet — add your first listing.' : '$count active listing${count == 1 ? '' : 's'}',
                              style: text.bodyMedium?.copyWith(color: scheme.onSurfaceVariant),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Text('Shortcuts', style: text.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
              const SizedBox(height: 10),
              _VendorActionTile(
                icon: Icons.inventory_2_outlined,
                title: 'Manage products',
                subtitle: 'Edit listings, MOQ, and attributes',
                onTap: () => context.push('/vendor/products'),
              ),
              _VendorActionTile(
                icon: Icons.upload_file_outlined,
                title: 'Upload photos',
                subtitle: 'Add images to your products',
                onTap: () => context.push('/vendor/upload'),
              ),
              _VendorActionTile(
                icon: Icons.assignment_outlined,
                title: 'Incoming orders',
                subtitle: 'Accept or decline line items',
                onTap: () => context.push('/vendor/orders'),
              ),
              _VendorActionTile(
                icon: Icons.history,
                title: 'Order history',
                subtitle: 'Past vendor responses',
                onTap: () => context.push('/vendor/history'),
              ),
              _VendorActionTile(
                icon: Icons.category_outlined,
                title: 'Catalog attributes',
                subtitle: 'Category fields for your listings',
                onTap: () => context.push('/vendor/catalog'),
              ),
              _VendorActionTile(
                icon: Icons.branding_watermark_outlined,
                title: 'Brands',
                subtitle: 'Brand names you supply',
                onTap: () => context.push('/vendor/brands'),
              ),
            ],
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

class _VendorActionTile extends StatelessWidget {
  const _VendorActionTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 10),
      color: scheme.surfaceContainerLow,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          child: Row(
            children: [
              Icon(icon, color: scheme.primary),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: text.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 2),
                    Text(subtitle, style: text.bodySmall?.copyWith(color: scheme.onSurfaceVariant)),
                  ],
                ),
              ),
              Icon(Icons.chevron_right_rounded, color: scheme.onSurfaceVariant),
            ],
          ),
        ),
      ),
    );
  }
}
