import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/network/api_error.dart';

final connectionsProvider = FutureProvider<List<dynamic>>((ref) async {
  return ref.read(networkApiProvider).getConnections();
});

final suggestionsProvider = FutureProvider<List<dynamic>>((ref) async {
  return ref.read(networkApiProvider).getSuggestions();
});

class NetworkScreen extends ConsumerWidget {
  const NetworkScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final conn = ref.watch(connectionsProvider);
    final sug = ref.watch(suggestionsProvider);

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Network'),
          bottom: const TabBar(tabs: [Tab(text: 'Connections'), Tab(text: 'Suggestions')]),
        ),
        body: TabBarView(
          children: [
            conn.when(
              data: (list) => ListView.builder(
                itemCount: list.length,
                itemBuilder: (context, i) {
                  final m = list[i] as Map<String, dynamic>;
                  final id = m['id'] as String? ?? '';
                  final name = m['name'] as String? ?? '';
                  final role = m['role'] as String? ?? '';
                  return ListTile(
                    title: Text(name),
                    subtitle: Text(role),
                    trailing: role == 'TRADER'
                        ? TextButton(
                            onPressed: () => context.push('/network/traders/$id'),
                            child: const Text('Insights'),
                          )
                        : null,
                  );
                },
              ),
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text(apiErrorMessage(e))),
            ),
            sug.when(
              data: (list) => ListView.builder(
                itemCount: list.length,
                itemBuilder: (context, i) {
                  final m = list[i] as Map<String, dynamic>;
                  return ListTile(
                    title: Text(m['name']?.toString() ?? ''),
                    subtitle: Text(m['role']?.toString() ?? ''),
                    trailing: FilledButton.tonal(
                      onPressed: () async {
                        try {
                          await ref.read(networkApiProvider).follow(m['id'] as String);
                          ref.invalidate(connectionsProvider);
                          ref.invalidate(suggestionsProvider);
                        } catch (e) {
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
                          }
                        }
                      },
                      child: const Text('Follow'),
                    ),
                  );
                },
              ),
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text(apiErrorMessage(e))),
            ),
          ],
        ),
      ),
    );
  }
}
