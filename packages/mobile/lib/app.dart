import 'dart:async';
import 'dart:io';

import 'package:flutter/foundation.dart' show kDebugMode, kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:receive_sharing_intent/receive_sharing_intent.dart';

import 'core/api/api_providers.dart';
import 'core/debug/share_debug_log.dart';
import 'core/debug/share_null_product_event_log.dart';
import 'core/network/api_error.dart';
import 'core/platform/share_targets_platform.dart';
import 'core/routing/app_router.dart';
import 'core/theme/app_theme.dart';
import 'features/vendor/domain/vendor_share_prefs.dart';
import 'features/vendor/domain/vendor_share_upload.dart';
import 'features/vendor/presentation/vendor_inbound_share_args.dart';
import 'shared/models/user.dart';

class GarmentHubApp extends ConsumerStatefulWidget {
  const GarmentHubApp({super.key});

  @override
  ConsumerState<GarmentHubApp> createState() => _GarmentHubAppState();
}

class _GarmentHubAppState extends ConsumerState<GarmentHubApp> with WidgetsBindingObserver {
  final GlobalKey<ScaffoldMessengerState> _rootMessengerKey = GlobalKey<ScaffoldMessengerState>();
  StreamSubscription<List<SharedMediaFile>>? _shareSub;

  void _shareDebug(String message) => ShareDebugLog.log(message);

  static String _sharePathBasename(String filePath) {
    final normalized = filePath.replaceAll(r'\', '/');
    final i = normalized.lastIndexOf('/');
    return i < 0 ? normalized : normalized.substring(i + 1);
  }

  void _logNavigateInboundShare(String reasonCode, String detail) {
    ShareDebugLog.log('NAV /vendor/inbound-share reason=$reasonCode $detail');
  }

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

    final initial = await ReceiveSharingIntent.instance.getInitialMedia();
    if (!hadIosHandoff) {
      await _handleShareFiles(initial);
    }
    _shareSub = ReceiveSharingIntent.instance.getMediaStream().listen(_handleShareFiles);
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
    _shareDebug(
      '_goInbound pathsCount=${paths.length} productId=${productId ?? "(null)"} '
      'productName=${productName ?? "(null)"} authenticated=${auth.isAuthenticated} role=${auth.user?.role}',
    );
    if (auth.isAuthenticated && auth.user?.role == UserRole.vendor) {
      await VendorSharePrefs.clearPendingSharePaths();
      if (!mounted) return;
      final pid = productId?.trim();
      if (pid != null && pid.isNotEmpty && paths.isNotEmpty) {
        try {
          await ref.read(productApiProvider).getById(pid);
          _shareDebug('_goInbound getById SUCCESS pid=$pid');
        } catch (e) {
          _shareDebug('_goInbound getById FAILED pid=$pid error=$e');
          if (!mounted) return;
          _rootMessengerKey.currentState?.showSnackBar(
            const SnackBar(content: Text("Couldn't open that listing")),
          );
          _logNavigateInboundShare('C', 'getById failed pid=$pid');
          ref.read(goRouterProvider).go(
                '/vendor/inbound-share',
                extra: VendorInboundShareArgs(paths),
              );
          return;
        }
        if (!mounted) return;
        final name = await _resolveShareProductName(pid, productName);
        final uploaded = await _runDirectShareUploadBeforeNavigate(
          paths: paths,
          productId: pid,
          productName: name,
        );
        if (!mounted) return;
        if (uploaded) {
          _shareDebug('_goInbound → /vendor/products/$pid/edit (upload ok)');
          ref.read(goRouterProvider).go('/vendor/products/$pid/edit');
        } else {
          _logNavigateInboundShare('E', 'upload false or exception after getById pid=$pid');
          ref.read(goRouterProvider).go(
                '/vendor/inbound-share',
                extra: VendorInboundShareArgs(
                  paths,
                  preselectedProductId: pid,
                  preselectedProductName: name,
                ),
              );
        }
        return;
      }
      _logNavigateInboundShare(
        'D',
        'no direct-share route pidEmpty=${pid == null || pid.isEmpty} pathsEmpty=${paths.isEmpty}',
      );
      ref.read(goRouterProvider).go(
            '/vendor/inbound-share',
            extra: VendorInboundShareArgs(
              paths,
              preselectedProductId: productId,
              preselectedProductName: productName,
            ),
          );
    } else {
      _shareDebug(
        'A: not authenticated or not vendor — savePendingSharePathsWithProduct only (no inbound nav)',
      );
      await VendorSharePrefs.savePendingSharePathsWithProduct(
        paths,
        productId: productId,
        productName: productName,
      );
    }
  }

  Future<String> _resolveShareProductName(String productId, String? productName) async {
    final trimmed = productName?.trim();
    if (trimmed != null && trimmed.isNotEmpty) return trimmed;
    final ordered = await VendorSharePrefs.getOrderedShareTargetsForSync();
    for (final e in ordered) {
      if (e.id == productId) return e.name;
    }
    return 'Listing';
  }

  /// Uploads shared images before opening product edit so [ProductFormScreen] `_load` sees new URLs.
  /// Returns `true` on success; on failure shows SnackBars and caller should open inbound share.
  Future<bool> _runDirectShareUploadBeforeNavigate({
    required List<String> paths,
    required String productId,
    required String productName,
  }) async {
    final existingCount = paths.where((p) => File(p).existsSync()).length;
    _shareDebug(
      '_runDirectShareUploadBeforeNavigate incomingPaths=${paths.length} '
      'existingAfterFileExistsSync=$existingCount paths=$paths',
    );
    final messenger = _rootMessengerKey.currentState;
    messenger?.showSnackBar(const SnackBar(content: Text('Uploading photos…')));
    try {
      final ok = await uploadSharedImagesToProduct(
        ref,
        paths: paths,
        productId: productId,
        productName: productName,
      );
      _shareDebug('_runDirectShareUploadBeforeNavigate uploadSharedImagesToProduct ok=$ok');
      if (!mounted) return false;
      messenger?.clearSnackBars();
      if (!ok) {
        messenger?.showSnackBar(const SnackBar(content: Text('No valid image files')));
        return false;
      }
      messenger?.showSnackBar(SnackBar(content: Text('Added to $productName')));
      return true;
    } catch (e) {
      _shareDebug('_runDirectShareUploadBeforeNavigate EXCEPTION $e');
      if (!mounted) return false;
      messenger?.clearSnackBars();
      messenger?.showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
      return false;
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

    if (Platform.isAndroid) {
      await Future<void>.delayed(const Duration(milliseconds: 100));
    }
    final ({
      String? productId,
      String? productName,
      String? resolvedSource,
      String? intentDataPreview,
    }) extra = Platform.isAndroid
        ? await ShareTargetsPlatform.peekShareProductExtra()
        : (
            productId: null,
            productName: null,
            resolvedSource: null,
            intentDataPreview: null,
          );
    ShareDebugLog.log(
      '_handleShareFiles paths=${paths.length} peek productId=${extra.productId ?? "(null)"} '
      'productName=${extra.productName ?? "(null)"} '
      'resolvedSource=${extra.resolvedSource ?? "(null)"} (Android peek only)',
    );
    if (Platform.isAndroid && paths.isNotEmpty) {
      final peekPid = extra.productId?.trim();
      if (peekPid == null || peekPid.isEmpty) {
        ShareDebugLog.log(
          'NULL_PRODUCT_ID resolvedSource=${extra.resolvedSource ?? "(null)"} '
          'dataPreview=${extra.intentDataPreview ?? "(null)"} paths=${paths.length}',
        );
        unawaited(
          ShareNullProductEventLog.recordNullProductIdShareEvent(
            resolvedSource: extra.resolvedSource,
            intentDataPreview: extra.intentDataPreview,
            pathCount: paths.length,
            firstPathBasename: _sharePathBasename(paths.first),
          ),
        );
        if (ShareDebugLog.overlayEnabled || kDebugMode) {
          _rootMessengerKey.currentState?.showSnackBar(
            SnackBar(
              content: Text(
                'Share: missing listing id (${extra.resolvedSource ?? "unknown"}) — see Share debug panel',
              ),
            ),
          );
        }
      }
    }
    await _goInbound(
      paths: paths,
      productId: extra.productId,
      productName: extra.productName,
    );
    if (Platform.isAndroid) {
      await ShareTargetsPlatform.consumeShareProductExtra();
    }
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
      final ctx = await VendorSharePrefs.readPendingShareContext();
      if (ctx.paths.isEmpty) return;
      _shareDebug(
        'B: post-login pending share paths=${ctx.paths.length} '
        'productId=${ctx.productId ?? "(null)"} productName=${ctx.productName ?? "(null)"} → _goInbound',
      );
      await VendorSharePrefs.clearPendingSharePaths();
      if (!mounted) return;
      await _goInbound(
        paths: ctx.paths,
        productId: ctx.productId,
        productName: ctx.productName,
      );
    });

    final router = ref.watch(goRouterProvider);
    return MaterialApp.router(
      title: 'GarmentHub',
      theme: AppTheme.light(),
      scaffoldMessengerKey: _rootMessengerKey,
      routerConfig: router,
      builder: (context, child) {
        return ShareDebugLogOverlay(child: child ?? const SizedBox.shrink());
      },
    );
  }
}
