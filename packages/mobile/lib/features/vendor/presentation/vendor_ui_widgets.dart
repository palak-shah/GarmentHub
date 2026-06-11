import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../core/theme/app_theme.dart';

/// Formats API ISO timestamps for vendor order cards.
String formatVendorOrderDate(String? iso) {
  final d = DateTime.tryParse(iso ?? '');
  if (d == null) return '';
  return DateFormat.yMMMd().add_jm().format(d.toLocal());
}

Map<String, dynamic>? _asMap(Object? v) {
  if (v is Map<String, dynamic>) return v;
  if (v is Map) return Map<String, dynamic>.from(v);
  return null;
}

String customerDisplayName(Map<String, dynamic>? order) {
  final c = _asMap(order?['customer']);
  if (c == null) return 'Customer';
  final name = (c['name'] as String?)?.trim();
  if (name != null && name.isNotEmpty) return name;
  final biz = (c['businessName'] as String?)?.trim();
  if (biz != null && biz.isNotEmpty) return biz;
  return 'Customer';
}

/// Rounded list card surface for vendor mocks.
class VendorCard extends StatelessWidget {
  const VendorCard({super.key, required this.child, this.padding = const EdgeInsets.all(16), this.onTap});

  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    Widget inner = Padding(padding: padding, child: child);
    if (onTap != null) {
      inner = InkWell(onTap: onTap, borderRadius: BorderRadius.circular(14), child: inner);
    }
    return Material(
      color: AppTheme.vendorCardBackground,
      borderRadius: BorderRadius.circular(14),
      clipBehavior: Clip.antiAlias,
      child: inner,
    );
  }
}

class VendorPrimaryTextButton extends StatelessWidget {
  const VendorPrimaryTextButton({super.key, required this.label, required this.onPressed});

  final String label;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    final primary = Theme.of(context).colorScheme.primary;
    return TextButton(
      onPressed: onPressed,
      style: TextButton.styleFrom(
        foregroundColor: primary,
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        minimumSize: Size.zero,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      ),
      child: Text(label, style: TextStyle(fontWeight: FontWeight.w600, color: primary)),
    );
  }
}

class VendorAcceptButton extends StatelessWidget {
  const VendorAcceptButton({super.key, required this.onPressed, this.label = 'Accept'});

  final VoidCallback? onPressed;
  final String label;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return FilledButton.tonal(
      onPressed: onPressed,
      style: FilledButton.styleFrom(
        backgroundColor: scheme.primaryContainer.withValues(alpha: 0.65),
        foregroundColor: scheme.primary,
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
      child: Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
    );
  }
}

class OrderStatusChip extends StatelessWidget {
  const OrderStatusChip({super.key, required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: scheme.primaryContainer.withValues(alpha: 0.55),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label.toUpperCase(),
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: scheme.primary,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.4,
            ),
      ),
    );
  }
}

class QtyChip extends StatelessWidget {
  const QtyChip({super.key, required this.qty});

  final int qty;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHighest.withValues(alpha: 0.9),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        'Qty $qty',
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: scheme.onSurfaceVariant,
              fontWeight: FontWeight.w600,
            ),
      ),
    );
  }
}

Future<void> showVendorOrderItemSheet(BuildContext context, Map<String, dynamic> item) {
  final product = _asMap(item['product']) ?? {};
  final order = _asMap(item['order']) ?? {};
  final customer = _asMap(order['customer']);
  final trader = _asMap(order['trader']);
  final productName = product['name']?.toString() ?? '—';
  final qty = item['requestedQty'];
  final status = item['status']?.toString() ?? '—';
  final itemId = item['id']?.toString() ?? '';
  final orderId = order['id']?.toString() ?? '';
  final created = formatVendorOrderDate(order['createdAt']?.toString());
  final responded = formatVendorOrderDate(item['respondedAt']?.toString());

  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (ctx) {
      final bottom = MediaQuery.paddingOf(ctx).bottom;
      return SafeArea(
        child: SingleChildScrollView(
          padding: EdgeInsets.fromLTRB(20, 8, 20, 20 + bottom),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Order summary', style: Theme.of(ctx).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(height: 16),
              _sheetRow(ctx, 'Customer', customer?['name']?.toString() ?? customer?['businessName']?.toString() ?? '—'),
              if (trader != null)
                _sheetRow(
                  ctx,
                  'Trader',
                  trader['name']?.toString() ?? trader['businessName']?.toString() ?? '—',
                ),
              _sheetRow(ctx, 'Product', productName),
              _sheetRow(ctx, 'Requested qty', '$qty'),
              _sheetRow(ctx, 'Line status', status),
              if (orderId.isNotEmpty) _sheetRow(ctx, 'Order ID', orderId),
              if (itemId.isNotEmpty) _sheetRow(ctx, 'Line item ID', itemId),
              if (created.isNotEmpty) _sheetRow(ctx, 'Order placed', created),
              if (responded.isNotEmpty) _sheetRow(ctx, 'Responded', responded),
            ],
          ),
        ),
      );
    },
  );
}

Widget _sheetRow(BuildContext context, String k, String v) {
  return Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 110,
          child: Text(
            k,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                  fontWeight: FontWeight.w600,
                ),
          ),
        ),
        Expanded(
          child: SelectableText(v, style: Theme.of(context).textTheme.bodyMedium),
        ),
      ],
    ),
  );
}
