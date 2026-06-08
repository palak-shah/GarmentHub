import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/config/environment.dart';
import '../../../core/network/api_error.dart';

final _galleryFamily = FutureProvider.family<Map<String, dynamic>, String>((ref, id) async {
  return ref.read(productApiProvider).getTraderGallery(id);
});

class TraderGalleryScreen extends ConsumerWidget {
  const TraderGalleryScreen({super.key, required this.productId});

  final String productId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(_galleryFamily(productId));
    return Scaffold(
      appBar: AppBar(
        title: const Text('Gallery'),
        actions: [
          TextButton(
            onPressed: () => context.push('/trader/share'),
            child: const Text('Share'),
          ),
        ],
      ),
      body: async.when(
        data: (data) {
          final name = data['name'] as String? ?? '';
          final assets = (data['imageAssets'] as List?) ?? [];
          return ListView(
            padding: const EdgeInsets.all(12),
            children: [
              Text(name, style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 12),
              for (final a in assets)
                if (a is Map<String, dynamic>)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Image.network(
                      Environment.resolveMediaUrl(a['url']?.toString()),
                      height: 200,
                      fit: BoxFit.cover,
                      width: double.infinity,
                    ),
                  ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(apiErrorMessage(e))),
      ),
    );
  }
}
