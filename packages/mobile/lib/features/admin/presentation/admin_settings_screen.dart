import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/network/api_error.dart';
import '../../../shared/widgets/gh_empty_state.dart';
import '../../../shared/widgets/gh_labeled_field.dart';

final adminCategoriesProvider = FutureProvider<List<dynamic>>((ref) async {
  return ref.read(adminApiProvider).getCategories();
});

class AdminSettingsScreen extends ConsumerWidget {
  const AdminSettingsScreen({super.key});

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
    final async = ref.watch(adminCategoriesProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Categories')),
      floatingActionButton: FloatingActionButton(
        onPressed: () async {
          final name = await showDialog<String>(
            context: context,
            builder: (ctx) {
              final c = TextEditingController();
              final dialogScheme = Theme.of(ctx).colorScheme;
              return AlertDialog(
                title: const Text('New category'),
                content: GhLabeledField(
                  label: 'Name',
                  child: TextField(
                    controller: c,
                    autofocus: true,
                    decoration: _dialogDeco(dialogScheme).copyWith(hintText: 'e.g. Shirting'),
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
            await ref.read(adminApiProvider).createCategory(name, null);
            ref.invalidate(adminCategoriesProvider);
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
              icon: Icons.category_outlined,
              title: 'No categories',
              subtitle: 'Tap + to add the first category.',
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(adminCategoriesProvider),
            child: ListView.builder(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 88),
              itemCount: list.length,
              itemBuilder: (context, i) {
                final c = list[i] as Map<String, dynamic>;
                final attrs = (c['attributes'] as List?) ?? [];
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
                        '${attrs.length} attribute${attrs.length == 1 ? '' : 's'}',
                        style: text.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
                      ),
                      children: [
                        if (attrs.isEmpty)
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            child: Text(
                              'No attributes on this category.',
                              style: text.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
                            ),
                          )
                        else
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              for (final a in attrs)
                                if (a is Map)
                                  Chip(
                                    label: Text(
                                      a['name']?.toString() ?? '',
                                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                                    ),
                                    backgroundColor: scheme.secondaryContainer,
                                    side: BorderSide.none,
                                  ),
                            ],
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
