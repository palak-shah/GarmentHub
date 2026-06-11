import 'dart:async';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:receive_sharing_intent/receive_sharing_intent.dart';

import 'core/platform/android_direct_share.dart';
import 'core/providers/app_providers.dart';
import 'core/debug/client_debug_overlay.dart';
import 'core/routing/app_router.dart';
import 'core/theme/app_theme.dart';
import 'features/vendor/domain/vendor_share_prefs.dart';
import 'features/vendor/presentation/vendor_inbound_share_args.dart';
import 'shared/models/user.dart';

class GarmentHubApp extends ConsumerStatefulWidget {
  const GarmentHubApp({super.key});

  @override
  ConsumerState<GarmentHubApp> createState() => _GarmentHubAppState();
}

class _GarmentHubAppState extends ConsumerState<GarmentHubApp> {
  StreamSubscription<List<SharedMediaFile>>? _shareSub;

  @override
  void initState() {
    super.initState();
    if (!kIsWeb) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _initShareReceiver());
    }
  }

  @override
  void dispose() {
    _shareSub?.cancel();
    super.dispose();
  }

  Future<void> _initShareReceiver() async {
    if (kIsWeb || !Platform.isAndroid && !Platform.isIOS) return;
    _shareSub = ReceiveSharingIntent.instance.getMediaStream().listen(_handleShareFiles);
    final initial = await ReceiveSharingIntent.instance.getInitialMedia();
    await _handleShareFiles(initial);
    await ReceiveSharingIntent.instance.reset();
  }

  Future<void> _handleShareFiles(List<SharedMediaFile> media) async {
    if (media.isEmpty) return;
    final paths = media
        .where((m) => m.type == SharedMediaType.image && m.path.trim().isNotEmpty)
        .map((m) => m.path.trim())
        .take(20)
        .toList();
    if (paths.isEmpty) return;

    final routing = await AndroidDirectShare.consumeDirectShareExtras();
    if (!mounted) return;

    final auth = ref.read(authSessionProvider);
    if (!auth.isAuthenticated || auth.user?.role != UserRole.vendor) {
      await VendorSharePrefs.savePendingSharePaths(paths);
      return;
    }

    ref.read(goRouterProvider).go(
          '/vendor/inbound-share',
          extra: VendorInboundShareArgs(
            paths,
            preselectedProductId: routing.productId,
            preselectedProductName: routing.productName,
          ),
        );
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(authSessionProvider, (prev, next) async {
      if (prev?.isAuthenticated == true && !next.isAuthenticated) {
        await VendorSharePrefs.clearAll();
      }
      if (next.isAuthenticated && next.user?.role == UserRole.vendor) {
        await VendorSharePrefs.syncAndroidDirectShare();
        final pending = await VendorSharePrefs.readPendingSharePaths();
        if (pending.isEmpty || !mounted) return;
        await VendorSharePrefs.clearPendingSharePaths();
        ref.read(goRouterProvider).go('/vendor/inbound-share', extra: VendorInboundShareArgs(pending));
      }
    });

    final router = ref.watch(goRouterProvider);
    return MaterialApp.router(
      title: 'GarmentHub',
      theme: AppTheme.light(),
      themeMode: ThemeMode.light,
      routerConfig: router,
      builder: (context, child) => wrapWithClientDebugBanner(child),
    );
  }
}
