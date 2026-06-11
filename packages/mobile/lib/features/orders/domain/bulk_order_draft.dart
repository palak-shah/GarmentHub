/// Optional context when opening shared photos from home (PWA `ShareOrderContext`).
class ShareOrderContext {
  const ShareOrderContext({this.traderId, this.orderMode = 'DIRECT'});

  final String? traderId;
  /// `DIRECT` or `MANAGED` from curated share.
  final String orderMode;
}

/// One checkout line (PWA bulk-order draft line).
class BulkOrderLine {
  const BulkOrderLine({
    required this.productId,
    this.productImageId,
    required this.quantity,
    this.previewUrl,
  });

  final String productId;
  final String? productImageId;
  final int quantity;
  /// Resolved thumbnail for this line when coming from shared gallery.
  final String? previewUrl;
}

/// Passed via `GoRouter` extra to [BulkOrderScreen].
class BulkOrderDraft {
  const BulkOrderDraft({
    required this.lines,
    this.traderId,
    this.orderMode = 'DIRECT',
  });

  final List<BulkOrderLine> lines;
  final String? traderId;
  final String orderMode;
}
