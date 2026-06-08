import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_providers.dart';

class VendorDashboardScreen extends ConsumerWidget {
  const VendorDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('Vendor home')),
      body: FutureBuilder<List<dynamic>>(
        future: ref.read(productApiProvider).getMyProducts(),
        builder: (context, snap) {
          final count = snap.data?.length ?? 0;
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text('Your products: $count', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 16),
              ListTile(
                leading: const Icon(Icons.inventory_2_outlined),
                title: const Text('Manage products'),
                onTap: () => context.push('/vendor/products'),
              ),
              ListTile(
                leading: const Icon(Icons.upload_file_outlined),
                title: const Text('Upload photos'),
                onTap: () => context.push('/vendor/upload'),
              ),
              ListTile(
                leading: const Icon(Icons.assignment_outlined),
                title: const Text('Incoming orders'),
                onTap: () => context.push('/vendor/orders'),
              ),
              ListTile(
                leading: const Icon(Icons.history),
                title: const Text('Order history'),
                onTap: () => context.push('/vendor/history'),
              ),
              ListTile(
                leading: const Icon(Icons.category_outlined),
                title: const Text('Catalog attributes'),
                onTap: () => context.push('/vendor/catalog'),
              ),
              ListTile(
                leading: const Icon(Icons.branding_watermark_outlined),
                title: const Text('Brands'),
                onTap: () => context.push('/vendor/brands'),
              ),
            ],
          );
        },
      ),
    );
  }
}
