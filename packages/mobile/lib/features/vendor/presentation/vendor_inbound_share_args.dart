/// [GoRoute.extra] for [VendorInboundShareScreen].
class VendorInboundShareArgs {
  const VendorInboundShareArgs(
    this.imagePaths, {
    this.preselectedProductId,
    this.preselectedProductName,
  });

  /// Local filesystem paths (plugin copies content URIs to cache).
  final List<String> imagePaths;

  /// From Android shortcut / iOS suggestion handoff when present.
  final String? preselectedProductId;
  final String? preselectedProductName;
}
