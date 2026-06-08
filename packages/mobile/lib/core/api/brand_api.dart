import 'package:dio/dio.dart';

import '../network/api_response.dart';

class BrandApi {
  BrandApi(this._dio);
  final Dio _dio;

  Future<List<dynamic>> listAll() async {
    final res = await _dio.get<Map<String, dynamic>>('/brands');
    return ApiResponse.unwrapData(res.data!, (d) => d as List<dynamic>);
  }

  Future<List<dynamic>> listMy() async {
    final res = await _dio.get<Map<String, dynamic>>('/brands/my');
    return ApiResponse.unwrapData(res.data!, (d) => d as List<dynamic>);
  }

  Future<Map<String, dynamic>> create(String name) async {
    final res = await _dio.post<Map<String, dynamic>>('/brands', data: {'name': name});
    return ApiResponse.unwrapData(res.data!, (d) => d as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> update(String id, String name) async {
    final res = await _dio.put<Map<String, dynamic>>('/brands/$id', data: {'name': name});
    return ApiResponse.unwrapData(res.data!, (d) => d as Map<String, dynamic>);
  }

  Future<void> delete(String id) async {
    await _dio.delete<Map<String, dynamic>>('/brands/$id');
  }
}
