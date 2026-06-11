import 'package:dio/dio.dart';

import '../network/api_response.dart';

class WorkflowApi {
  WorkflowApi(this._dio);
  final Dio _dio;

  Future<void> markState(String productId, String state) async {
    await _dio.post<Map<String, dynamic>>('/workflow/mark', data: {'productId': productId, 'state': state});
  }

  Future<Map<String, dynamic>> markBulk(List<String> productIds, String state) async {
    final res = await _dio.post<Map<String, dynamic>>(
      '/workflow/mark-bulk',
      data: {'productIds': productIds, 'state': state},
    );
    return ApiResponse.unwrapData(res.data!, (d) => d as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> feedByState(String state, {String? cursor, int limit = 20}) async {
    final res = await _dio.get<Map<String, dynamic>>(
      '/workflow/feed',
      queryParameters: {'state': state, if (cursor != null) 'cursor': cursor, 'limit': limit},
    );
    return ApiResponse.unwrapData(res.data!, (d) => d as Map<String, dynamic>);
  }

  Future<List<dynamic>> unseen({int limit = 20}) async {
    final res = await _dio.get<Map<String, dynamic>>('/workflow/unseen', queryParameters: {'limit': limit});
    return ApiResponse.unwrapData(res.data!, (d) => d as List<dynamic>);
  }

  Future<List<dynamic>> unseenGrouped({int limit = 40}) async {
    final res = await _dio.get<Map<String, dynamic>>(
      '/workflow/unseen-grouped',
      queryParameters: {'limit': limit},
    );
    return ApiResponse.unwrapData(res.data!, (d) => d as List<dynamic>);
  }

  Future<Map<String, dynamic>> counts() async {
    final res = await _dio.get<Map<String, dynamic>>('/workflow/counts');
    return ApiResponse.unwrapData(res.data!, (d) => d as Map<String, dynamic>);
  }
}
