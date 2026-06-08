import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/network/api_error.dart';

final traderInsightsFamily = FutureProvider.family<Map<String, dynamic>, String>((ref, traderId) async {
  return ref.read(networkApiProvider).getTraderInsights(traderId);
});

class TraderInsightsScreen extends ConsumerWidget {
  const TraderInsightsScreen({super.key, required this.traderId});

  final String traderId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(traderInsightsFamily(traderId));
    return Scaffold(
      appBar: AppBar(title: const Text('Trader insights')),
      body: async.when(
        data: (data) {
          final trader = data['trader'] as Map<String, dynamic>? ?? {};
          final stats = data['stats'] as Map<String, dynamic>? ?? {};
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(trader['name']?.toString() ?? '', style: Theme.of(context).textTheme.headlineSmall),
              const Divider(),
              for (final e in stats.entries) ListTile(title: Text(e.key), trailing: Text('${e.value}')),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () async {
                  try {
                    await ref.read(networkApiProvider).connectTrader(traderId);
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Linked trader')));
                    }
                  } catch (e) {
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
                    }
                  }
                },
                child: const Text('Connect trader (vendor)'),
              ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(apiErrorMessage(e))),
      ),
    );
  }
}
