/// One line in a curated share (PWA `TraderGalleryShareLine`).
class TraderShareLine {
  const TraderShareLine({required this.productId, this.productImageId});

  final String productId;
  final String? productImageId;

  Map<String, dynamic> toApi() {
    final m = <String, dynamic>{'productId': productId};
    if (productImageId != null && productImageId!.trim().isNotEmpty) {
      m['productImageId'] = productImageId!.trim();
    }
    return m;
  }

  static TraderShareLine? tryParse(dynamic e) {
    if (e is! Map) return null;
    final pid = e['productId']?.toString() ?? '';
    if (pid.isEmpty) return null;
    final img = e['productImageId']?.toString();
    return TraderShareLine(productId: pid, productImageId: (img != null && img.isNotEmpty) ? img : null);
  }
}
