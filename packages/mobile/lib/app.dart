import 'dart:async';
import 'dart:io';

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:receive_sharing_intent/receive_sharing_intent.dart';

import 'core/platform/share_targets_platform.dart';
import 'core/providers/app_providers.dart';
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

class _GarmentHubAppState extends ConsumerState<GarmentHubApp> with WidgetsBindingObserver {
  StreamSubscription<List<SharedMediaFile>>? _shareSub;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    if (!kIsWeb) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _initShareReceiver());
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _shareSub?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && !kIsWeb) {
      unawaited(_consumeIosHandoffAndNavigate());
    }
  }

  Future<bool> _consumeIosHandoffAndNavigate() async {
    if (kIsWeb || !Platform.isIOS) return false;
    final handoff = await ShareTargetsPlatform.consumeIosShareHandoff();
    if (handoff == null || handoff.paths.isEmpty) return false;
    if (!mounted) return false;
    await _goInbound(
      paths: handoff.paths,
      productId: handoff.productId,
      productName: handoff.productName,
    );
    return true;
  }

  /// Android/iOS only — [receive_sharing_intent] has no web implementation; calling it
  /// throws [MissingPluginException] and breaks unrelated flows (e.g. gallery upload).
  Future<void> _initShareReceiver() async {
    final hadIosHandoff = await _consumeIosHandoffAndNavigate();

    _shareSub = ReceiveSharingIntent.instance.getMediaStream().listen(_handleShareFiles);
    final initial = await ReceiveSharingIntent.instance.getInitialMedia();
    if (!hadIosHandoff) {
      await _handleShareFiles(initial);
    }
    await ReceiveSharingIntent.instance.reset();

    final auth = ref.read(authSessionProvider);
    if (auth.isAuthenticated && auth.user?.role == UserRole.vendor) {
      await VendorSharePrefs.syncOsShareTargets();
    }
  }

  Future<void> _goInbound({
    required List<String> paths,
    String? productId,
    String? productName,
  }) async {
    final auth = ref.read(authSessionProvider);
    if (auth.isAuthenticated && auth.user?.role == UserRole.vendor) {
      await VendorSharePrefs.clearPendingSharePaths();
      if (!mounted) return;
      ref.read(goRouterProvider).go(
            '/vendor/inbound-share',
            extra: VendorInboundShareArgs(
              paths,
              preselectedProductId: productId,
              preselectedProductName: productName,
            ),
          );
    } else {
      await VendorSharePrefs.savePendingSharePaths(paths);
    }
  }

  Future<void> _handleShareFiles(List<SharedMediaFile> media) async {
    if (!kIsWeb && Platform.isIOS) {
      final handoff = await ShareTargetsPlatform.consumeIosShareHandoff();
      if (handoff != null && handoff.paths.isNotEmpty) {
        await _goInbound(
          paths: handoff.paths,
          productId: handoff.productId,
          productName: handoff.productName,
        );
        return;
      }
    }

    if (media.isEmpty) return;
    final paths = media
        .where((m) => m.type == SharedMediaType.image && m.path.trim().isNotEmpty)
        .map((m) => m.path.trim())
        .take(20)
        .toList();
    if (paths.isEmpty) return;

    final extra = await ShareTargetsPlatform.consumeShareProductExtra();
    await _goInbound(
      paths: paths,
      productId: extra.productId,
      productName: extra.productName,
    );
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(authSessionProvider, (prev, next) async {
      if (!next.isAuthenticated) return;
      if (next.user?.role != UserRole.vendor) {
        await VendorSharePrefs.clearPendingSharePaths();
        return;
      }
      await VendorSharePrefs.syncOsShareTargets();
      final pending = await VendorSharePrefs.readPendingSharePaths();
      if (pending.isEmpty) return;
      await VendorSharePrefs.clearPendingSharePaths();
      if (!mounted) return;
      ref.read(goRouterProvider).go('/vendor/inbound-share', extra: VendorInboundShareArgs(pending));
    });

    final router = ref.watch(goRouterProvider);
    return MaterialApp.router(
      title: 'GarmentHub',
      theme: AppTheme.light(),
      routerConfig: router,
    );
  }
}
