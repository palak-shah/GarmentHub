import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/api/api_providers.dart';
import '../../../core/config/environment.dart';
import '../../../core/network/api_error.dart';
import '../../../shared/models/user.dart';
import '../../../shared/widgets/gh_empty_state.dart';
import '../../curation/domain/trader_share_line.dart';

/// Passed via [GoRoute.extra] so the trader gallery lists only images that were included in shares.
class TraderGallerySharedImagesExtra {
  const TraderGallerySharedImagesExtra({
    required this.imageIdsInShareOrder,
    this.sharedWithLabel,
  });

  final List<String> imageIdsInShareOrder;
  final String? sharedWithLabel;
}

Map<String, dynamic>? _coerceJsonMap(dynamic e) {
  if (e is! Map) return null;
  return Map<String, dynamic>.from(e);
}

class _GalleryImage {
  _GalleryImage({required this.id, required this.url, this.createdAt});

  final String id;
  final String url;
  final String? createdAt;

  static _GalleryImage? tryParse(Map<String, dynamic> m) {
    final id = m['id']?.toString() ?? '';
    final url = m['url']?.toString() ?? '';
    if (id.isEmpty || url.isEmpty) return null;
    final createdAt = m['createdAt']?.toString() ?? m['created_at']?.toString();
    return _GalleryImage(id: id, url: url, createdAt: createdAt);
  }
}

List<_GalleryImage> _sortedImagesFromPayload(Map<String, dynamic> data) {
  final raw = (data['imageAssets'] ?? data['image_assets']) as List? ?? [];
  final list = <_GalleryImage>[];
  for (final e in raw) {
    final m = _coerceJsonMap(e);
    if (m == null) continue;
    final img = _GalleryImage.tryParse(m);
    if (img != null) list.add(img);
  }
  list.sort((a, b) {
    final da = DateTime.tryParse(a.createdAt ?? '') ?? DateTime.fromMillisecondsSinceEpoch(0);
    final db = DateTime.tryParse(b.createdAt ?? '') ?? DateTime.fromMillisecondsSinceEpoch(0);
    return db.compareTo(da);
  });
  return list;
}

bool _hasGalleryImages(Map<String, dynamic> data) => _sortedImagesFromPayload(data).isNotEmpty;

final _galleryFamily = FutureProvider.family<Map<String, dynamic>, String>((ref, id) async {
  final api = ref.read(productApiProvider);
  var map = await api.getTraderGallery(id);
  if (!_hasGalleryImages(map)) {
    try {
      final full = await api.getById(id);
      if (_hasGalleryImages(full)) {
        map = Map<String, dynamic>.from(map);
        map['imageAssets'] = full['imageAssets'] ?? full['image_assets'];
      }
    } catch (_) {
      // Keep minimal gallery payload; UI shows empty state.
    }
  }
  return map;
});

class TraderGalleryScreen extends ConsumerStatefulWidget {
  const TraderGalleryScreen({
    super.key,
    required this.productId,
    this.restrictToSharedImageIds,
    this.sharedContextRecipientSummary,
  });

  final String productId;

  /// When non-null and non-empty, only these asset ids are shown (Shared tab).
  final List<String>? restrictToSharedImageIds;

  /// Shown under product metadata when opened from Shared (e.g. “Amit · Kiran +2”).
  final String? sharedContextRecipientSummary;

  @override
  ConsumerState<TraderGalleryScreen> createState() => _TraderGalleryScreenState();
}

class _TraderGalleryScreenState extends ConsumerState<TraderGalleryScreen> {
  final Set<String> _selected = {};

  bool get _sharedOnlyMode =>
      widget.restrictToSharedImageIds != null && widget.restrictToSharedImageIds!.isNotEmpty;

  String get _appBarTitle => _sharedOnlyMode ? 'Shared photos' : 'Photos';

  List<_GalleryImage> _sortedImages(Map<String, dynamic> data) => _sortedImagesFromPayload(data);

  String? _albumDateLabel(List<_GalleryImage> images) {
    if (images.isEmpty) return null;
    final dt = DateTime.tryParse(images.first.createdAt ?? '');
    if (dt == null) return null;
    return DateFormat.yMMMd().format(dt.toLocal());
  }

  String _imageDateLabel(String? createdAt) {
    if (createdAt == null || createdAt.isEmpty) return '—';
    final dt = DateTime.tryParse(createdAt);
    if (dt == null) return createdAt;
    return DateFormat.yMMMd().add_jm().format(dt.toLocal());
  }

  void _toggle(String imageId) {
    setState(() {
      if (_selected.contains(imageId)) {
        _selected.remove(imageId);
      } else {
        _selected.add(imageId);
      }
    });
  }

  void _selectAll(List<_GalleryImage> images) {
    setState(() {
      if (_selected.length == images.length) {
        _selected.clear();
      } else {
        _selected
          ..clear()
          ..addAll(images.map((e) => e.id));
      }
    });
  }

  void _shareSelected() {
    if (_selected.isEmpty) return;
    final data = ref.read(_galleryFamily(widget.productId)).valueOrNull;
    if (data == null) return;
    final images = _sortedImages(data);
    final orderedIds = images.where((img) => _selected.contains(img.id)).map((img) => img.id).toList();
    final pid = widget.productId;
    final lines = orderedIds.map((imageId) => TraderShareLine(productId: pid, productImageId: imageId).toApi()).toList();
    context.push('/trader/share', extra: lines);
  }

  @override
  Widget build(BuildContext context) {
    final role = ref.watch(authSessionProvider.select((a) => a.user?.role));
    final isTrader = role == UserRole.trader;
    if (!isTrader) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) context.go('/products/${widget.productId}');
      });
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final scheme = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    final async = ref.watch(_galleryFamily(widget.productId));

    return async.when(
      loading: () => Scaffold(
        appBar: AppBar(
          leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.pop()),
          title: Text(_appBarTitle),
        ),
        body: const Center(child: CircularProgressIndicator()),
      ),
      error: (e, _) => Scaffold(
        appBar: AppBar(
          leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.pop()),
          title: Text(_appBarTitle),
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(apiErrorMessage(e), textAlign: TextAlign.center),
                const SizedBox(height: 16),
                FilledButton(onPressed: () => ref.invalidate(_galleryFamily(widget.productId)), child: const Text('Retry')),
              ],
            ),
          ),
        ),
      ),
      data: (data) {
        final name = data['name'] as String? ?? '';
        final vendor = _coerceJsonMap(data['vendor']);
        final vendorLine = vendor == null
            ? ''
            : ((vendor['businessName']?.toString().trim().isNotEmpty ?? false)
                ? vendor['businessName'].toString()
                : vendor['name']?.toString() ?? '');
        var images = _sortedImages(data);
        final restrict = widget.restrictToSharedImageIds;
        if (restrict != null && restrict.isNotEmpty) {
          final byId = <String, _GalleryImage>{};
          for (final im in images) {
            byId[im.id] = im;
          }
          images = <_GalleryImage>[
            for (final rawId in restrict)
              if (byId.containsKey(rawId.toString())) byId[rawId.toString()]!,
          ];
        }
        final albumDate = _albumDateLabel(images);

        return Scaffold(
          appBar: AppBar(
            leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.pop()),
            title: Text(_appBarTitle),
            actions: [
              if (images.length > 1)
                TextButton(
                  onPressed: () => _selectAll(images),
                  child: Text(_selected.length == images.length ? 'Clear' : 'Select all'),
                ),
            ],
          ),
          body: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name, style: text.titleLarge?.copyWith(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 6),
                    Wrap(
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: 6,
                      children: [
                        if (albumDate != null) Text(albumDate, style: text.bodySmall?.copyWith(color: scheme.onSurfaceVariant)),
                        if (albumDate != null && vendorLine.isNotEmpty) Text('·', style: text.bodySmall?.copyWith(color: scheme.outline)),
                        if (vendorLine.isNotEmpty)
                          Text.rich(
                            TextSpan(
                              style: text.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
                              children: [
                                const TextSpan(text: 'From '),
                                TextSpan(text: vendorLine, style: text.bodySmall?.copyWith(fontWeight: FontWeight.w600, color: scheme.onSurface)),
                              ],
                            ),
                          ),
                      ],
                    ),
                    if (widget.sharedContextRecipientSummary != null &&
                        widget.sharedContextRecipientSummary!.trim().isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Text.rich(
                          TextSpan(
                            style: text.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
                            children: [
                              const TextSpan(text: 'Shared with '),
                              TextSpan(
                                text: widget.sharedContextRecipientSummary!.trim(),
                                style: text.bodySmall?.copyWith(fontWeight: FontWeight.w600, color: scheme.onSurface),
                              ),
                            ],
                          ),
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    if (images.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Text(
                          '${images.length} photo${images.length == 1 ? '' : 's'}',
                          style: text.labelSmall?.copyWith(color: scheme.onSurfaceVariant),
                        ),
                      ),
                  ],
                ),
              ),
              Expanded(
                child: images.isEmpty
                    ? GhEmptyState(
                        icon: Icons.photo_library_outlined,
                        title: (widget.restrictToSharedImageIds != null &&
                                widget.restrictToSharedImageIds!.isNotEmpty)
                            ? 'No shared photos'
                            : 'No photos yet',
                        subtitle: (widget.restrictToSharedImageIds != null &&
                                widget.restrictToSharedImageIds!.isNotEmpty)
                            ? 'This product has no matching shared images in your catalog.'
                            : 'Vendor uploads will appear here.',
                      )
                    : GridView.builder(
                        padding: const EdgeInsets.fromLTRB(12, 0, 12, 100),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 3,
                          mainAxisSpacing: 6,
                          crossAxisSpacing: 6,
                          childAspectRatio: 1,
                        ),
                        itemCount: images.length,
                        itemBuilder: (context, i) {
                          final img = images[i];
                          final on = _selected.contains(img.id);
                          final resolved = Environment.resolveMediaUrl(img.url);
                          return Material(
                            color: scheme.surfaceContainerLow,
                            borderRadius: BorderRadius.circular(12),
                            clipBehavior: Clip.antiAlias,
                            child: InkWell(
                              onTap: () => _toggle(img.id),
                              child: Stack(
                                fit: StackFit.expand,
                                children: [
                                  if (resolved.isEmpty)
                                    ColoredBox(
                                      color: scheme.surfaceContainerHighest,
                                      child: Icon(Icons.broken_image_outlined, color: scheme.onSurfaceVariant),
                                    )
                                  else
                                    Image.network(
                                      resolved,
                                      fit: BoxFit.cover,
                                      loadingBuilder: (context, child, progress) {
                                        if (progress == null) return child;
                                        return ColoredBox(
                                          color: scheme.surfaceContainerHighest,
                                          child: Center(
                                            child: SizedBox(
                                              width: 28,
                                              height: 28,
                                              child: CircularProgressIndicator(
                                                strokeWidth: 2,
                                                value: progress.expectedTotalBytes != null
                                                    ? progress.cumulativeBytesLoaded / progress.expectedTotalBytes!
                                                    : null,
                                              ),
                                            ),
                                          ),
                                        );
                                      },
                                      errorBuilder: (context, error, stackTrace) => ColoredBox(
                                        color: scheme.surfaceContainerHighest,
                                        child: Icon(Icons.broken_image_outlined, color: scheme.onSurfaceVariant),
                                      ),
                                    ),
                                  Positioned(
                                    right: 6,
                                    top: 6,
                                    child: DecoratedBox(
                                      decoration: BoxDecoration(
                                        shape: BoxShape.circle,
                                        color: on ? scheme.primary : Colors.black38,
                                        border: Border.all(color: Colors.white70, width: 2),
                                      ),
                                      child: Padding(
                                        padding: const EdgeInsets.all(4),
                                        child: on ? Icon(Icons.check, size: 16, color: scheme.onPrimary) : const SizedBox(width: 16, height: 16),
                                      ),
                                    ),
                                  ),
                                  Positioned(
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    child: DecoratedBox(
                                      decoration: BoxDecoration(
                                        gradient: LinearGradient(
                                          begin: Alignment.bottomCenter,
                                          end: Alignment.topCenter,
                                          colors: [Colors.black.withValues(alpha: 0.55), Colors.transparent],
                                        ),
                                      ),
                                      child: Padding(
                                        padding: const EdgeInsets.fromLTRB(4, 16, 4, 4),
                                        child: Text(
                                          _imageDateLabel(img.createdAt),
                                          textAlign: TextAlign.center,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: text.labelSmall?.copyWith(color: Colors.white, fontWeight: FontWeight.w500),
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
              ),
            ],
          ),
          bottomNavigationBar: images.isEmpty
              ? null
              : SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                    child: FilledButton(
                      onPressed: _selected.isEmpty ? null : _shareSelected,
                      style: FilledButton.styleFrom(
                        minimumSize: const Size.fromHeight(52),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      child: Text(
                        _selected.isEmpty
                            ? 'Select photos to share'
                            : 'Share ${_selected.length} photo${_selected.length == 1 ? '' : 's'}',
                      ),
                    ),
                  ),
                ),
        );
      },
    );
  }
}
