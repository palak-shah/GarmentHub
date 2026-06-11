import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/network/api_error.dart';
import '../../../shared/widgets/gh_gradient_avatar.dart';

final traderInsightsFamily = FutureProvider.family<Map<String, dynamic>, String>((ref, traderId) async {
  return ref.read(networkApiProvider).getTraderInsights(traderId);
});

class TraderInsightsScreen extends ConsumerWidget {
  const TraderInsightsScreen({super.key, required this.traderId});

  final String traderId;

  static String _prettyKey(String k) {
    return k.replaceAllMapped(RegExp(r'([A-Z])'), (m) => ' ${m[1]}').trim().split('_').map((w) {
      if (w.isEmpty) return '';
      return w[0].toUpperCase() + w.substring(1).toLowerCase();
    }).join(' ');
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final async = ref.watch(traderInsightsFamily(traderId));
    return Scaffold(
      appBar: AppBar(title: const Text('Trader insights')),
      body: async.when(
        data: (data) {
          final trader = data['trader'] as Map<String, dynamic>? ?? {};
          final stats = data['stats'] as Map<String, dynamic>? ?? {};
          final name = trader['name']?.toString() ?? 'Trader';
          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
            children: [
              Card(
                elevation: 0,
                color: scheme.surfaceContainerLow,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      GhGradientAvatar(name: name, size: 56),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(name, style: text.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
                            if (trader['businessName'] != null && trader['businessName'].toString().isNotEmpty)
                              Text(
                                trader['businessName'].toString(),
                                style: text.bodyMedium?.copyWith(color: scheme.onSurfaceVariant),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text('Stats', style: text.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
              const SizedBox(height: 10),
              if (stats.isEmpty)
                Text('No stats available.', style: text.bodyMedium?.copyWith(color: scheme.onSurfaceVariant))
              else
                Card(
                  elevation: 0,
                  color: scheme.surfaceContainerLow,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Column(
                      children: [
                        for (final e in stats.entries)
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    _prettyKey(e.key),
                                    style: text.bodyLarge?.copyWith(fontWeight: FontWeight.w500),
                                  ),
                                ),
                                Chip(
                                  label: Text(
                                    '${e.value}',
                                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                                  ),
                                  backgroundColor: scheme.secondaryContainer,
                                  side: BorderSide.none,
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              const SizedBox(height: 24),
              FilledButton(
                style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(52),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
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
