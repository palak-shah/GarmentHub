import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/config/environment.dart';
import '../../../core/network/api_error.dart';

final _sharedPhotosFamily = FutureProvider.family<Map<String, dynamic>, String>((ref, id) async {
  return ref.read(curationApiProvider).getSharedPhotosForProduct(id);
});

class CustomerSharedPhotosScreen extends ConsumerWidget {
  const CustomerSharedPhotosScreen({super.key, required this.productId});

  final String productId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(_sharedPhotosFamily(productId));
    return Scaffold(
      appBar: AppBar(title: const Text('Shared photos')),
      body: async.when(
        data: (data) {
          final photos = (data['photos'] as List?) ?? [];
          return ListView.builder(
            itemCount: photos.length,
            itemBuilder: (context, i) {
              final p = photos[i] as Map<String, dynamic>;
              final url = Environment.resolveMediaUrl(p['url']?.toString());
              return ListTile(
                leading: Image.network(url, width: 56, height: 56, fit: BoxFit.cover),
                title: Text(p['trader'] is Map ? (p['trader']['name'] ?? '').toString() : ''),
                subtitle: Text(p['sharedAt']?.toString() ?? ''),
              );
            },
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(apiErrorMessage(e))),
      ),
    );
  }
}
