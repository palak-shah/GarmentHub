import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_providers.dart';
import '../../../shared/models/product.dart';

final vendorProductsProvider = FutureProvider<List<Product>>((ref) async {
  final list = await ref.read(productApiProvider).getMyProducts();
  return list.map((e) => Product.fromJson(e as Map<String, dynamic>)).toList();
});

final vendorIncomingProvider = FutureProvider<List<dynamic>>((ref) async {
  return ref.read(vendorApiProvider).getIncomingOrders();
});
