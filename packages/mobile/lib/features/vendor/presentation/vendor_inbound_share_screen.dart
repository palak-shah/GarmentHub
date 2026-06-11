import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/network/api_error.dart';
import '../../../shared/models/user.dart';
import '../domain/vendor_share_prefs.dart';
import '../vendor_providers.dart';
import 'vendor_inbound_share_args.dart';

/// Adds images shared from another app into a vendor product.
class VendorInboundShareScreen extends ConsumerStatefulWidget {
  const VendorInboundShareScreen({super.key, required this.args});

  final VendorInboundShareArgs args;

  @override
  ConsumerState<VendorInboundShareScreen> createState() => _VendorInboundShareScreenState();
}

class _VendorInboundShareScreenState extends ConsumerState<VendorInboundShareScreen> {
  List<String> _paths = [];
  bool _loading = true;
  bool _uploading = false;
  List<({String id, String name})> _recents = [];

  @override
  void initState() {
    super.initState();
    _paths = List.from(widget.args.paths);
    unawaited(_bootstrap());
  }

  Future<void> _bootstrap() async {
    if (_paths.isEmpty) {
      final pending = await VendorSharePrefs.readPendingSharePaths();
      await VendorSharePrefs.clearPendingSharePaths();
      _paths = pending;
    }
    _recents = await VendorSharePrefs.getRecentProducts();
    if (mounted) setState(() => _loading = false);

    final preId = widget.args.preselectedProductId?.trim();
    if (preId != null && preId.isNotEmpty && _paths.isNotEmpty) {
      final name = widget.args.preselectedProductName?.trim();
      String resolved = name ?? 'Listing';
      for (final e in _recents) {
        if (e.id == preId) {
          resolved = e.name;
          break;
        }
      }
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) unawaited(_uploadToProduct(preId, resolved));
      });
    }
  }

  Future<void> _uploadToProduct(String productId, String productName) async {
    final existing = _paths.where((p) => File(p).existsSync()).toList();
    if (existing.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No valid image files')));
      }
      return;
    }
    setState(() => _uploading = true);
    try {
      await ref.read(uploadApiProvider).postProductImages(existing, productId: productId);
      await VendorSharePrefs.recordProductUsage(id: productId, name: productName);
      ref.invalidate(vendorProductsProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Added to $productName')));
        context.go('/vendor/products/$productId/edit');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessageVerbose(e))));
      }
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _cancel() async {
    await VendorSharePrefs.clearPendingSharePaths();
    if (mounted) context.go('/vendor');
  }

  @override
  Widget build(BuildContext context) {
    final role = ref.watch(authSessionProvider.select((a) => a.user?.role));
    if (role != UserRole.vendor) {
      return Scaffold(
        appBar: AppBar(title: const Text('Add to catalog')),
        body: const Padding(
          padding: EdgeInsets.all(24),
          child: Text('Sign in as a vendor to add photos from other apps.'),
        ),
      );
    }

    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (_paths.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('Add to catalog')),
        body: const Center(child: Text('No images to add.')),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Add to catalog'),
        leading: IconButton(icon: const Icon(Icons.close), onPressed: _uploading ? null : _cancel),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('${_paths.length} image(s)'),
          const SizedBox(height: 12),
          for (final e in _recents)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: FilledButton.tonal(
                onPressed: _uploading ? null : () => _uploadToProduct(e.id, e.name),
                child: Text('Add to ${e.name}', maxLines: 2, overflow: TextOverflow.ellipsis),
              ),
            ),
          OutlinedButton(
            onPressed: _uploading ? null : () => context.go('/vendor/upload'),
            child: const Text('Browse / enter product ID'),
          ),
        ],
      ),
    );
  }
}
