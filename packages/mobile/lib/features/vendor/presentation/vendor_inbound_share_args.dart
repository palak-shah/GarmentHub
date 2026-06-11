/// Extra for [`/vendor/inbound-share`](../../core/routing/app_router.dart) when opening from Android share.
class VendorInboundShareArgs {
  VendorInboundShareArgs(
    this.paths, {
    this.preselectedProductId,
    this.preselectedProductName,
  });

  final List<String> paths;
  final String? preselectedProductId;
  final String? preselectedProductName;
}
