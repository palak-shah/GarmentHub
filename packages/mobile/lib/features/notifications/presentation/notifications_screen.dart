import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/network/api_error.dart';
import '../../../shared/widgets/gh_empty_state.dart';

final notificationsProvider = FutureProvider<List<dynamic>>((ref) async {
  return ref.read(notificationApiProvider).list();
});

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(notificationsProvider);
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        centerTitle: false,
        titleTextStyle: text.titleLarge?.copyWith(fontWeight: FontWeight.bold),
        actions: [
          IconButton(
            tooltip: 'Mark all read',
            icon: const Icon(Icons.done_all),
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
          ),
        ],
      ),
      body: async.when(
        data: (list) {
          if (list.isEmpty) {
            return GhEmptyState(
              icon: Icons.notifications_none_outlined,
              title: 'You are all caught up',
              subtitle: 'New alerts will show up here.',
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(notificationsProvider),
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 24),
              itemCount: list.length,
              separatorBuilder: (_, unused) => const SizedBox(height: 8),
              itemBuilder: (context, i) {
                final n = list[i] as Map<String, dynamic>;
                final read = n['isRead'] == true;
                return Card(
                  elevation: 0,
                  color: read ? scheme.surfaceContainerLow : scheme.primaryContainer.withValues(alpha: 0.35),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(16),
                    onTap: () async {
                      try {
                        await ref.read(notificationApiProvider).markRead(n['id'] as String);
                        ref.invalidate(notificationsProvider);
                      } catch (_) {}
                    },
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              if (!read)
                                Container(
                                  width: 8,
                                  height: 8,
                                  margin: const EdgeInsets.only(right: 8),
                                  decoration: BoxDecoration(color: scheme.primary, shape: BoxShape.circle),
                                ),
                              Expanded(
                                child: Text(
                                  n['title']?.toString() ?? '',
                                  style: text.titleSmall?.copyWith(fontWeight: read ? FontWeight.w500 : FontWeight.w700),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(n['body']?.toString() ?? '', style: text.bodyMedium?.copyWith(color: scheme.onSurfaceVariant)),
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
        error: (e, _) => Center(child: Text(apiErrorMessage(e))),
      ),
    );
  }
}
