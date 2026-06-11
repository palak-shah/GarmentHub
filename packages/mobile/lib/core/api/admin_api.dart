import 'package:dio/dio.dart';

import '../network/api_response.dart';

class AdminApi {
  AdminApi(this._dio);
  final Dio _dio;

  Future<List<dynamic>> getUsers({String? role}) async {
    final res = await _dio.get<Map<String, dynamic>>(
      '/admin/users',
      queryParameters: role != null ? {'role': role} : null,
    );
    return ApiResponse.unwrapData(res.data!, (d) => d as List<dynamic>);
  }

  Future<Map<String, dynamic>> toggleUserStatus(String id, bool isActive) async {
    final res = await _dio.put<Map<String, dynamic>>('/admin/users/$id', data: {'isActive': isActive});
    return ApiResponse.unwrapData(res.data!, (d) => d as Map<String, dynamic>);
  }

  Future<List<dynamic>> getAllOrders() async {
    final res = await _dio.get<Map<String, dynamic>>('/admin/orders');
    return ApiResponse.unwrapData(res.data!, (d) => d as List<dynamic>);
  }

  Future<Map<String, dynamic>> getStats() async {
    final res = await _dio.get<Map<String, dynamic>>('/admin/stats');
    return ApiResponse.unwrapData(res.data!, (d) => d as Map<String, dynamic>);
  }

  Future<List<dynamic>> getCategories() async {
    final res = await _dio.get<Map<String, dynamic>>('/admin/categories');
    return ApiResponse.unwrapData(res.data!, (d) => d as List<dynamic>);
  }

  Future<Map<String, dynamic>> createCategory(String name, List<Map<String, dynamic>>? attributes) async {
    final res = await _dio.post<Map<String, dynamic>>(
      '/admin/categories',
      data: {'name': name, if (attributes != null) 'attributes': attributes},
    );
    return ApiResponse.unwrapData(res.data!, (d) => d as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> updateCategory(String id, String name) async {
    final res = await _dio.put<Map<String, dynamic>>('/admin/categories/$id', data: {'name': name});
    return ApiResponse.unwrapData(res.data!, (d) => d as Map<String, dynamic>);
  }

  Future<void> deleteCategory(String id) async {
    await _dio.delete<Map<String, dynamic>>('/admin/categories/$id');
  }

  Future<Map<String, dynamic>> createCategoryAttribute(
    String categoryId,
    Map<String, dynamic> body,
  ) async {
    final res = await _dio.post<Map<String, dynamic>>(
      '/admin/categories/$categoryId/attributes',
      data: body,
    );
    return ApiResponse.unwrapData(res.data!, (d) => d as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> updateCategoryAttribute(
    String categoryId,
    String attributeId,
    Map<String, dynamic> data,
  ) async {
    final res = await _dio.put<Map<String, dynamic>>(
      '/admin/categories/$categoryId/attributes/$attributeId',
      data: data,
    );
    return ApiResponse.unwrapData(res.data!, (d) => d as Map<String, dynamic>);
  }

  Future<void> deleteCategoryAttribute(String categoryId, String attributeId) async {
    await _dio.delete<Map<String, dynamic>>('/admin/categories/$categoryId/attributes/$attributeId');
  }
}
