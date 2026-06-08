import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/network/api_error.dart';

final notificationsProvider = FutureProvider<List<dynamic>>((ref) async {
  return ref.read(notificationApiProvider).list();
});

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(notificationsProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          TextButton(
            onPressed: () async {
              try {
                await ref.read(notificationApiProvider).markAllRead();
                ref.invalidate(notificationsProvider);
              } catch (e) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
                }
              }
            },
            child: const Text('Mark all read'),
          ),
        ],
      ),
      body: async.when(
        data: (list) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(notificationsProvider),
          child: ListView.builder(
            itemCount: list.length,
            itemBuilder: (context, i) {
              final n = list[i] as Map<String, dynamic>;
              final read = n['isRead'] == true;
              return ListTile(
                title: Text(n['title']?.toString() ?? '', style: TextStyle(fontWeight: read ? FontWeight.normal : FontWeight.bold)),
                subtitle: Text(n['body']?.toString() ?? ''),
                onTap: () async {
                  try {
                    await ref.read(notificationApiProvider).markRead(n['id'] as String);
                    ref.invalidate(notificationsProvider);
                  } catch (_) {}
                },
              );
            },
          ),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(apiErrorMessage(e))),
      ),
    );
  }
}
