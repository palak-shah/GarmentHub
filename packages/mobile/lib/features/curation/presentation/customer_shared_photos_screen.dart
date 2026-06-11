import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/config/environment.dart';
import '../../../core/network/api_error.dart';
import '../../../shared/widgets/gh_empty_state.dart';

final _sharedPhotosFamily = FutureProvider.family<Map<String, dynamic>, String>((ref, id) async {
  return ref.read(curationApiProvider).getSharedPhotosForProduct(id);
});

class CustomerSharedPhotosScreen extends ConsumerWidget {
  const CustomerSharedPhotosScreen({super.key, required this.productId});

  final String productId;

  static String? _formatAt(dynamic v) {
    if (v is! String || v.isEmpty) return null;
    final dt = DateTime.tryParse(v);
    if (dt == null) return v;
    return DateFormat.yMMMd().add_jm().format(dt.toLocal());
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final async = ref.watch(_sharedPhotosFamily(productId));
    return Scaffold(
      appBar: AppBar(title: const Text('Shared photos')),
      body: async.when(
        data: (data) {
          final photos = (data['photos'] as List?) ?? [];
          if (photos.isEmpty) {
            return const GhEmptyState(
              icon: Icons.photo_library_outlined,
              title: 'No shared photos',
              subtitle: 'Photos traders share for this product appear here.',
            );
          }
          return ListView.builder(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
            itemCount: photos.length,
            itemBuilder: (context, i) {
              final p = photos[i] as Map<String, dynamic>;
              final url = Environment.resolveMediaUrl(p['url']?.toString());
              final trader = p['trader'] is Map ? (p['trader']['name'] ?? '').toString() : '';
              final when = _formatAt(p['sharedAt']) ?? '';
              return Card(
                elevation: 0,
                margin: const EdgeInsets.only(bottom: 10),
                color: scheme.surfaceContainerLow,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                child: Padding(
                  padding: const EdgeInsets.all(10),
                  child: Row(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(10),
                        child: SizedBox(
                          width: 72,
                          height: 72,
                          child: Image.network(url, fit: BoxFit.cover),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              trader.isEmpty ? 'Trader' : trader,
                              style: text.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                            ),
                            if (when.isNotEmpty) ...[
                              const SizedBox(height: 4),
                              Text(when, style: text.bodySmall?.copyWith(color: scheme.onSurfaceVariant)),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
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
