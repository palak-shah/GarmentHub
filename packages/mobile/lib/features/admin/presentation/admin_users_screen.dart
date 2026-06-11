import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/network/api_error.dart';
import '../../../shared/widgets/gh_gradient_avatar.dart';
import '../../../shared/widgets/gh_role_chip.dart';

final adminUsersProvider = FutureProvider<List<dynamic>>((ref) async {
  return ref.read(adminApiProvider).getUsers();
});

class AdminUsersScreen extends ConsumerWidget {
  const AdminUsersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final async = ref.watch(adminUsersProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Users')),
      body: async.when(
        data: (list) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(adminUsersProvider),
          child: ListView.builder(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
            itemCount: list.length,
            itemBuilder: (context, i) {
              final u = list[i] as Map<String, dynamic>;
              final active = u['isActive'] == true;
              final name = u['name']?.toString() ?? '';
              final phone = u['phone']?.toString() ?? '';
              final role = u['role']?.toString() ?? '';
              return Card(
                elevation: 0,
                margin: const EdgeInsets.only(bottom: 10),
                color: scheme.surfaceContainerLow,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  child: Row(
                    children: [
                      GhGradientAvatar(name: name.isEmpty ? phone : name, size: 48),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              name.isEmpty ? '—' : name,
                              style: text.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                            ),
                            const SizedBox(height: 4),
                            Text(phone, style: text.bodySmall?.copyWith(color: scheme.onSurfaceVariant)),
                            const SizedBox(height: 6),
                            GhRoleChip(role: role),
                          ],
                        ),
                      ),
                      Switch.adaptive(
                        value: active,
                        onChanged: (v) async {
                          try {
                            await ref.read(adminApiProvider).toggleUserStatus(u['id'] as String, v);
                            ref.invalidate(adminUsersProvider);
                          } catch (e) {
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
                            }
                          }
                        },
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
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
