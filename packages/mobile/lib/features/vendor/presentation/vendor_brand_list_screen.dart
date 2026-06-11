import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/network/api_error.dart';
import '../../../shared/widgets/gh_empty_state.dart';
import '../../../shared/widgets/gh_labeled_field.dart';

final vendorBrandsProvider = FutureProvider<List<dynamic>>((ref) async {
  return ref.read(brandApiProvider).listMy();
});

class VendorBrandListScreen extends ConsumerWidget {
  const VendorBrandListScreen({super.key});

  static InputDecoration _dialogDeco(ColorScheme scheme) {
    return InputDecoration(
      filled: true,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      fillColor: scheme.surfaceContainerHighest,
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final async = ref.watch(vendorBrandsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Brands')),
      floatingActionButton: FloatingActionButton(
        onPressed: () async {
          final name = await showDialog<String>(
            context: context,
            builder: (ctx) {
              final c = TextEditingController();
              final dialogScheme = Theme.of(ctx).colorScheme;
              return AlertDialog(
                title: const Text('New brand'),
                content: GhLabeledField(
                  label: 'Name',
                  child: TextField(
                    controller: c,
                    autofocus: true,
                    decoration: _dialogDeco(dialogScheme).copyWith(hintText: 'Brand display name'),
                    textCapitalization: TextCapitalization.words,
                  ),
                ),
                actions: [
                  TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
                  FilledButton(onPressed: () => Navigator.pop(ctx, c.text.trim()), child: const Text('Create')),
                ],
              );
            },
          );
          if (name == null || name.isEmpty) return;
          try {
            await ref.read(brandApiProvider).create(name);
            ref.invalidate(vendorBrandsProvider);
          } catch (e) {
            if (context.mounted) {
              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
            }
          }
        },
        child: const Icon(Icons.add),
      ),
      body: async.when(
        data: (list) {
          if (list.isEmpty) {
            return const GhEmptyState(
              icon: Icons.branding_watermark_outlined,
              title: 'No brands yet',
              subtitle: 'Tap + to create a brand for your products.',
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(vendorBrandsProvider),
            child: ListView.builder(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 88),
              itemCount: list.length,
              itemBuilder: (context, i) {
                final b = list[i] as Map<String, dynamic>;
                final title = b['name']?.toString() ?? '';
                return Card(
                  elevation: 0,
                  margin: const EdgeInsets.only(bottom: 10),
                  color: scheme.surfaceContainerLow,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  child: ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    leading: DecoratedBox(
                      decoration: BoxDecoration(
                        color: scheme.primaryContainer.withValues(alpha: 0.5),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(10),
                        child: Icon(Icons.branding_watermark_outlined, color: scheme.onPrimaryContainer, size: 22),
                      ),
                    ),
                    title: Text(title, style: text.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
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
