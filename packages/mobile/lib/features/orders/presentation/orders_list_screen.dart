import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/config/environment.dart';
import '../../../core/network/api_error.dart';
import '../../../shared/models/order.dart';
import '../../../shared/models/user.dart';
import '../domain/order_workflow.dart';

final ordersListProvider = FutureProvider<List<Order>>((ref) async {
  final raw = await ref.read(orderApiProvider).list();
  if (raw is List) {
    final out = <Order>[];
    for (final e in raw) {
      if (e is Map<String, dynamic>) {
        if (e.containsKey('items')) {
          out.add(Order.fromJson(e));
        }
      }
    }
    return out;
  }
  return [];
});

enum _OrdersTabKind { fromMe, status }

class _OrdersTabDef {
  const _OrdersTabDef.fromMe() : kind = _OrdersTabKind.fromMe, label = 'Pending from me', statuses = const [];
  const _OrdersTabDef.status(this.label, this.statuses) : kind = _OrdersTabKind.status;

  final _OrdersTabKind kind;
  final String label;
  final List<String> statuses;
}

List<_OrdersTabDef> _tabDefsForRole(UserRole? role) {
  if (role == UserRole.customer || role == UserRole.trader) {
    return const [
      _OrdersTabDef.fromMe(),
      _OrdersTabDef.status('Waiting', ['PENDING']),
      _OrdersTabDef.status('Done', ['ACCEPTED', 'PARTIALLY_ACCEPTED', 'CONFIRMED']),
      _OrdersTabDef.status('Cancelled', ['REJECTED', 'CANCELLED']),
    ];
  }
  return const [
    _OrdersTabDef.status('Waiting', ['PENDING']),
    _OrdersTabDef.status('Done', ['ACCEPTED', 'PARTIALLY_ACCEPTED', 'CONFIRMED']),
    _OrdersTabDef.status('Cancelled', ['REJECTED', 'CANCELLED']),
  ];
}

enum _TraderOrderFilter { all, managed, direct }

class OrdersListScreen extends ConsumerStatefulWidget {
  const OrdersListScreen({super.key});

  @override
  ConsumerState<OrdersListScreen> createState() => _OrdersListScreenState();
}

class _OrdersListScreenState extends ConsumerState<OrdersListScreen> {
  int? _activeTab;
  _TraderOrderFilter _traderFilter = _TraderOrderFilter.all;

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authSessionProvider);
    final user = auth.user;
    final role = user?.role;
    final userId = user?.id ?? '';
    final async = ref.watch(ordersListProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Orders')),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(apiErrorMessageVerbose(e)))),
        data: (orders) {
          final tabDefs = _tabDefsForRole(role);
          final isTrader = role == UserRole.trader;
          final traderFiltered = isTrader
              ? orders.where((o) {
                  switch (_traderFilter) {
                    case _TraderOrderFilter.managed:
                      return o.orderMode == 'MANAGED';
                    case _TraderOrderFilter.direct:
                      return o.orderMode == 'DIRECT';
                    case _TraderOrderFilter.all:
                      return true;
                  }
                }).toList()
              : orders;

          final counts = List<int>.generate(tabDefs.length, (i) {
            final def = tabDefs[i];
            if (def.kind == _OrdersTabKind.fromMe && (role == UserRole.customer || role == UserRole.trader)) {
              return traderFiltered.where((o) => isPendingActionFromViewer(o, o.items, role!, userId)).length;
            }
            if (def.kind == _OrdersTabKind.fromMe) return 0;
            return traderFiltered.where((o) => def.statuses.contains(o.status)).length;
          });

          var smartIdx = 0;
          if (userId.isNotEmpty && (role == UserRole.customer || role == UserRole.trader)) {
            final fromMeIdx = tabDefs.indexWhere((d) => d.kind == _OrdersTabKind.fromMe);
            final fromMeCount = fromMeIdx >= 0 ? counts[fromMeIdx] : 0;
            if (fromMeCount > 0) {
              smartIdx = fromMeIdx;
            } else {
              var firstNonEmpty = -1;
              for (var j = 0; j < counts.length; j++) {
                if (j != fromMeIdx && counts[j] > 0) {
                  firstNonEmpty = j;
                  break;
                }
              }
              final waitingIdx = tabDefs.indexWhere((d) => d.label == 'Waiting');
              smartIdx = firstNonEmpty >= 0 ? firstNonEmpty : (waitingIdx >= 0 ? waitingIdx : 0);
            }
          }

          final effectiveTab = (_activeTab != null && _activeTab! < tabDefs.length) ? _activeTab! : smartIdx;
          final safeTab = effectiveTab.clamp(0, tabDefs.length - 1);
          final def = tabDefs[safeTab];

          final filtered = traderFiltered.where((o) {
            if (def.kind == _OrdersTabKind.fromMe) {
              if (role != UserRole.customer && role != UserRole.trader) return false;
              return isPendingActionFromViewer(o, o.items, role!, userId);
            }
            return def.statuses.contains(o.status);
          }).toList();

          final managedCount = isTrader ? orders.where((o) => o.orderMode == 'MANAGED').length : 0;
          final directCount = isTrader ? orders.where((o) => o.orderMode == 'DIRECT').length : 0;

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(ordersListProvider),
            child: CustomScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              slivers: [
                if (isTrader)
                  SliverToBoxAdapter(
                    child: SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
                      child: Row(
                        children: [
                          _FilterChip(
                            label: 'All',
                            count: orders.length,
                            selected: _traderFilter == _TraderOrderFilter.all,
                            onTap: () => setState(() => _traderFilter = _TraderOrderFilter.all),
                          ),
                          const SizedBox(width: 6),
                          _FilterChip(
                            label: 'Managed',
                            count: managedCount,
                            selected: _traderFilter == _TraderOrderFilter.managed,
                            onTap: () => setState(() => _traderFilter = _TraderOrderFilter.managed),
                          ),
                          const SizedBox(width: 6),
                          _FilterChip(
                            label: 'Direct',
                            count: directCount,
                            selected: _traderFilter == _TraderOrderFilter.direct,
                            onTap: () => setState(() => _traderFilter = _TraderOrderFilter.direct),
                          ),
                        ],
                      ),
                    ),
                  ),
                SliverToBoxAdapter(
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
                    child: Row(
                      children: [
                        for (var i = 0; i < tabDefs.length; i++) ...[
                          if (i > 0) const SizedBox(width: 6),
                          _FilterChip(
                            label: tabDefs[i].label,
                            count: counts[i],
                            selected: safeTab == i,
                            onTap: () => setState(() => _activeTab = i),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
                if (filtered.isEmpty)
                  SliverFillRemaining(
                    hasScrollBody: false,
                    child: Center(
                      child: Padding(
                        padding: const EdgeInsets.all(32),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.receipt_long_outlined, size: 56, color: Theme.of(context).colorScheme.outline),
                            const SizedBox(height: 16),
                            Text(
                              def.kind == _OrdersTabKind.fromMe ? 'Nothing needs your confirmation right now.' : 'No matching orders',
                              textAlign: TextAlign.center,
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              def.kind == _OrdersTabKind.fromMe
                                  ? 'Open Waiting to follow orders in progress.'
                                  : 'Your orders will show up here.',
                              textAlign: TextAlign.center,
                              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                                  ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  )
                else
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(12, 4, 12, 88),
                    sliver: SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (context, i) => Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: _OrderCardTile(order: filtered[i], role: role),
                        ),
                        childCount: filtered.length,
                      ),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.count,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final int count;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Material(
      color: selected ? scheme.primary : scheme.surfaceContainerHighest,
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                  color: selected ? scheme.onPrimary : scheme.onSurfaceVariant,
                ),
              ),
              if (count > 0) ...[
                const SizedBox(width: 6),
                Text(
                  '$count',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: selected ? scheme.onPrimary.withValues(alpha: 0.85) : scheme.onSurfaceVariant.withValues(alpha: 0.7),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _OrderCardTile extends StatelessWidget {
  const _OrderCardTile({required this.order, required this.role});

  final Order order;
  final UserRole? role;

  static String _formatDate(String iso) {
    final d = DateTime.tryParse(iso);
    if (d == null) return iso;
    return DateFormat('d MMM y').format(d.toLocal());
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    String headline;
    Color badgeBg;
    Color badgeFg;
    String? sub;
    if (role == UserRole.customer) {
      final d = getCustomerOrderDecisionLabel(order, order.items);
      headline = d.headline;
      sub = d.actionRequired ? 'Action required' : d.subline;
      badgeFg = d.actionRequired ? const Color(0xFF92400E) : scheme.onSecondaryContainer;
      badgeBg = d.actionRequired ? const Color(0xFFFEF3C7) : scheme.secondaryContainer;
    } else if (role == UserRole.trader) {
      final t = getTraderOrderStage(order, order.items);
      headline = t.stageLabel;
      sub = t.detail;
      badgeFg = t.actionRequired ? const Color(0xFF92400E) : const Color(0xFF334155);
      badgeBg = t.actionRequired ? const Color(0xFFFEF3C7) : const Color(0xFFE2E8F0);
    } else {
      headline = order.status;
      badgeBg = scheme.surfaceContainerHighest;
      badgeFg = scheme.onSurfaceVariant;
    }

    final trader = order.raw['trader'] is Map ? Map<String, dynamic>.from(order.raw['trader'] as Map) : null;
    final traderLabel = trader == null
        ? null
        : (trader['businessName']?.toString().trim().isNotEmpty == true
            ? trader['businessName'] as String
            : trader['name']?.toString());

    return Material(
      color: scheme.surface,
      elevation: 1,
      shadowColor: Colors.black26,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: () => context.push('/orders/${order.id}'),
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Order #${order.id.length > 6 ? order.id.substring(order.id.length - 6).toUpperCase() : order.id.toUpperCase()}',
                          style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Text(
                              _formatDate(order.createdAt),
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: order.orderMode == 'MANAGED' ? scheme.primaryContainer : scheme.surfaceContainerHighest,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                order.orderMode == 'MANAGED' ? 'Managed' : 'Direct',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  color: order.orderMode == 'MANAGED' ? scheme.onPrimaryContainer : scheme.onSurfaceVariant,
                                ),
                              ),
                            ),
                          ],
                        ),
                        if (traderLabel != null && traderLabel.isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Text(
                              'via $traderLabel',
                              style: Theme.of(context).textTheme.labelSmall?.copyWith(color: scheme.outline),
                            ),
                          ),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(color: badgeBg, borderRadius: BorderRadius.circular(8)),
                        child: Text(
                          headline,
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: badgeFg),
                        ),
                      ),
                      if (sub != null && sub.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: ConstrainedBox(
                            constraints: const BoxConstraints(maxWidth: 140),
                            child: Text(
                              sub,
                              textAlign: TextAlign.end,
                              style: Theme.of(context).textTheme.labelSmall?.copyWith(color: scheme.onSurfaceVariant, height: 1.2),
                            ),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 12),
              ...order.items.take(3).map((it) {
                final imgs = it.product['images'];
                String? rel;
                if (imgs is List && imgs.isNotEmpty) {
                  rel = imgs.first.toString();
                }
                final url = rel != null && rel.isNotEmpty ? Environment.resolveMediaUrl(rel) : '';
                return Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Row(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: SizedBox(
                          width: 32,
                          height: 32,
                          child: url.isNotEmpty
                              ? Image.network(url, fit: BoxFit.cover)
                              : ColoredBox(color: scheme.surfaceContainerHighest, child: Icon(Icons.image_outlined, size: 16, color: scheme.outline)),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          it.product['name']?.toString() ?? 'Product',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ),
                      Text('×${it.requestedQty}', style: Theme.of(context).textTheme.bodySmall?.copyWith(color: scheme.onSurfaceVariant)),
                    ],
                  ),
                );
              }),
              if (order.items.length > 3)
                Text(
                  '+${order.items.length - 3} more items',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(color: scheme.outline),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
