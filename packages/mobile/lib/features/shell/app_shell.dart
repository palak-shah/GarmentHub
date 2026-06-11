import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../shared/models/user.dart';

/// Bottom navigation aligned with `packages/frontend/src/components/layout/BottomNav.tsx`.
class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.child});

  final Widget child;

  static const _hidePrefixes = [
    '/products/',
    '/orders/',
    '/bulk-order',
    '/trader/share',
    '/trader/groups',
    '/vendor/inbound-share',
  ];

  @override
  Widget build(BuildContext context) {
    final loc = GoRouterState.of(context).uri.path;
    final role = AppShellRoleScope.roleOf(context);
    if (role == null) return child;

    final hideNav = _hidePrefixes.any((p) => loc.startsWith(p));
    if (hideNav) {
      return child;
    }

    final items = _navItems(role);
    final idx = _indexForPath(loc, items, role);
    final theme = Theme.of(context);

    Widget bottomBar = NavigationBar(
      selectedIndex: idx.clamp(0, items.length - 1),
      onDestinationSelected: (i) => context.go(items[i].path),
      destinations: [
        for (final it in items)
          NavigationDestination(icon: Icon(it.icon), label: it.label),
      ],
    );

    if (role == UserRole.vendor) {
      final nav = theme.navigationBarTheme;
      bottomBar = Theme(
        data: theme.copyWith(
          navigationBarTheme: nav.copyWith(
            indicatorShape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
        child: bottomBar,
      );
    }

    return Scaffold(
      body: child,
      bottomNavigationBar: bottomBar,
    );
  }

  int _indexForPath(String path, List<_NavItem> items, UserRole role) {
    // Vendor: upload and product CRUD live under the Products journey.
    if (role == UserRole.vendor) {
      if (path == '/vendor/upload' || path.startsWith('/vendor/products')) {
        return 1;
      }
    }
    for (var i = 0; i < items.length; i++) {
      final p = items[i].path;
      if (p == '/' || p == '/vendor' || p == '/admin') {
        if (path == p) return i;
      } else if (path == p || path.startsWith('$p/')) {
        return i;
      }
    }
    return 0;
  }

  List<_NavItem> _navItems(UserRole role) {
    switch (role) {
      case UserRole.vendor:
        return const [
          _NavItem('/vendor', 'Home', Icons.grid_view_rounded),
          _NavItem('/vendor/products', 'Products', Icons.inventory_2_outlined),
          _NavItem('/network', 'Connect', Icons.people_outline),
          _NavItem('/vendor/orders', 'Orders', Icons.assignment_outlined),
          _NavItem('/profile', 'Profile', Icons.person_outline),
        ];
      case UserRole.admin:
        return const [
          _NavItem('/admin', 'Dashboard', Icons.dashboard_outlined),
          _NavItem('/admin/users', 'Users', Icons.people_outline),
          _NavItem('/admin/orders', 'Orders', Icons.assignment_outlined),
          _NavItem('/profile', 'Profile', Icons.person_outline),
        ];
      default:
        return const [
          _NavItem('/', 'Home', Icons.home_outlined),
          _NavItem('/saved', 'Saved', Icons.bookmark_outline),
          _NavItem('/network', 'People', Icons.people_outline),
          _NavItem('/orders', 'Orders', Icons.assignment_outlined),
          _NavItem('/profile', 'Profile', Icons.person_outline),
        ];
    }
  }
}

class _NavItem {
  const _NavItem(this.path, this.label, this.icon);
  final String path;
  final String label;
  final IconData icon;
}

/// Provides [UserRole] to [AppShell] for tab labels and selection.
class AppShellRoleScope extends StatelessWidget {
  const AppShellRoleScope({super.key, required this.role, required this.child});

  final UserRole role;
  final Widget child;

  static UserRole? roleOf(BuildContext context) {
    final w = context.dependOnInheritedWidgetOfExactType<_InheritedRole>();
    return w?.role;
  }

  @override
  Widget build(BuildContext context) => _InheritedRole(role: role, child: child);
}

class _InheritedRole extends InheritedWidget {
  const _InheritedRole({required this.role, required super.child});

  final UserRole role;

  @override
  bool updateShouldNotify(_InheritedRole oldWidget) => oldWidget.role != role;
}
