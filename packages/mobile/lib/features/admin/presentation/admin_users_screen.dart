import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/network/api_error.dart';

final adminUsersProvider = FutureProvider<List<dynamic>>((ref) async {
  return ref.read(adminApiProvider).getUsers();
});

class AdminUsersScreen extends ConsumerWidget {
  const AdminUsersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(adminUsersProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Users')),
      body: async.when(
        data: (list) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(adminUsersProvider),
          child: ListView.builder(
            itemCount: list.length,
            itemBuilder: (context, i) {
              final u = list[i] as Map<String, dynamic>;
              final active = u['isActive'] == true;
              return SwitchListTile(
                title: Text(u['name']?.toString() ?? ''),
                subtitle: Text('${u['role']} · ${u['phone']}'),
                value: active,
                onChanged: (v) async {
                  try {
                    await ref.read(adminApiProvider).toggleUserStatus(u['id'] as String, v);
                    ref.invalidate(adminUsersProvider);
                  } catch (e) {
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessageVerbose(e))));
                    }
                  }
                },
              );
            },
          ),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(apiErrorMessageVerbose(e))),
      ),
    );
  }
}
