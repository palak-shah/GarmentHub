import 'package:flutter/material.dart';

import '../models/product.dart';

/// Two-column product card (home feed + saved grid).
class GhProductGridTile extends StatelessWidget {
  const GhProductGridTile({
    super.key,
    required this.product,
    this.sharedBy,
    /// Trader Shared tab: recipients summary (PWA `ProductCard` “To · …”).
    this.sharedWithLabel,
    this.subtitle,
    /// When set, used instead of [Product.primaryImageUrl] (e.g. Shared tab shows only the shared shot).
    this.coverImageUrlOverride,
    /// Shown in center overlay when > 1 (e.g. curated “N shared photos”).
    this.photoCount,
    /// Top-right badge: total catalog photos (PWA-style count on the card).
    this.cornerPhotoCount,
    this.centerHint = 'Tap to pick & order',
    this.showCenterPrompt = true,
    required this.onTap,
  });

  final Product product;
  final String? sharedBy;
  final String? sharedWithLabel;
  final String? subtitle;
  final String? coverImageUrlOverride;
  final int? photoCount;
  final int? cornerPhotoCount;
  final String centerHint;
  final bool showCenterPrompt;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final img = (coverImageUrlOverride != null && coverImageUrlOverride!.trim().isNotEmpty)
        ? coverImageUrlOverride!.trim()
        : product.primaryImageUrl;
    final price = product.price;
    final cat = product.categoryName;
    final sub = subtitle ?? (cat != null && cat.isNotEmpty ? '${product.name} · $cat' : product.name);
    final corner = cornerPhotoCount;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: AspectRatio(
            aspectRatio: 3 / 4,
            child: Stack(
              fit: StackFit.expand,
              children: [
                if (img.isEmpty)
                  ColoredBox(
                    color: scheme.surfaceContainerHighest,
                    child: Icon(Icons.image_not_supported_outlined, size: 40, color: scheme.onSurfaceVariant),
                  )
                else
                  Image.network(img, fit: BoxFit.cover),
                if (corner != null && corner > 0)
                  Positioned(
                    top: 6,
                    right: 6,
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.65),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.photo_library_outlined, size: 14, color: Colors.white),
                            const SizedBox(width: 4),
                            Text(
                              '$corner',
                              style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                if ((sharedWithLabel != null && sharedWithLabel!.isNotEmpty) ||
                    (sharedBy != null && sharedBy!.isNotEmpty))
                  Positioned(
                    top: 6,
                    left: 6,
                    right: 6,
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.55),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        child: sharedWithLabel != null && sharedWithLabel!.isNotEmpty
                            ? Text.rich(
                                TextSpan(
                                  style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w600),
                                  children: [
                                    TextSpan(
                                      text: 'To · ',
                                      style: TextStyle(color: Colors.white.withValues(alpha: 0.7)),
                                    ),
                                    TextSpan(
                                      text: sharedWithLabel!,
                                      style: const TextStyle(color: Colors.white),
                                    ),
                                  ],
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              )
                            : Text(
                                sharedBy!,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w600),
                              ),
                      ),
                    ),
                  ),
                Center(
                  child: showCenterPrompt
                      ? Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 6),
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              color: Colors.black.withValues(alpha: 0.5),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  if (photoCount != null && photoCount! > 1)
                                    Text(
                                      '$photoCount shared photos',
                                      textAlign: TextAlign.center,
                                      style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
                                    ),
                                  Text(
                                    centerHint,
                                    textAlign: TextAlign.center,
                                    style: const TextStyle(color: Colors.white70, fontSize: 10),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        )
                      : const SizedBox.shrink(),
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
                        colors: [Colors.black.withValues(alpha: 0.75), Colors.transparent],
                      ),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(8, 16, 8, 8),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (price != null)
                            Text(
                              '₹${_fmtPrice(price)}',
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                            ),
                          Text(
                            sub,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: Colors.white70, fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  static String _fmtPrice(double p) {
    if (p == p.roundToDouble()) return p.round().toString();
    return p.toStringAsFixed(0);
  }
}
