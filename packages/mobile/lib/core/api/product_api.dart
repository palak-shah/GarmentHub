import 'package:dio/dio.dart';

import '../network/api_response.dart';

class ProductApi {
  ProductApi(this._dio);
  final Dio _dio;

  Future<Map<String, dynamic>> list({Map<String, dynamic>? query}) async {
    final res = await _dio.get<Map<String, dynamic>>('/products', queryParameters: query);
    return ApiResponse.unwrapData(res.data!, (d) => d as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> getById(String id) async {
    final res = await _dio.get<Map<String, dynamic>>('/products/$id');
    return ApiResponse.unwrapData(res.data!, (d) => d as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> getTraderGallery(String id) async {
    final res = await _dio.get<Map<String, dynamic>>('/products/$id/gallery');
    return ApiResponse.unwrapData(res.data!, (d) => d as Map<String, dynamic>);
  }

  Future<List<dynamic>> getMyProducts() async {
    final res = await _dio.get<Map<String, dynamic>>('/products/my');
    return ApiResponse.unwrapData(res.data!, (d) => d as List<dynamic>);
  }

  Future<Map<String, dynamic>> create(Object data) async {
    final res = await _dio.post<Map<String, dynamic>>('/products', data: data);
    return ApiResponse.unwrapData(res.data!, (d) => d as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> update(String id, Map<String, dynamic> data) async {
    final res = await _dio.put<Map<String, dynamic>>('/products/$id', data: data);
    return ApiResponse.unwrapData(res.data!, (d) => d as Map<String, dynamic>);
  }

  Future<void> delete(String id) async {
    await _dio.delete<Map<String, dynamic>>('/products/$id');
  }

  Future<Map<String, dynamic>> bulkDelete(List<String> ids) async {
    final res = await _dio.post<Map<String, dynamic>>('/products/bulk-delete', data: {'ids': ids});
    return ApiResponse.unwrapData(res.data!, (d) => d as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> bulkUpdate(
    List<String> ids,
    Map<String, dynamic> updates,
  ) async {
    final res = await _dio.put<Map<String, dynamic>>(
      '/products/bulk-update',
      data: {...updates, 'ids': ids},
    );
    return ApiResponse.unwrapData(res.data!, (d) => d as Map<String, dynamic>);
  }

  Future<List<dynamic>> getCategories() async {
    final res = await _dio.get<Map<String, dynamic>>('/products/categories');
    return ApiResponse.unwrapData(res.data!, (d) => d as List<dynamic>);
  }

  Future<Map<String, dynamic>> getFilters() async {
    final res = await _dio.get<Map<String, dynamic>>('/products/filters');
    return ApiResponse.unwrapData(res.data!, (d) => d as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> feed({String? cursor, int? limit, String? categoryId}) async {
    final res = await _dio.get<Map<String, dynamic>>(
      '/products/feed',
      queryParameters: {
        'cursor': ?cursor,
        'limit': ?limit,
        'categoryId': ?categoryId,
      },
    );
    return ApiResponse.unwrapData(res.data!, (d) => d as Map<String, dynamic>);
  }

  Future<void> saveProduct(String productId) async {
    await _dio.post<Map<String, dynamic>>('/products/save', data: {'productId': productId});
  }

  Future<void> unsaveProduct(String productId) async {
    await _dio.delete<Map<String, dynamic>>('/products/save/$productId');
  }

  Future<List<dynamic>> getSavedProducts() async {
    final res = await _dio.get<Map<String, dynamic>>('/products/saved');
    return ApiResponse.unwrapData(res.data!, (d) => d as List<dynamic>);
  }
}
