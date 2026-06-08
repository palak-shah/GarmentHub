import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_error.dart';
import '../../../core/providers/app_providers.dart';
import '../../../shared/models/product.dart';
import '../../../shared/models/user.dart';
import '../domain/customer_home_feed.dart';
import 'home_product_card.dart';
import 'home_providers.dart';

/// Customer / trader home — routes by role (mirrors PWA `Home.tsx`).
class CustomerHomeScreen extends ConsumerWidget {
  const CustomerHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final role = ref.watch(authSessionProvider.select((a) => a.user?.role));
    if (role == UserRole.trader) {
      return const _TraderHomeScaffold();
    }
    return const _CustomerHomeScaffold();
  }
}

// ─── Customer ─────────────────────────────────────────────────────────────

class _CustomerHomeScaffold extends ConsumerStatefulWidget {
  const _CustomerHomeScaffold();

  @override
  ConsumerState<_CustomerHomeScaffold> createState() => _CustomerHomeScaffoldState();
}

class _CustomerHomeScaffoldState extends ConsumerState<_CustomerHomeScaffold> {
  final _searchCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _searchCtrl.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authSessionProvider.select((a) => a.user));
    final firstName = (user?.name ?? 'GarmentHub').split(' ').first;
    final feedAsync = ref.watch(customerHomeFeedNotifierProvider);
    final categories = ref.watch(productCategoriesProvider);
    final categoryFilter = ref.watch(homeFeedCategoryIdProvider);

    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _HomeStickyHeader(
              firstName: firstName,
              searchController: _searchCtrl,
              onRefresh: () async {
                ref.invalidate(customerHomeFeedNotifierProvider);
                ref.invalidate(productCategoriesProvider);
                await ref.read(customerHomeFeedNotifierProvider.future);
              },
              showShare: false,
            ),
            categories.when(
              loading: () => const SizedBox(height: 4),
              error: (e, st) => const SizedBox.shrink(),
              data: (list) => _CategoryChipRow(
                categories: list,
                selectedId: categoryFilter,
                onSelect: (id) => ref.read(homeFeedCategoryIdProvider.notifier).state = id,
              ),
            ),
            Expanded(
              child: feedAsync.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (e, _) => Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Text(apiErrorMessage(e), textAlign: TextAlign.center),
                  ),
                ),
                data: (state) => _CustomerHomeScrollBody(
                  state: state,
                  categoryId: ref.watch(homeFeedCategoryIdProvider),
                  searchQuery: _searchCtrl.text,
                  onNearEnd: () => ref.read(customerHomeFeedNotifierProvider.notifier).loadMore(),
                  onRefresh: () async {
                    ref.invalidate(customerHomeFeedNotifierProvider);
                    await ref.read(customerHomeFeedNotifierProvider.future);
                  },
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _HomeStickyHeader extends StatelessWidget {
  const _HomeStickyHeader({
    required this.firstName,
    required this.searchController,
    required this.onRefresh,
    required this.showShare,
  });

  final String firstName;
  final TextEditingController searchController;
  final Future<void> Function() onRefresh;
  final bool showShare;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
      child: Row(
        children: [
          Text(firstName, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
          const SizedBox(width: 8),
          Expanded(
            child: TextField(
              controller: searchController,
              decoration: InputDecoration(
                hintText: 'Search products...',
                prefixIcon: const Icon(Icons.search, size: 20),
                isDense: true,
                filled: true,
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: BorderSide.none),
              ),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => onRefresh(),
          ),
          if (showShare)
            IconButton(
              icon: const Icon(Icons.share_outlined),
              onPressed: () => context.push('/trader/share'),
            ),
        ],
      ),
    );
  }
}

class _CategoryChipRow extends StatelessWidget {
  const _CategoryChipRow({
    required this.categories,
    required this.selectedId,
    required this.onSelect,
  });

  final List<dynamic> categories;
  final String? selectedId;
  final void Function(String?) onSelect;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return SizedBox(
      height: 44,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        children: [
          Padding(
            padding: const EdgeInsets.only(right: 6),
            child: FilterChip(
              label: const Text('All'),
              selected: selectedId == null,
              onSelected: (_) => onSelect(null),
              selectedColor: scheme.primaryContainer,
              checkmarkColor: scheme.onPrimaryContainer,
            ),
          ),
          for (final raw in categories)
            if (raw is Map<String, dynamic> && raw['id'] != null)
              Padding(
                padding: const EdgeInsets.only(right: 6),
                child: FilterChip(
                  label: Text(raw['name']?.toString() ?? ''),
                  selected: selectedId == raw['id'].toString(),
                  onSelected: (_) => onSelect(raw['id'].toString()),
                  selectedColor: scheme.primaryContainer,
                  checkmarkColor: scheme.onPrimaryContainer,
                ),
              ),
        ],
      ),
    );
  }
}

class _CustomerHomeScrollBody extends ConsumerStatefulWidget {
  const _CustomerHomeScrollBody({
    required this.state,
    required this.categoryId,
    required this.searchQuery,
    required this.onNearEnd,
    required this.onRefresh,
  });

  final CustomerHomeFeedState state;
  final String? categoryId;
  final String searchQuery;
  final VoidCallback onNearEnd;
  final Future<void> Function() onRefresh;

  @override
  ConsumerState<_CustomerHomeScrollBody> createState() => _CustomerHomeScrollBodyState();
}

class _CustomerHomeScrollBodyState extends ConsumerState<_CustomerHomeScrollBody> {
  String? _activeStoryTraderId;

  List<Product> _filterBySearch(List<Product> list, String q) {
    final s = q.toLowerCase().trim();
    if (s.isEmpty) return list;
    return list.where((p) {
      return p.name.toLowerCase().contains(s) ||
          (p.vendorName ?? '').toLowerCase().contains(s) ||
          (p.categoryName ?? '').toLowerCase().contains(s);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final state = widget.state;
    final q = widget.searchQuery;
    final stories = state.traderStories;

    var visible = _activeStoryTraderId == null
        ? state.mergedProducts
        : (stories.firstWhereOrNull((g) => g.traderId == _activeStoryTraderId)?.products ?? []);

    visible = _filterBySearch(visible, q);

    final useBuckets = q.isEmpty && _activeStoryTraderId == null && state.dateBuckets.isNotEmpty;

    final discoverProducts = _filterBySearch(
      state.mergedProducts.where((p) => !state.curatedProductIds.contains(p.id)).toList(),
      q,
    );

    return RefreshIndicator(
      onRefresh: widget.onRefresh,
      child: NotificationListener<ScrollNotification>(
        onNotification: (n) {
          if (n is ScrollEndNotification || n is ScrollUpdateNotification) {
            final m = n.metrics;
            if (m.pixels >= m.maxScrollExtent - 280) widget.onNearEnd();
          }
          return false;
        },
        child: CustomScrollView(
          slivers: [
            if (stories.isNotEmpty && q.isEmpty)
              SliverToBoxAdapter(
                child: SizedBox(
                  height: 92,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    children: [
                      Padding(
                        padding: const EdgeInsets.only(right: 10),
                        child: Column(
                          children: [
                            InkWell(
                              onTap: () => setState(() => _activeStoryTraderId = null),
                              child: CircleAvatar(
                                radius: 26,
                                backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                                child: Icon(Icons.grid_view_rounded, color: Theme.of(context).colorScheme.onPrimaryContainer),
                              ),
                            ),
                            const SizedBox(height: 4),
                            const Text('All', style: TextStyle(fontSize: 11)),
                          ],
                        ),
                      ),
                      for (final g in stories)
                        Padding(
                          padding: const EdgeInsets.only(right: 10),
                          child: InkWell(
                            onTap: () => setState(() => _activeStoryTraderId = g.traderId),
                            child: Column(
                              children: [
                                CircleAvatar(
                                  radius: 26,
                                  backgroundImage: g.products.isNotEmpty && g.products.first.primaryImageUrl.isNotEmpty
                                      ? NetworkImage(g.products.first.primaryImageUrl)
                                      : null,
                                  child: g.products.isEmpty || g.products.first.primaryImageUrl.isEmpty
                                      ? Text(g.traderLabel.isNotEmpty ? g.traderLabel[0].toUpperCase() : '?')
                                      : null,
                                ),
                                const SizedBox(height: 4),
                                SizedBox(
                                  width: 72,
                                  child: Text(
                                    g.traderLabel,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    textAlign: TextAlign.center,
                                    style: const TextStyle(fontSize: 10),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            if (useBuckets) ..._sliverBucketed(context, state, widget.categoryId),
            if (useBuckets && discoverProducts.isNotEmpty) ...[
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'DISCOVER',
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.5,
                            ),
                      ),
                      Text(
                        'Everything else from your feed',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Theme.of(context).hintColor),
                      ),
                    ],
                  ),
                ),
              ),
              _sliverProductGrid(context, discoverProducts, state),
            ],
            if (!useBuckets) _sliverProductGrid(context, visible, state),
            if (state.loadingMore)
              const SliverToBoxAdapter(
                child: Padding(
                  padding: EdgeInsets.all(16),
                  child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
                ),
              ),
            const SliverToBoxAdapter(child: SizedBox(height: 80)),
          ],
        ),
      ),
    );
  }

  List<Widget> _sliverBucketed(BuildContext context, CustomerHomeFeedState state, String? categoryId) {
    final extras = <String, int>{};
    for (final day in state.dateBuckets) {
      for (final tb in day.traders) {
        for (final row in tb.rows) {
          if (categoryId != null && row.product.categoryId != categoryId) continue;
          extras[row.product.id] = row.photoCount;
        }
      }
    }

    final slivers = <Widget>[];
    for (final day in state.dateBuckets) {
      slivers.add(
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  formatShareSectionDateLabel(day.dateKey).toUpperCase(),
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.5,
                      ),
                ),
                Text('Shared with you', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Theme.of(context).hintColor)),
              ],
            ),
          ),
        ),
      );
      for (final tb in day.traders) {
        final rows = tb.rows
            .where((row) => categoryId == null || row.product.categoryId == categoryId)
            .toList();
        if (rows.isEmpty) continue;
        slivers.add(
          SliverToBoxAdapter(
            child: ListTile(
              leading: CircleAvatar(
                child: Text(tb.traderName.isNotEmpty ? tb.traderName[0].toUpperCase() : '?'),
              ),
              title: Text(tb.traderName, maxLines: 1, overflow: TextOverflow.ellipsis),
              subtitle: const Text('Trader'),
            ),
          ),
        );
        slivers.add(_sliverProductGridForRows(context, rows, extras, state));
      }
    }
    return slivers;
  }

  Widget _sliverProductGridForRows(
    BuildContext context,
    List<CustomerTraderRow> rows,
    Map<String, int> photoExtras,
    CustomerHomeFeedState state,
  ) {
    final products = rows.map((r) => r.product).toList();
    return SliverPadding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      sliver: SliverGrid(
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          mainAxisSpacing: 8,
          crossAxisSpacing: 8,
          childAspectRatio: 3 / 4,
        ),
        delegate: SliverChildBuilderDelegate(
          (context, i) {
            final p = products[i];
            final n = photoExtras[p.id] ?? 1;
            return HomeProductCard(
              product: p,
              sharedBy: state.productTraderNameByProductId[p.id],
              photoCount: n > 1 ? n : null,
              onTap: () => context.push('/products/${p.id}'),
            );
          },
          childCount: products.length,
        ),
      ),
    );
  }

  Widget _sliverProductGrid(BuildContext context, List<Product> products, CustomerHomeFeedState state) {
    if (products.isEmpty) {
      return const SliverFillRemaining(
        hasScrollBody: false,
        child: Center(child: Text('No products yet')),
      );
    }
    return SliverPadding(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      sliver: SliverGrid(
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          mainAxisSpacing: 8,
          crossAxisSpacing: 8,
          childAspectRatio: 3 / 4,
        ),
        delegate: SliverChildBuilderDelegate(
          (context, i) {
            final p = products[i];
            return HomeProductCard(
              product: p,
              sharedBy: state.productTraderNameByProductId[p.id],
              onTap: () => context.push('/products/${p.id}'),
            );
          },
          childCount: products.length,
        ),
      ),
    );
  }
}

extension FirstWhereOrNullExt<T> on Iterable<T> {
  T? firstWhereOrNull(bool Function(T) test) {
    for (final e in this) {
      if (test(e)) return e;
    }
    return null;
  }
}

// ─── Trader ───────────────────────────────────────────────────────────────

class _TraderHomeScaffold extends ConsumerStatefulWidget {
  const _TraderHomeScaffold();

  @override
  ConsumerState<_TraderHomeScaffold> createState() => _TraderHomeScaffoldState();
}

class _TraderHomeScaffoldState extends ConsumerState<_TraderHomeScaffold> {
  final _searchCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _searchCtrl.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  static const _tabs = <(TraderWorkflowTab, String)>[
    (TraderWorkflowTab.neW, 'Recent'),
    (TraderWorkflowTab.seen, 'Pending'),
    (TraderWorkflowTab.shared, 'Shared'),
    (TraderWorkflowTab.ordered, 'Done'),
    (TraderWorkflowTab.skipped, 'Skipped'),
  ];

  int _countForTab(Map<String, dynamic>? c, TraderWorkflowTab t) {
    if (c == null) return 0;
    switch (t) {
      case TraderWorkflowTab.neW:
        return (c['TOTAL'] as num?)?.toInt() ?? 0;
      case TraderWorkflowTab.seen:
        return (c['SEEN'] as num?)?.toInt() ?? 0;
      case TraderWorkflowTab.shared:
        return (c['SHARED'] as num?)?.toInt() ?? 0;
      case TraderWorkflowTab.ordered:
        return (c['ORDERED'] as num?)?.toInt() ?? 0;
      case TraderWorkflowTab.skipped:
        return (c['SKIPPED'] as num?)?.toInt() ?? 0;
    }
  }

  List<Product> _parseProducts(List<dynamic>? raw) {
    if (raw == null) return [];
    final out = <Product>[];
    for (final e in raw) {
      if (e is Map<String, dynamic>) out.add(Product.fromJson(e));
    }
    return out;
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authSessionProvider.select((a) => a.user));
    final firstName = (user?.name ?? 'GarmentHub').split(' ').first;
    final tab = ref.watch(traderHomeTabProvider);
    final counts = ref.watch(traderWorkflowCountsProvider);
    final alerts = ref.watch(traderAlertsProvider);
    final newFeed = ref.watch(traderNewFeedProvider);
    final wfFeed = ref.watch(traderWorkflowFeedProvider);

    return Scaffold(
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _HomeStickyHeader(
              firstName: firstName,
              searchController: _searchCtrl,
              showShare: true,
              onRefresh: () async {
                ref.invalidate(traderWorkflowCountsProvider);
                ref.invalidate(traderAlertsProvider);
                ref.invalidate(traderNewFeedProvider);
                ref.invalidate(traderWorkflowFeedProvider);
                ref.invalidate(traderSentSharesProvider);
                await Future.wait([
                  ref.read(traderWorkflowCountsProvider.future),
                  ref.read(traderNewFeedProvider.future),
                ]);
              },
            ),
            alerts.when(
              data: (list) {
                if (list == null || list.isEmpty) return const SizedBox.shrink();
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  child: Material(
                    color: Theme.of(context).colorScheme.errorContainer.withValues(alpha: 0.35),
                    borderRadius: BorderRadius.circular(12),
                    child: InkWell(
                      onTap: () => context.push('/orders'),
                      borderRadius: BorderRadius.circular(12),
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${list.length} order${list.length == 1 ? '' : 's'} need attention',
                              style: TextStyle(fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.error),
                            ),
                            Text('Tap to review', style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.error)),
                          ],
                        ),
                      ),
                    ),
                  ),
                );
              },
              loading: () => const SizedBox.shrink(),
              error: (e, st) => const SizedBox.shrink(),
            ),
            SizedBox(
              height: 48,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 8),
                children: [
                  for (final pair in _tabs)
                    Padding(
                      padding: const EdgeInsets.only(right: 6),
                      child: counts.when(
                        loading: () => const SizedBox.shrink(),
                        error: (e, st) => const SizedBox.shrink(),
                        data: (c) {
                          final n = _countForTab(c, pair.$1);
                          final sel = tab == pair.$1;
                          return ChoiceChip(
                            label: Text(n > 0 ? '${pair.$2} $n' : pair.$2),
                            selected: sel,
                            onSelected: (_) => ref.read(traderHomeTabProvider.notifier).state = pair.$1,
                          );
                        },
                      ),
                    ),
                ],
              ),
            ),
            Expanded(
              child: _buildTraderBody(context, tab, newFeed, wfFeed),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTraderBody(
    BuildContext context,
    TraderWorkflowTab tab,
    AsyncValue<TraderNewFeedResult?> newFeed,
    AsyncValue<Map<String, dynamic>?> wfFeed,
  ) {
    final q = _searchCtrl.text.toLowerCase().trim();

    if (tab == TraderWorkflowTab.neW) {
      return newFeed.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(apiErrorMessage(e))),
        data: (data) {
          if (data == null) return const SizedBox.shrink();
          if (data.isGrouped && data.groupedRaw != null) {
            return ListView.builder(
              padding: const EdgeInsets.only(bottom: 80),
              itemCount: data.groupedRaw!.length,
              itemBuilder: (context, gi) {
                final g = data.groupedRaw![gi];
                if (g is! Map<String, dynamic>) return const SizedBox.shrink();
                final vendor = g['vendor'];
                final dateStr = g['date']?.toString() ?? '';
                final prods = _parseProducts(g['products'] as List?);
                final filteredProds = q.isEmpty ? prods : prods.where((p) => p.name.toLowerCase().contains(q)).toList();
                final vName = vendor is Map
                    ? (vendor['businessName']?.toString().trim().isNotEmpty == true
                        ? vendor['businessName'].toString()
                        : vendor['name']?.toString() ?? '')
                    : '';
                final label = _traderGroupDateLabel(dateStr);
                if (filteredProds.isEmpty) return const SizedBox.shrink();
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ListTile(
                      dense: true,
                      leading: CircleAvatar(
                        child: Text(vName.isNotEmpty ? vName[0].toUpperCase() : '?'),
                      ),
                      title: Text(vName, maxLines: 1, overflow: TextOverflow.ellipsis),
                      subtitle: Text(label),
                    ),
                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        mainAxisSpacing: 8,
                        crossAxisSpacing: 8,
                        childAspectRatio: 3 / 4,
                      ),
                      itemCount: filteredProds.length,
                      itemBuilder: (_, i) {
                        final p = filteredProds[i];
                        return HomeProductCard(product: p, onTap: () => context.push('/products/${p.id}'));
                      },
                    ),
                    const SizedBox(height: 12),
                  ],
                );
              },
            );
          }
          final flat = _parseProducts(data.flatRaw);
          var list = flat;
          if (q.isNotEmpty) list = list.where((p) => p.name.toLowerCase().contains(q)).toList();
          if (list.isEmpty) {
            return const Center(child: Text('No products yet'));
          }
          return GridView.builder(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 80),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              mainAxisSpacing: 8,
              crossAxisSpacing: 8,
              childAspectRatio: 3 / 4,
            ),
            itemCount: list.length,
            itemBuilder: (_, i) => HomeProductCard(product: list[i], onTap: () => context.push('/products/${list[i].id}')),
          );
        },
      );
    }

    return wfFeed.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text(apiErrorMessage(e))),
      data: (map) {
        if (map == null) return const SizedBox.shrink();
        final raw = map['products'] as List?;
        var list = _parseProducts(raw);
        if (q.isNotEmpty) {
          list = list.where((p) => p.name.toLowerCase().contains(q)).toList();
        }
        if (list.isEmpty) {
          return const Center(child: Text('No products in this tab'));
        }
        return GridView.builder(
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 80),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            mainAxisSpacing: 8,
            crossAxisSpacing: 8,
            childAspectRatio: 3 / 4,
          ),
          itemCount: list.length,
          itemBuilder: (_, i) => HomeProductCard(product: list[i], onTap: () => context.push('/products/${list[i].id}')),
        );
      },
    );
  }

  String _traderGroupDateLabel(String dateKey) {
    final today = DateTime.now().toUtc().toIso8601String().substring(0, 10);
    if (dateKey == today) return "Today's collection";
    final dt = DateTime.tryParse('${dateKey}T12:00:00Z');
    if (dt == null) return dateKey;
    return '${dt.day} ${_mon(dt.month)} ${dt.year}';
  }

  String _mon(int m) {
    const n = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return n[m - 1];
  }
}
