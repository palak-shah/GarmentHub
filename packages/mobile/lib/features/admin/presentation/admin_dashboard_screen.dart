import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/network/api_error.dart';

final adminStatsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  return ref.read(adminApiProvider).getStats();
});

class AdminDashboardScreen extends ConsumerWidget {
  const AdminDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(adminStatsProvider);
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(
        toolbarHeight: 72,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Admin'),
            Text(
              'Platform overview',
              style: text.bodySmall?.copyWith(color: scheme.onSurfaceVariant, fontWeight: FontWeight.normal),
            ),
          ],
        ),
      ),
      body: async.when(
        data: (stats) {
          final users = stats['users'] as Map<String, dynamic>? ?? {};
          final totalUsers = _asInt(users['total']);
          final vendors = _asInt(users['vendors']);
          final customers = _asInt(users['customers']);
          final products = _asInt(stats['products']);
          final orders = stats['orders'] as Map<String, dynamic>? ?? {};
          final orderTotal = _asInt(orders['total']);
          final byStatus = orders['byStatus'] as Map<String, dynamic>? ?? {};

          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
            children: [
              Text('Users', style: text.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(child: _StatCard(label: 'Total', value: '$totalUsers', icon: Icons.people_outline, scheme: scheme, text: text)),
                  const SizedBox(width: 10),
                  Expanded(child: _StatCard(label: 'Customers', value: '$customers', icon: Icons.shopping_bag_outlined, scheme: scheme, text: text)),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(child: _StatCard(label: 'Vendors', value: '$vendors', icon: Icons.storefront_outlined, scheme: scheme, text: text)),
                  const SizedBox(width: 10),
                  Expanded(child: _StatCard(label: 'Products', value: '$products', icon: Icons.inventory_2_outlined, scheme: scheme, text: text)),
                ],
              ),
              const SizedBox(height: 20),
              Text('Orders', style: text.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
              const SizedBox(height: 10),
              Card(
                elevation: 0,
                color: scheme.surfaceContainerLow,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Icon(Icons.receipt_long_outlined, color: scheme.primary, size: 28),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('All orders', style: text.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                            Text('$orderTotal total', style: text.bodyMedium?.copyWith(color: scheme.onSurfaceVariant)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              if (byStatus.isNotEmpty) ...[
                const SizedBox(height: 12),
                Text('By status', style: text.labelSmall?.copyWith(color: scheme.onSurfaceVariant, fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: byStatus.entries.map((e) {
                    final n = _groupByCount(e.value);
                    return Chip(
                      label: Text('${e.key} · $n', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                      backgroundColor: scheme.secondaryContainer,
                      side: BorderSide.none,
                    );
                  }).toList(),
                ),
              ],
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

int _asInt(dynamic v) {
  if (v is int) return v;
  if (v is num) return v.toInt();
  return int.tryParse(v?.toString() ?? '') ?? 0;
}

/// Prisma `groupBy` with `_count: true` yields `{ _all: n }` per status bucket.
int _groupByCount(dynamic v) {
  if (v is int) return v;
  if (v is num) return v.toInt();
  if (v is Map) {
    final all = v['_all'];
    if (all is int) return all;
    if (all is num) return all.toInt();
  }
  return int.tryParse(v?.toString() ?? '') ?? 0;
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.scheme,
    required this.text,
  });

  final String label;
  final String value;
  final IconData icon;
  final ColorScheme scheme;
  final TextTheme text;

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      color: scheme.surfaceContainerLow,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 22, color: scheme.primary),
            const SizedBox(height: 10),
            Text(value, style: text.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 2),
            Text(label, style: text.bodySmall?.copyWith(color: scheme.onSurfaceVariant)),
          ],
        ),
      ),
    );
  }
}
