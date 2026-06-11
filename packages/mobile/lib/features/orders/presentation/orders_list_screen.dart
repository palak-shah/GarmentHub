import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/network/api_error.dart';
import '../../../shared/models/order.dart';
import '../../../shared/models/product.dart';
import '../../../shared/models/user.dart';
import '../../../shared/widgets/gh_empty_state.dart';
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

enum _OrderTabKind { fromMe, waiting, done, cancelled }

class _TabDef {
  const _TabDef({required this.kind, required this.label, this.statuses = const []});
  final _OrderTabKind kind;
  final String label;
  final List<String> statuses;
}

class OrdersListScreen extends ConsumerStatefulWidget {
  const OrdersListScreen({super.key});

  @override
  ConsumerState<OrdersListScreen> createState() => _OrdersListScreenState();
}

class _OrdersListScreenState extends ConsumerState<OrdersListScreen> {
  int _tabIndex = 0;
  int _traderSegment = 0; // 0 all, 1 managed, 2 direct

  List<_TabDef> _tabDefs(UserRole? role) {
    if (role == UserRole.customer || role == UserRole.trader) {
      return const [
        _TabDef(kind: _OrderTabKind.fromMe, label: 'Pending from me'),
        _TabDef(kind: _OrderTabKind.waiting, label: 'Waiting', statuses: ['PENDING']),
        _TabDef(kind: _OrderTabKind.done, label: 'Done', statuses: ['ACCEPTED', 'PARTIALLY_ACCEPTED', 'CONFIRMED']),
        _TabDef(kind: _OrderTabKind.cancelled, label: 'Cancelled', statuses: ['REJECTED', 'CANCELLED']),
      ];
    }
    return const [
      _TabDef(kind: _OrderTabKind.waiting, label: 'Waiting', statuses: ['PENDING']),
      _TabDef(kind: _OrderTabKind.done, label: 'Done', statuses: ['ACCEPTED', 'PARTIALLY_ACCEPTED', 'CONFIRMED']),
      _TabDef(kind: _OrderTabKind.cancelled, label: 'Cancelled', statuses: ['REJECTED', 'CANCELLED']),
    ];
  }

  List<Order> _traderModeFilter(List<Order> orders, UserRole? role) {
    if (role != UserRole.trader) return orders;
    switch (_traderSegment) {
      case 1:
        return orders.where((o) => o.orderMode == 'MANAGED').toList();
      case 2:
        return orders.where((o) => o.orderMode == 'DIRECT').toList();
      default:
        return orders;
    }
  }

  int _countForTab(List<Order> base, _TabDef def, String? userId, UserRole? role) {
    switch (def.kind) {
      case _OrderTabKind.fromMe:
        if (userId == null || (role != UserRole.customer && role != UserRole.trader)) return 0;
        return base.where((o) => isPendingActionFromViewer(o, o.items, role!, userId)).length;
      case _OrderTabKind.waiting:
      case _OrderTabKind.done:
      case _OrderTabKind.cancelled:
        return base.where((o) => def.statuses.contains(o.status)).length;
    }
  }

  List<Order> _filterOrders(List<Order> orders, _TabDef def, String? userId, UserRole? role) {
    switch (def.kind) {
      case _OrderTabKind.fromMe:
        if (userId == null || (role != UserRole.customer && role != UserRole.trader)) return [];
        return orders.where((o) => isPendingActionFromViewer(o, o.items, role!, userId)).toList();
      case _OrderTabKind.waiting:
      case _OrderTabKind.done:
      case _OrderTabKind.cancelled:
        return orders.where((o) => def.statuses.contains(o.status)).toList();
    }
  }

  String _fmtDate(String iso) {
    final dt = DateTime.tryParse(iso);
    if (dt == null) return iso;
    return DateFormat('d MMM yyyy').format(dt.toLocal());
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(ordersListProvider);
    final user = ref.watch(authSessionProvider.select((a) => a.user));
    final role = user?.role;
    final userId = user?.id;
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Orders'),
        centerTitle: false,
        titleTextStyle: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
      ),
      body: async.when(
        data: (orders) {
          final base = _traderModeFilter(orders, role);
          final defs = _tabDefs(role);
          final counts = defs.map((d) => _countForTab(base, d, userId, role)).toList();
          final idx = _tabIndex.clamp(0, defs.length - 1);
          final activeDef = defs[idx];
          final filtered = _filterOrders(base, activeDef, userId, role);

          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (role == UserRole.trader)
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
                  child: SegmentedButton<int>(
                    segments: const [
                      ButtonSegment(value: 0, label: Text('All'), icon: Icon(Icons.grid_view_outlined, size: 18)),
                      ButtonSegment(value: 1, label: Text('Managed')),
                      ButtonSegment(value: 2, label: Text('Direct')),
                    ],
                    selected: {_traderSegment},
                    onSelectionChanged: (s) => setState(() {
                      _traderSegment = s.first;
                      _tabIndex = 0;
                    }),
                  ),
                ),
              SizedBox(
                height: 52,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  itemCount: defs.length,
                  separatorBuilder: (_, unused) => const SizedBox(width: 8),
                  itemBuilder: (context, i) {
                    final d = defs[i];
                    final n = counts[i];
                    final selected = i == idx;
                    return FilterChip(
                      selected: selected,
                      label: Text(n > 0 ? '${d.label} · $n' : d.label),
                      onSelected: (_) => setState(() => _tabIndex = i),
                      showCheckmark: false,
                      selectedColor: scheme.primaryContainer,
                      checkmarkColor: scheme.onPrimaryContainer,
                    );
                  },
                ),
              ),
              Expanded(
                child: filtered.isEmpty
                    ? GhEmptyState(
                        icon: Icons.receipt_long_outlined,
                        title: 'No orders here',
                        subtitle: 'Try another tab or pull to refresh.',
                      )
                    : RefreshIndicator(
                        onRefresh: () async => ref.invalidate(ordersListProvider),
                        child: ListView.separated(
                          padding: const EdgeInsets.fromLTRB(12, 4, 12, 88),
                          itemCount: filtered.length,
                          separatorBuilder: (_, unused) => const SizedBox(height: 10),
                          itemBuilder: (context, i) => _OrderCard(
                            order: filtered[i],
                            role: role,
                            fmtDate: _fmtDate,
                            onTap: () => context.push('/orders/${filtered[i].id}'),
                          ),
                        ),
                      ),
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

class _OrderCard extends StatelessWidget {
  const _OrderCard({
    required this.order,
    required this.role,
    required this.fmtDate,
    required this.onTap,
  });

  final Order order;
  final UserRole? role;
  final String Function(String) fmtDate;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;

    String headline;
    Color badgeBg;
    Color badgeFg;
    String? sub;
    bool actionRequired = false;
    if (role == UserRole.customer) {
      final d = getCustomerOrderDecisionLabel(order, order.items);
      headline = d.headline;
      sub = d.subline;
      actionRequired = d.actionRequired;
      badgeBg = d.actionRequired ? scheme.errorContainer : scheme.secondaryContainer;
      badgeFg = d.actionRequired ? scheme.onErrorContainer : scheme.onSecondaryContainer;
    } else if (role == UserRole.trader) {
      final t = getTraderOrderStage(order, order.items);
      headline = t.stageLabel;
      sub = t.detail;
      actionRequired = t.actionRequired;
      badgeBg = t.actionRequired ? scheme.tertiaryContainer : scheme.surfaceContainerHighest;
      badgeFg = t.actionRequired ? scheme.onTertiaryContainer : scheme.onSurfaceVariant;
    } else {
      headline = order.status;
      badgeBg = scheme.surfaceContainerHighest;
      badgeFg = scheme.onSurfaceVariant;
    }

    final shortId = order.id.length > 6 ? order.id.substring(order.id.length - 6).toUpperCase() : order.id.toUpperCase();
    final managed = order.orderMode == 'MANAGED';

    return Card(
      elevation: 0,
      color: scheme.surfaceContainerLow,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
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
                        Text('Order #$shortId', style: text.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Text(fmtDate(order.createdAt), style: text.bodySmall?.copyWith(color: scheme.onSurfaceVariant)),
                            const SizedBox(width: 8),
                            Chip(
                              label: Text(managed ? 'Managed' : 'Direct', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600)),
                              visualDensity: VisualDensity.compact,
                              padding: EdgeInsets.zero,
                              labelPadding: const EdgeInsets.symmetric(horizontal: 8),
                              backgroundColor: managed ? scheme.primaryContainer : scheme.surfaceContainerHighest,
                              side: BorderSide.none,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Chip(
                        label: Text(headline, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: badgeFg)),
                        backgroundColor: badgeBg,
                        side: BorderSide.none,
                        visualDensity: VisualDensity.compact,
                      ),
                      if (sub != null && sub.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: ConstrainedBox(
                            constraints: const BoxConstraints(maxWidth: 140),
                            child: Text(
                              sub,
                              style: text.labelSmall?.copyWith(
                                color: actionRequired ? scheme.error : scheme.onSurfaceVariant,
                              ),
                              textAlign: TextAlign.end,
                            ),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 12),
              ...order.items.take(3).map((item) {
                Product? p;
                try {
                  p = Product.fromJson(item.product);
                } catch (_) {}
                final img = p?.primaryImageUrl ?? '';
                return Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Row(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: SizedBox(
                          width: 36,
                          height: 36,
                          child: img.isEmpty
                              ? ColoredBox(color: scheme.surfaceContainerHighest, child: Icon(Icons.image_outlined, size: 18, color: scheme.onSurfaceVariant))
                              : Image.network(img, fit: BoxFit.cover),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(child: Text(p?.name ?? 'Product', maxLines: 1, overflow: TextOverflow.ellipsis, style: text.bodyMedium)),
                      Text('×${item.requestedQty}', style: text.bodySmall?.copyWith(color: scheme.onSurfaceVariant)),
                    ],
                  ),
                );
              }),
              if (order.items.length > 3)
                Text('+${order.items.length - 3} more', style: text.labelSmall?.copyWith(color: scheme.onSurfaceVariant)),
            ],
          ),
        ),
      ),
    );
  }
}
