import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../api/api_providers.dart';
import '../../shared/models/user.dart';
import '../../features/shell/app_shell.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/home/presentation/customer_home_screen.dart';
import '../../features/products/presentation/product_list_screen.dart';
import '../../features/products/presentation/product_detail_screen.dart';
import '../../features/products/presentation/trader_gallery_screen.dart';
import '../../features/curation/presentation/customer_shared_photos_screen.dart';
import '../../features/orders/presentation/bulk_order_screen.dart';
import '../../features/orders/presentation/orders_list_screen.dart';
import '../../features/orders/presentation/order_detail_screen.dart';
import '../../features/products/presentation/saved_screen.dart';
import '../../features/network/presentation/network_screen.dart';
import '../../features/network/presentation/trader_insights_screen.dart';
import '../../features/notifications/presentation/notifications_screen.dart';
import '../../features/profile/presentation/profile_screen.dart';
import '../../features/curation/presentation/share_products_screen.dart';
import '../../features/curation/domain/trader_share_line.dart';
import '../../features/curation/presentation/customer_groups_screen.dart';
import '../../features/curation/presentation/customer_group_detail_screen.dart';
import '../../features/vendor/presentation/vendor_dashboard_screen.dart';
import '../../features/vendor/presentation/vendor_brand_list_screen.dart';
import '../../features/vendor/presentation/vendor_product_list_screen.dart';
import '../../features/vendor/presentation/product_form_screen.dart';
import '../../features/vendor/presentation/vendor_upload_screen.dart';
import '../../features/vendor/presentation/vendor_incoming_orders_screen.dart';
import '../../features/vendor/presentation/vendor_order_history_screen.dart';
import '../../features/vendor/presentation/vendor_catalog_screen.dart';
import '../../features/vendor/presentation/vendor_inbound_share_args.dart';
import '../../features/vendor/presentation/vendor_inbound_share_screen.dart';
import '../../features/admin/presentation/admin_dashboard_screen.dart';
import '../../features/admin/presentation/admin_users_screen.dart';
import '../../features/admin/presentation/admin_orders_screen.dart';
import '../../features/admin/presentation/admin_settings_screen.dart';

String? _homeForRole(UserRole r) {
  switch (r) {
    case UserRole.vendor:
      return '/vendor';
    case UserRole.admin:
      return '/admin';
    default:
      return '/';
  }
}

String? _redirect(Ref ref, BuildContext context, GoRouterState state) {
  final auth = ref.read(authSessionProvider);
  final path = state.uri.path;
  final loggingIn = path == '/login';

  if (!auth.isAuthenticated && !loggingIn) {
    return '/login';
  }
  if (auth.isAuthenticated && loggingIn) {
    return _homeForRole(auth.user!.role);
  }
  if (!auth.isAuthenticated) return null;

  final role = auth.user!.role;

  if (path == '/' && role == UserRole.vendor) return '/vendor';
  if (path == '/' && role == UserRole.admin) return '/admin';

  if (path.startsWith('/vendor') && role != UserRole.vendor) {
    return '/';
  }
  if (path == '/bulk-order' && role != UserRole.customer) {
    return '/';
  }

  return null;
}

final goRouterProvider = Provider<GoRouter>((ref) {
  ref.watch(authSessionProvider);

  return GoRouter(
    initialLocation: '/login',
    redirect: (context, state) => _redirect(ref, context, state),
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      ShellRoute(
        builder: (context, state, child) {
          final auth = ref.read(authSessionProvider);
          final user = auth.user;
          if (user == null) return child;
          return AppShellRoleScope(
            role: user.role,
            child: AppShell(child: child),
          );
        },
        routes: [
          GoRoute(path: '/', builder: (context, state) => const CustomerHomeScreen()),
          GoRoute(path: '/search', builder: (context, state) => const ProductListScreen()),
          /// Longer paths first so `/products/:id` never wins over `/products/:id/gallery`.
          GoRoute(
            path: '/products/:id/gallery',
            builder: (context, state) {
              final extra = state.extra;
              if (extra is TraderGallerySharedImagesExtra) {
                return TraderGalleryScreen(
                  productId: state.pathParameters['id']!,
                  restrictToSharedImageIds: extra.imageIdsInShareOrder,
                  sharedContextRecipientSummary: extra.sharedWithLabel,
                );
              }
              return TraderGalleryScreen(productId: state.pathParameters['id']!);
            },
          ),
          GoRoute(
            path: '/products/:id/shared-photos',
            builder: (context, state) => CustomerSharedPhotosScreen(productId: state.pathParameters['id']!),
          ),
          GoRoute(
            path: '/products/:id',
            builder: (context, state) => ProductDetailScreen(productId: state.pathParameters['id']!),
          ),
          GoRoute(path: '/bulk-order', builder: (context, state) => const BulkOrderScreen()),
          GoRoute(path: '/orders', builder: (context, state) => const OrdersListScreen()),
          GoRoute(
            path: '/orders/:id',
            builder: (context, state) => OrderDetailScreen(orderId: state.pathParameters['id']!),
          ),
          GoRoute(path: '/saved', builder: (context, state) => const SavedScreen()),
          GoRoute(path: '/network', builder: (context, state) => const NetworkScreen()),
          GoRoute(
            path: '/network/traders/:traderId',
            builder: (context, state) => TraderInsightsScreen(traderId: state.pathParameters['traderId']!),
          ),
          GoRoute(path: '/notifications', builder: (context, state) => const NotificationsScreen()),
          GoRoute(path: '/profile', builder: (context, state) => const ProfileScreen()),
          GoRoute(
            path: '/trader/share',
            builder: (context, state) {
              final extra = state.extra;
              String? initialId;
              List<TraderShareLine>? galleryLines;

              if (extra is String && extra.trim().isNotEmpty) {
                initialId = extra.trim();
              } else if (extra is List) {
                final parsed = <TraderShareLine>[];
                for (final e in extra) {
                  final l = TraderShareLine.tryParse(e);
                  if (l != null) parsed.add(l);
                }
                if (parsed.isNotEmpty) galleryLines = parsed;
              } else if (extra is Map) {
                if (extra['productId'] != null) {
                  final s = extra['productId'].toString().trim();
                  if (s.isNotEmpty) initialId = s;
                }
                final sl = extra['shareLines'];
                if (sl is List) {
                  final parsed = <TraderShareLine>[];
                  for (final e in sl) {
                    final l = TraderShareLine.tryParse(e);
                    if (l != null) parsed.add(l);
                  }
                  if (parsed.isNotEmpty) galleryLines = parsed;
                }
              }

              return ShareProductsScreen(
                initialProductId: galleryLines != null && galleryLines.isNotEmpty ? null : initialId,
                initialGalleryLines: galleryLines,
              );
            },
          ),
          GoRoute(path: '/trader/groups', builder: (context, state) => const CustomerGroupsScreen()),
          GoRoute(
            path: '/trader/groups/:groupId',
            builder: (context, state) => CustomerGroupDetailScreen(groupId: state.pathParameters['groupId']!),
          ),
          GoRoute(path: '/vendor', builder: (context, state) => const VendorDashboardScreen()),
          GoRoute(path: '/vendor/brands', builder: (context, state) => const VendorBrandListScreen()),
          GoRoute(path: '/vendor/products', builder: (context, state) => const VendorProductListScreen()),
          GoRoute(path: '/vendor/products/new', builder: (context, state) => const ProductFormScreen()),
          GoRoute(
            path: '/vendor/products/:id/edit',
            builder: (context, state) => ProductFormScreen(productId: state.pathParameters['id']!),
          ),
          GoRoute(path: '/vendor/upload', builder: (context, state) => const VendorUploadScreen()),
          GoRoute(
            path: '/vendor/inbound-share',
            builder: (context, state) {
              final extra = state.extra;
              if (extra is VendorInboundShareArgs) {
                return VendorInboundShareScreen(
                  initialPaths: extra.imagePaths,
                  preselectedProductId: extra.preselectedProductId,
                  preselectedProductName: extra.preselectedProductName,
                );
              }
              return const VendorInboundShareScreen(initialPaths: <String>[]);
            },
          ),
          GoRoute(path: '/vendor/orders', builder: (context, state) => const VendorIncomingOrdersScreen()),
          GoRoute(path: '/vendor/history', builder: (context, state) => const VendorOrderHistoryScreen()),
          GoRoute(path: '/vendor/catalog', builder: (context, state) => const VendorCatalogScreen()),
          GoRoute(path: '/admin', builder: (context, state) => const AdminDashboardScreen()),
          GoRoute(path: '/admin/users', builder: (context, state) => const AdminUsersScreen()),
          GoRoute(path: '/admin/orders', builder: (context, state) => const AdminOrdersScreen()),
          GoRoute(path: '/admin/settings', builder: (context, state) => const AdminSettingsScreen()),
        ],
      ),
    ],
  );
});
