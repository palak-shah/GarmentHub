import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/debug/share_debug_log.dart';
import '../../../core/network/api_error.dart';
import '../../../shared/models/product.dart';
import '../../../shared/models/user.dart';
import '../domain/vendor_share_prefs.dart';
import '../domain/vendor_share_upload.dart';
import '../vendor_providers.dart';

/// Adds images shared from another app (e.g. WhatsApp) into the vendor catalog.
class VendorInboundShareScreen extends ConsumerStatefulWidget {
  const VendorInboundShareScreen({
    super.key,
    required this.initialPaths,
    this.preselectedProductId,
    this.preselectedProductName,
  });

  final List<String> initialPaths;

  /// From Android direct-share row or iOS suggestion handoff.
  final String? preselectedProductId;
  final String? preselectedProductName;

  @override
  ConsumerState<VendorInboundShareScreen> createState() => _VendorInboundShareScreenState();
}

class _VendorInboundShareScreenState extends ConsumerState<VendorInboundShareScreen> {
  List<String> _paths = [];
  bool _resolvingPaths = true;
  bool _uploading = false;
  List<({String id, String name})> _recentListings = [];

  @override
  void initState() {
    super.initState();
    _paths = List.from(widget.initialPaths);
    ShareDebugLog.log(
      'VendorInboundShareScreen init preselectedProductId=${widget.preselectedProductId ?? "(null)"} '
      'preselectedProductName=${widget.preselectedProductName ?? "(null)"} initialPaths=${widget.initialPaths.length}',
    );
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    if (_paths.isEmpty) {
      final fromPrefs = await VendorSharePrefs.readPendingShareContext();
      await VendorSharePrefs.clearPendingSharePaths();
      _paths = List.from(fromPrefs.paths);
    }
    _recentListings = await VendorSharePrefs.getOrderedShareTargetsForSync();
    if (mounted) setState(() => _resolvingPaths = false);
    final preId = widget.preselectedProductId?.trim();
    final willAuto = preId != null && preId.isNotEmpty && _paths.isNotEmpty;
    if (preId != null && preId.isNotEmpty) {
      ShareDebugLog.log(
        'F: inbound loaded with preselectedProductId=$preId paths=${_paths.length} willScheduleAutoUpload=$willAuto',
      );
    } else {
      ShareDebugLog.log('VendorInboundShareScreen bootstrap paths=${_paths.length} (no preselected id)');
    }
    if (willAuto) {
      WidgetsBinding.instance.addPostFrameCallback((_) async {
        if (!mounted) return;
        ShareDebugLog.log('F: auto-upload callback starting preId=$preId');
        final rawName = widget.preselectedProductName?.trim();
        final name = (rawName != null && rawName.isNotEmpty) ? rawName : 'Listing';
        await _uploadToProduct(preId, name);
      });
    }
  }

  Future<void> _uploadToProduct(String productId, String productName) async {
    setState(() => _uploading = true);
    try {
      final ok = await uploadSharedImagesToProduct(
        ref,
        paths: _paths,
        productId: productId,
        productName: productName,
      );
      if (!mounted) return;
      if (!ok) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No valid image files')));
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Added to $productName')));
      context.go('/vendor/products/$productId/edit');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _pickProduct() async {
    final listAsync = ref.read(vendorProductsProvider);
    final list = listAsync.valueOrNull;
    if (list == null || list.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Create a product first, then share photos again.')),
        );
      }
      return;
    }
    if (!mounted) return;
    final chosen = await showModalBottomSheet<Product>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) {
        return SafeArea(
          child: DraggableScrollableSheet(
            expand: false,
            initialChildSize: 0.5,
            maxChildSize: 0.9,
            minChildSize: 0.3,
            builder: (_, scroll) {
              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text('Choose product', style: Theme.of(ctx).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
                  ),
                  Expanded(
                    child: ListView.builder(
                      controller: scroll,
                      itemCount: list.length,
                      itemBuilder: (_, i) {
                        final p = list[i];
                        return ListTile(
                          leading: p.primaryImageUrl.isEmpty
                              ? const Icon(Icons.image_outlined)
                              : CircleAvatar(backgroundImage: NetworkImage(p.primaryImageUrl)),
                          title: Text(p.name, maxLines: 1, overflow: TextOverflow.ellipsis),
                          onTap: () => Navigator.pop(ctx, p),
                        );
                      },
                    ),
                  ),
                ],
              );
            },
          ),
        );
      },
    );
    if (chosen != null) await _uploadToProduct(chosen.id, chosen.name);
  }

  Future<void> _cancel() async {
    await VendorSharePrefs.clearPendingSharePaths();
    if (mounted) context.go('/vendor');
  }

  @override
  Widget build(BuildContext context) {
    final role = ref.watch(authSessionProvider.select((a) => a.user?.role));
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;

    if (role != UserRole.vendor) {
      return Scaffold(
        appBar: AppBar(title: const Text('Add to catalog')),
        body: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Adding photos from other apps is available for vendor accounts.', style: text.bodyLarge),
              const SizedBox(height: 16),
              FilledButton(onPressed: () => context.go('/'), child: const Text('Go to home')),
            ],
          ),
        ),
      );
    }

    if (_resolvingPaths) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (_paths.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('Add to catalog')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text('No images to add.', style: text.bodyLarge, textAlign: TextAlign.center),
          ),
        ),
      );
    }

    final hasRecents = _recentListings.isNotEmpty;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Add to catalog'),
        leading: IconButton(icon: const Icon(Icons.close), onPressed: _uploading ? null : _cancel),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        children: [
          Text(
            '${_paths.length} image${_paths.length == 1 ? '' : 's'}',
            style: text.titleMedium?.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 120,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: _paths.length,
              separatorBuilder: (_, _) => const SizedBox(width: 8),
              itemBuilder: (_, i) {
                final p = _paths[i];
                final ok = File(p).existsSync();
                return ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: AspectRatio(
                    aspectRatio: 1,
                    child: ok
                        ? Image.file(File(p), fit: BoxFit.cover)
                        : ColoredBox(
                            color: scheme.surfaceContainerHighest,
                            child: Icon(Icons.broken_image_outlined, color: scheme.onSurfaceVariant),
                          ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 24),
          if (hasRecents) ...[
            Text(
              'Your listings',
              style: text.titleSmall?.copyWith(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 4),
            Text(
              'Pinned listings appear first, then recent. Tap to add these photos there.',
              style: text.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
            ),
            const SizedBox(height: 12),
            ..._recentListings.asMap().entries.map(
              (entry) {
                final i = entry.key;
                final e = entry.value;
                final isLatest = i == 0;
                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: FilledButton.tonalIcon(
                    onPressed: _uploading ? null : () => _uploadToProduct(e.id, e.name),
                    icon: const Icon(Icons.inventory_2_outlined),
                    label: Text(
                      isLatest ? 'Add to ${e.name} (first in list)' : 'Add to ${e.name}',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    style: FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(52),
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: 8),
          ],
          OutlinedButton.icon(
            onPressed: _uploading ? null : _pickProduct,
            icon: const Icon(Icons.search_outlined),
            label: const Text('Browse all products'),
            style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(52)),
          ),
          const SizedBox(height: 24),
          Text(
            'GarmentHub appears in the system share sheet after you share from Photos or Files. '
            'Pin listings from My products for quick share targets; recents update when you open or upload to a product.',
            style: text.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
          ),
        ],
      ),
    );
  }
}
