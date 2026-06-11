import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/config/environment.dart';
import '../../../core/network/api_error.dart';
import '../../../features/home/presentation/home_providers.dart';
import '../../../shared/models/product.dart';
import '../../../shared/models/user.dart';

final _productDetailFamily = FutureProvider.family<Product, String>((ref, id) async {
  final map = await ref.read(productApiProvider).getById(id);
  return Product.fromJson(map);
});

class ProductDetailScreen extends ConsumerStatefulWidget {
  const ProductDetailScreen({super.key, required this.productId});

  final String productId;

  @override
  ConsumerState<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends ConsumerState<ProductDetailScreen> {
  bool _markedSeen = false;
  bool _skipBusy = false;
  bool _saveBusy = false;

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authSessionProvider);
    final user = auth.user;
    final isTrader = user?.role == UserRole.trader;
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final async = ref.watch(_productDetailFamily(widget.productId));

    ref.listen<AsyncValue<Product>>(_productDetailFamily(widget.productId), (prev, next) {
      next.whenData((_) {
        if (!_markedSeen) {
          _markedSeen = true;
          unawaited(ref.read(workflowApiProvider).markState(widget.productId, 'SEEN').catchError((_) {}));
        }
      });
    });

    return Scaffold(
      appBar: AppBar(
        title: const Text('Product'),
        actions: [
          if (isTrader)
            IconButton(
              tooltip: 'All photos · share',
              icon: const Icon(Icons.photo_library_outlined),
              onPressed: () => context.push('/products/${widget.productId}/gallery'),
            ),
        ],
      ),
      bottomNavigationBar: isTrader
          ? _TraderBottomBar(
              scheme: scheme,
              text: text,
              skipBusy: _skipBusy,
              saveBusy: _saveBusy,
              onSkip: _onSkip,
              onSave: _onSave,
              onShareWithBuyers: () => context.push('/products/${widget.productId}/gallery'),
              onSendExternal: () {
                final p = ref.read(_productDetailFamily(widget.productId)).valueOrNull;
                if (p != null) _copyShareBlurb(context, p);
              },
            )
          : null,
      body: async.when(
        data: (p) => ListView(
          padding: EdgeInsets.fromLTRB(16, 12, 16, isTrader ? 100 : 24),
          children: [
            _ProductHeroCarousel(
              key: ValueKey(p.id),
              urls: p.carouselMediaUrls.map(Environment.resolveMediaUrl).toList(),
              isTrader: isTrader,
              productId: widget.productId,
            ),
            if (p.carouselMediaUrls.isNotEmpty) const SizedBox(height: 16),
            Text(p.name, style: text.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 12),
            Card(
              elevation: 0,
              color: scheme.surfaceContainerLow,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Details', style: text.titleSmall?.copyWith(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        if (p.brandName != null && p.brandName!.isNotEmpty)
                          Chip(
                            label: Text('Brand · ${p.brandName}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                            backgroundColor: scheme.secondaryContainer,
                            side: BorderSide.none,
                          ),
                        if (p.vendorName != null && p.vendorName!.isNotEmpty)
                          Chip(
                            label: Text('Vendor · ${p.vendorName}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                            backgroundColor: scheme.tertiaryContainer,
                            side: BorderSide.none,
                          ),
                        if (p.categoryName != null && p.categoryName!.isNotEmpty)
                          Chip(
                            label: Text('Category · ${p.categoryName}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                            backgroundColor: scheme.surfaceContainerHighest,
                            side: BorderSide.none,
                          ),
                        if (p.price != null)
                          Chip(
                            label: Text('From ${p.price}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                            backgroundColor: scheme.primaryContainer,
                            side: BorderSide.none,
                          ),
                        if (p.moq != null)
                          Chip(
                            label: Text('MOQ ${p.moq}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                            backgroundColor: scheme.surfaceContainerHighest,
                            side: BorderSide.none,
                          ),
                      ],
                    ),
                    ..._specLines(p.raw, text, scheme),
                  ],
                ),
              ),
            ),
            if (!isTrader) ...[
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: FilledButton(
                      style: FilledButton.styleFrom(
                        minimumSize: const Size.fromHeight(48),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      onPressed: () async {
                        try {
                          await ref.read(productApiProvider).saveProduct(widget.productId);
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Saved')));
                          }
                        } catch (e) {
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
                          }
                        }
                      },
                      child: const Text('Save'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size.fromHeight(48),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      onPressed: () async {
                        try {
                          await ref.read(productApiProvider).unsaveProduct(widget.productId);
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Removed from saved')));
                          }
                        } catch (e) {
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
                          }
                        }
                      },
                      child: const Text('Unsave'),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(apiErrorMessage(e), textAlign: TextAlign.center),
          ),
        ),
      ),
    );
  }

  Future<void> _onSkip() async {
    setState(() => _skipBusy = true);
    try {
      await ref.read(workflowApiProvider).markBulk([widget.productId], 'SKIPPED');
      ref.invalidate(traderNewFeedProvider);
      ref.invalidate(traderWorkflowFeedProvider);
      ref.invalidate(traderWorkflowCountsProvider);
      ref.invalidate(traderAlertsProvider);
      ref.invalidate(traderSentSharesProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Skipped')));
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => _skipBusy = false);
    }
  }

  Future<void> _onSave() async {
    setState(() => _saveBusy = true);
    try {
      await ref.read(productApiProvider).saveProduct(widget.productId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Saved')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => _saveBusy = false);
    }
  }

  void _copyShareBlurb(BuildContext context, Product p) {
    final price = p.price != null ? ' — ${p.price}' : '';
    final line = '${p.name}$price on GarmentHub';
    unawaited(Clipboard.setData(ClipboardData(text: line)));
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Copied to clipboard')));
  }

  static List<Widget> _specLines(Map<String, dynamic> raw, TextTheme text, ColorScheme scheme) {
    final keys = ['pattern', 'fabric', 'color', 'status'];
    final out = <Widget>[];
    var any = false;
    for (final k in keys) {
      final v = raw[k]?.toString();
      if (v == null || v.isEmpty) continue;
      any = true;
      out.add(
        Padding(
          padding: const EdgeInsets.only(top: 10),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                width: 88,
                child: Text(
                  '${k[0].toUpperCase()}${k.substring(1)}',
                  style: text.labelSmall?.copyWith(color: scheme.onSurfaceVariant, fontWeight: FontWeight.w600),
                ),
              ),
              Expanded(child: Text(v, style: text.bodyMedium)),
            ],
          ),
        ),
      );
    }
    if (!any) return <Widget>[];
    return [const SizedBox(height: 8), ...out];
  }
}

class _ProductHeroCarousel extends StatefulWidget {
  const _ProductHeroCarousel({
    super.key,
    required this.urls,
    required this.isTrader,
    required this.productId,
  });

  final List<String> urls;
  final bool isTrader;
  final String productId;

  @override
  State<_ProductHeroCarousel> createState() => _ProductHeroCarouselState();
}

class _ProductHeroCarouselState extends State<_ProductHeroCarousel> {
  late final PageController _controller;
  int _index = 0;

  @override
  void initState() {
    super.initState();
    _controller = PageController();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final n = widget.urls.length;

    if (n == 0) {
      return Card(
        elevation: 0,
        color: scheme.surfaceContainerLow,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: SizedBox(
          height: 200,
          child: Center(
            child: Text('No photos', style: text.bodyMedium?.copyWith(color: scheme.onSurfaceVariant)),
          ),
        ),
      );
    }

    return Card(
      elevation: 0,
      color: scheme.surfaceContainerLow,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            height: 240,
            child: Stack(
              fit: StackFit.expand,
              children: [
                PageView.builder(
                  controller: _controller,
                  itemCount: n,
                  onPageChanged: (i) => setState(() => _index = i),
                  itemBuilder: (context, i) {
                    final u = widget.urls[i];
                    if (u.isEmpty) {
                      return Center(child: Icon(Icons.broken_image_outlined, color: scheme.onSurfaceVariant));
                    }
                    return Image.network(
                      u,
                      fit: BoxFit.contain,
                      loadingBuilder: (context, child, progress) {
                        if (progress == null) return child;
                        return Center(
                          child: SizedBox(
                            width: 32,
                            height: 32,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              value: progress.expectedTotalBytes != null
                                  ? progress.cumulativeBytesLoaded / progress.expectedTotalBytes!
                                  : null,
                            ),
                          ),
                        );
                      },
                      errorBuilder: (context, error, stackTrace) => Center(
                        child: Icon(Icons.broken_image_outlined, color: scheme.onSurfaceVariant, size: 40),
                      ),
                    );
                  },
                ),
                if (n > 1)
                  Positioned(
                    bottom: 8,
                    left: 0,
                    right: 0,
                    child: Center(
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.55),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          child: Text(
                            '${_index + 1} / $n',
                            style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                          ),
                        ),
                      ),
                    ),
                  ),
                if (n > 1 && n <= 10)
                  Positioned(
                    bottom: 8,
                    right: 8,
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        for (var j = 0; j < n; j++)
                          Padding(
                            padding: const EdgeInsets.only(left: 3),
                            child: Container(
                              width: 6,
                              height: 6,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: j == _index ? Colors.white : Colors.white38,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
            child: Row(
              children: [
                Icon(Icons.photo_library_outlined, size: 18, color: scheme.onSurfaceVariant),
                const SizedBox(width: 6),
                Text(
                  n == 1 ? '1 photo' : '$n photos',
                  style: text.labelLarge?.copyWith(fontWeight: FontWeight.w600, color: scheme.onSurface),
                ),
                const Spacer(),
                if (widget.isTrader)
                  TextButton.icon(
                    onPressed: () => context.push('/products/${widget.productId}/gallery'),
                    icon: const Icon(Icons.grid_on_outlined, size: 18),
                    label: const Text('Pick & share'),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TraderBottomBar extends StatelessWidget {
  const _TraderBottomBar({
    required this.scheme,
    required this.text,
    required this.skipBusy,
    required this.saveBusy,
    required this.onSkip,
    required this.onSave,
    required this.onShareWithBuyers,
    required this.onSendExternal,
  });

  final ColorScheme scheme;
  final TextTheme text;
  final bool skipBusy;
  final bool saveBusy;
  final VoidCallback onSkip;
  final VoidCallback onSave;
  final VoidCallback onShareWithBuyers;
  final VoidCallback onSendExternal;

  @override
  Widget build(BuildContext context) {
    return Material(
      elevation: 8,
      color: scheme.surface,
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(8, 8, 8, 12),
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: skipBusy ? null : onSkip,
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: skipBusy
                      ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2))
                      : Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.visibility_off_outlined, size: 18, color: scheme.onSurface),
                            const SizedBox(height: 2),
                            Text('Skip', style: text.labelSmall?.copyWith(fontWeight: FontWeight.w600)),
                          ],
                        ),
                ),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: OutlinedButton(
                  onPressed: saveBusy ? null : onSave,
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: saveBusy
                      ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2))
                      : Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.bookmark_outline, size: 18, color: scheme.onSurface),
                            const SizedBox(height: 2),
                            Text('Save', style: text.labelSmall?.copyWith(fontWeight: FontWeight.w600)),
                          ],
                        ),
                ),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: FilledButton.tonal(
                  onPressed: onShareWithBuyers,
                  style: FilledButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    backgroundColor: scheme.primaryContainer.withValues(alpha: 0.65),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.group_outlined, size: 18, color: scheme.onPrimaryContainer),
                      const SizedBox(height: 2),
                      Text('Share', style: text.labelSmall?.copyWith(fontWeight: FontWeight.w700, color: scheme.onPrimaryContainer)),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: OutlinedButton(
                  onPressed: onSendExternal,
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.send_outlined, size: 18, color: scheme.onSurface),
                      const SizedBox(height: 2),
                      Text('Send', style: text.labelSmall?.copyWith(fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
