import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/network/api_error.dart';

final adminStatsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  return ref.read(adminApiProvider).getStats();
});

class AdminDashboardScreen extends ConsumerWidget {
  const AdminDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(adminStatsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Admin')),
      body: async.when(
        data: (stats) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(stats.toString()),
          ],
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(apiErrorMessageVerbose(e))),
      ),
    );
  }
}
