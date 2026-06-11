import 'package:flutter/material.dart';

/// Small role label (API role string: TRADER, VENDOR, CUSTOMER).
class GhRoleChip extends StatelessWidget {
  const GhRoleChip({super.key, required this.role});

  final String role;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    late String label;
    late Color bg;
    late Color fg;
    switch (role.toUpperCase()) {
      case 'TRADER':
        label = 'Trader';
        bg = scheme.secondaryContainer;
        fg = scheme.onSecondaryContainer;
        break;
      case 'VENDOR':
        label = 'Vendor';
        bg = scheme.tertiaryContainer;
        fg = scheme.onTertiaryContainer;
        break;
      case 'CUSTOMER':
        label = 'Buyer';
        bg = scheme.primaryContainer;
        fg = scheme.onPrimaryContainer;
        break;
      default:
        label = role;
        bg = scheme.surfaceContainerHighest;
        fg = scheme.onSurfaceVariant;
    }
    return Chip(
      label: Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: fg)),
      visualDensity: VisualDensity.compact,
      padding: EdgeInsets.zero,
      labelPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 0),
      backgroundColor: bg,
      side: BorderSide.none,
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
    );
  }
}
