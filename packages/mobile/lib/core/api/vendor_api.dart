import 'package:dio/dio.dart';

import '../network/api_response.dart';

class VendorApi {
  VendorApi(this._dio);
  final Dio _dio;

  Future<List<dynamic>> getIncomingOrders() async {
    final res = await _dio.get<Map<String, dynamic>>('/vendor/orders');
    return ApiResponse.unwrapData(res.data!, (d) => d as List<dynamic>);
  }

  Future<Map<String, dynamic>> respondToItem(String itemId, Map<String, dynamic> data) async {
    final res = await _dio.put<Map<String, dynamic>>('/vendor/orders/items/$itemId/respond', data: data);
    return ApiResponse.unwrapData(res.data!, (d) => d as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> bulkRespond(List<Map<String, dynamic>> responses) async {
    final res = await _dio.post<Map<String, dynamic>>(
      '/vendor/orders/items/bulk-respond',
      data: {'responses': responses},
    );
    return ApiResponse.unwrapData(res.data!, (d) => d as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> respondToTraderPrice(String itemId, Map<String, dynamic> data) async {
    final res = await _dio.put<Map<String, dynamic>>(
      '/vendor/orders/items/$itemId/price-counter',
      data: data,
    );
    return ApiResponse.unwrapData(res.data!, (d) => d as Map<String, dynamic>);
  }

  Future<List<dynamic>> getCatalogCategories() async {
    final res = await _dio.get<Map<String, dynamic>>('/vendor/categories');
    return ApiResponse.unwrapData(res.data!, (d) => d as List<dynamic>);
  }

  Future<Map<String, dynamic>> createVendorAttribute(
    String categoryId,
    Map<String, dynamic> body,
  ) async {
    final res = await _dio.post<Map<String, dynamic>>(
      '/vendor/categories/$categoryId/attributes',
      data: body,
    );
    return ApiResponse.unwrapData(res.data!, (d) => d as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> updateVendorAttribute(
    String categoryId,
    String attributeId,
    Map<String, dynamic> data,
  ) async {
    final res = await _dio.put<Map<String, dynamic>>(
      '/vendor/categories/$categoryId/attributes/$attributeId',
      data: data,
    );
    return ApiResponse.unwrapData(res.data!, (d) => d as Map<String, dynamic>);
  }

  Future<void> deleteVendorAttribute(String categoryId, String attributeId) async {
    await _dio.delete<Map<String, dynamic>>('/vendor/categories/$categoryId/attributes/$attributeId');
  }
}
