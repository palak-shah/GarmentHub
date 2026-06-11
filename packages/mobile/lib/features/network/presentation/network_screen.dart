import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/network/api_error.dart';
import '../../../shared/widgets/gh_empty_state.dart';
import '../../../shared/widgets/gh_gradient_avatar.dart';
import '../../../shared/widgets/gh_role_chip.dart';

final connectionsProvider = FutureProvider<List<dynamic>>((ref) async {
  return ref.read(networkApiProvider).getConnections();
});

final suggestionsProvider = FutureProvider<List<dynamic>>((ref) async {
  return ref.read(networkApiProvider).getSuggestions();
});

class NetworkScreen extends ConsumerStatefulWidget {
  const NetworkScreen({super.key});

  @override
  ConsumerState<NetworkScreen> createState() => _NetworkScreenState();
}

class _NetworkScreenState extends ConsumerState<NetworkScreen> {
  final _searchCtrl = TextEditingController();

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  bool _matches(Map<String, dynamic> m, String q) {
    if (q.length < 2) return true;
    final s = q.toLowerCase();
    final name = '${m['name'] ?? ''} ${m['businessName'] ?? ''} ${m['phone'] ?? ''}'.toLowerCase();
    return name.contains(s);
  }

  @override
  Widget build(BuildContext context) {
    final conn = ref.watch(connectionsProvider);
    final sug = ref.watch(suggestionsProvider);
    final q = _searchCtrl.text.trim();

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('People'),
          centerTitle: false,
          titleTextStyle: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
          bottom: const TabBar(tabs: [Tab(text: 'Connections'), Tab(text: 'Suggestions')]),
        ),
        body: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
              child: SearchBar(
                controller: _searchCtrl,
                hintText: 'Search name or phone…',
                leading: const Icon(Icons.search),
                trailing: [
                  if (q.isNotEmpty)
                    IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        _searchCtrl.clear();
                        setState(() {});
                      },
                    ),
                ],
                onChanged: (_) => setState(() {}),
              ),
            ),
            Expanded(
              child: TabBarView(
                children: [
                  conn.when(
                    data: (list) {
                      final filtered = list
                          .whereType<Map<String, dynamic>>()
                          .where((m) => _matches(m, q))
                          .toList();
                      if (filtered.isEmpty) {
                        return GhEmptyState(
                          icon: Icons.people_outline,
                          title: list.isEmpty ? 'No connections yet' : 'No matches',
                          subtitle: list.isEmpty ? 'Follow traders to see them here.' : 'Try a different search.',
                        );
                      }
                      return RefreshIndicator(
                        onRefresh: () async => ref.invalidate(connectionsProvider),
                        child: ListView(
                          padding: const EdgeInsets.fromLTRB(12, 8, 12, 88),
                          children: [
                            Padding(
                              padding: const EdgeInsets.fromLTRB(4, 8, 4, 6),
                              child: Text(
                                'MY TRADERS',
                                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                                      fontWeight: FontWeight.w700,
                                      letterSpacing: 0.8,
                                    ),
                              ),
                            ),
                            ...filtered.map((m) => _PersonCard(
                                  map: m,
                                  onInsights: m['role'] == 'TRADER'
                                      ? () => context.push('/network/traders/${m['id']}')
                                      : null,
                                )),
                          ],
                        ),
                      );
                    },
                    loading: () => const Center(child: CircularProgressIndicator()),
                    error: (e, _) => Center(child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Text(apiErrorMessage(e)),
                    )),
                  ),
                  sug.when(
                    data: (list) {
                      final filtered = list
                          .whereType<Map<String, dynamic>>()
                          .where((m) => _matches(m, q))
                          .toList();
                      if (filtered.isEmpty) {
                        return GhEmptyState(
                          icon: Icons.person_add_outlined,
                          title: list.isEmpty ? 'No suggestions' : 'No matches',
                          subtitle: list.isEmpty ? 'Check back later for people to follow.' : 'Try a different search.',
                        );
                      }
                      return RefreshIndicator(
                        onRefresh: () async => ref.invalidate(suggestionsProvider),
                        child: ListView.builder(
                          padding: const EdgeInsets.fromLTRB(12, 8, 12, 88),
                          itemCount: filtered.length,
                          itemBuilder: (context, i) {
                            final m = filtered[i];
                            return _PersonCard(
                              map: m,
                              trailing: FilledButton(
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
                      );
                    },
                    loading: () => const Center(child: CircularProgressIndicator()),
                    error: (e, _) => Center(child: Text(apiErrorMessage(e))),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PersonCard extends StatelessWidget {
  const _PersonCard({required this.map, this.onInsights, this.trailing});

  final Map<String, dynamic> map;
  final VoidCallback? onInsights;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final name = map['businessName']?.toString().trim().isNotEmpty == true
        ? map['businessName'] as String
        : (map['name']?.toString() ?? '?');
    final role = map['role']?.toString() ?? '';
    final subtitle = role == 'TRADER' ? 'Tap to view insights' : 'Connected';

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Card(
        elevation: 0,
        color: scheme.surfaceContainerLow,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: InkWell(
          onTap: onInsights,
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            child: Row(
              children: [
                GhGradientAvatar(name: name),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(name, maxLines: 1, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                      const SizedBox(height: 4),
                      Wrap(
                        spacing: 6,
                        runSpacing: 4,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          if (role.isNotEmpty) GhRoleChip(role: role),
                          Text(subtitle, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: scheme.onSurfaceVariant)),
                        ],
                      ),
                    ],
                  ),
                ),
                if (trailing != null)
                  trailing!
                else if (onInsights != null)
                  Icon(Icons.chevron_right, color: scheme.onSurfaceVariant),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
