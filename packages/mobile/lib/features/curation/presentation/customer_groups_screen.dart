import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/network/api_error.dart';
import '../../../shared/widgets/gh_empty_state.dart';
import '../../../shared/widgets/gh_labeled_field.dart';

final customerGroupsProvider = FutureProvider<List<dynamic>>((ref) async {
  return ref.read(curationApiProvider).listCustomerGroups();
});

class CustomerGroupsScreen extends ConsumerWidget {
  const CustomerGroupsScreen({super.key});

  static InputDecoration _dialogDeco(ColorScheme scheme) {
    return InputDecoration(
      filled: true,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      fillColor: scheme.surfaceContainerHighest,
    );
  }

  static int _memberCount(Map<String, dynamic> g) {
    final c = g['_count'];
    if (c is Map) {
      final m = c['members'];
      if (m is int) return m;
      if (m is num) return m.toInt();
    }
    return 0;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final async = ref.watch(customerGroupsProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Customer groups'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () async {
              final name = await showDialog<String>(
                context: context,
                builder: (ctx) {
                  final c = TextEditingController();
                  final dialogScheme = Theme.of(ctx).colorScheme;
                  return AlertDialog(
                    title: const Text('New group'),
                    content: GhLabeledField(
                      label: 'Name',
                      child: TextField(
                        controller: c,
                        autofocus: true,
                        decoration: _dialogDeco(dialogScheme).copyWith(hintText: 'Group name'),
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
                await ref.read(curationApiProvider).createCustomerGroup({'name': name});
                ref.invalidate(customerGroupsProvider);
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
                }
              }
            },
          ),
        ],
      ),
      body: async.when(
        data: (list) {
          if (list.isEmpty) {
            return const GhEmptyState(
              icon: Icons.groups_outlined,
              title: 'No groups yet',
              subtitle: 'Create a group to organize customers and shares.',
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(customerGroupsProvider),
            child: ListView.builder(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              itemCount: list.length,
              itemBuilder: (context, i) {
                final g = list[i] as Map<String, dynamic>;
                final title = g['name']?.toString() ?? 'Group';
                final n = _memberCount(g);
                return Card(
                  elevation: 0,
                  margin: const EdgeInsets.only(bottom: 10),
                  color: scheme.surfaceContainerLow,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  child: InkWell(
                    onTap: () => context.push('/trader/groups/${g['id']}'),
                    borderRadius: BorderRadius.circular(14),
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Row(
                        children: [
                          DecoratedBox(
                            decoration: BoxDecoration(
                              color: scheme.primaryContainer.withValues(alpha: 0.5),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Padding(
                              padding: const EdgeInsets.all(10),
                              child: Icon(Icons.groups_outlined, color: scheme.onPrimaryContainer, size: 24),
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(title, style: text.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                                const SizedBox(height: 6),
                                Chip(
                                  label: Text('$n member${n == 1 ? '' : 's'}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                                  visualDensity: VisualDensity.compact,
                                  padding: EdgeInsets.zero,
                                  backgroundColor: scheme.secondaryContainer,
                                  side: BorderSide.none,
                                ),
                              ],
                            ),
                          ),
                          Icon(Icons.chevron_right_rounded, color: scheme.onSurfaceVariant),
                        ],
                      ),
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
