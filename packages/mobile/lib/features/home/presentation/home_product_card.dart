import 'package:flutter/material.dart';

import '../../../shared/models/product.dart';

/// Two-column card with overlays similar to PWA `ProductCard` (customer feed).
class HomeProductCard extends StatelessWidget {
  const HomeProductCard({
    super.key,
    required this.product,
    this.sharedBy,
    this.subtitle,
    this.photoCount,
    this.centerHint = 'tap to pick & order',
    required this.onTap,
  });

  final Product product;
  final String? sharedBy;
  final String? subtitle;
  final int? photoCount;
  final String centerHint;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final img = product.primaryImageUrl;
    final price = product.price;
    final cat = product.categoryName;
    final sub = subtitle ?? (cat != null && cat.isNotEmpty ? '${product.name} · $cat' : product.name);

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
                  ColoredBox(color: scheme.surfaceContainerHighest, child: const Icon(Icons.image_not_supported_outlined, size: 40))
                else
                  Image.network(img, fit: BoxFit.cover),
                if (sharedBy != null && sharedBy!.isNotEmpty)
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
                        child: Text(
                          sharedBy!,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ),
                  ),
                Center(
                  child: Padding(
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
                            if (photoCount != null && photoCount! > 0)
                              Text(
                                photoCount == 1 ? '1 shared photo' : '$photoCount shared photos',
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
