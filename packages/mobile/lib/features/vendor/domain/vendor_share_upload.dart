import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_providers.dart';
import 'vendor_share_prefs.dart';
import '../vendor_providers.dart';

/// Uploads local image paths to a product (shared-from-OS flow).
/// Returns `false` if no readable files exist; otherwise uploads and returns `true`.
/// Throws on API/network errors (caller shows [apiErrorMessage]).
Future<bool> uploadSharedImagesToProduct(
  WidgetRef ref, {
  required List<String> paths,
  required String productId,
  required String productName,
}) async {
  final existing = paths.where((p) => File(p).existsSync()).toList();
  if (existing.isEmpty) return false;
  await ref.read(uploadApiProvider).postProductImages(existing, productId: productId);
  await VendorSharePrefs.setLastProduct(id: productId, name: productName);
  ref.invalidate(vendorProductsProvider);
  return true;
}
