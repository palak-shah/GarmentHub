import 'package:dio/dio.dart';

import '../network/api_response.dart';

class OrderApi {
  OrderApi(this._dio);
  final Dio _dio;

  Future<Map<String, dynamic>> create(Map<String, dynamic> data) async {
    final res = await _dio.post<Map<String, dynamic>>('/orders', data: data);
    return ApiResponse.unwrapData(res.data!, (d) => d as Map<String, dynamic>);
  }

  Future<dynamic> list() async {
    final res = await _dio.get<Map<String, dynamic>>('/orders');
    return ApiResponse.unwrapData(res.data!, (d) => d);
  }

  Future<Map<String, dynamic>> getById(String id) async {
    final res = await _dio.get<Map<String, dynamic>>('/orders/$id');
    return ApiResponse.unwrapData(res.data!, (d) => d as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> confirm(String id) async {
    final res = await _dio.post<Map<String, dynamic>>('/orders/$id/confirm');
    return ApiResponse.unwrapData(res.data!, (d) => d as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> modifyItems(String id, List<Map<String, dynamic>> items) async {
    final res = await _dio.post<Map<String, dynamic>>('/orders/$id/modify', data: {'items': items});
    return ApiResponse.unwrapData(res.data!, (d) => d as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> cancel(String id) async {
    final res = await _dio.post<Map<String, dynamic>>('/orders/$id/cancel');
    return ApiResponse.unwrapData(res.data!, (d) => d as Map<String, dynamic>);
  }

  Future<List<dynamic>> traderAlerts() async {
    final res = await _dio.get<Map<String, dynamic>>('/orders/trader/alerts');
    return ApiResponse.unwrapData(res.data!, (d) => d as List<dynamic>);
  }

  Future<Map<String, dynamic>> takeControl(String id) async {
    final res = await _dio.post<Map<String, dynamic>>('/orders/$id/take-control');
    return ApiResponse.unwrapData(res.data!, (d) => d as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> releaseToVendors(String id) async {
    final res = await _dio.post<Map<String, dynamic>>('/orders/$id/release-to-vendors');
    return ApiResponse.unwrapData(res.data!, (d) => d as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> traderAdjust(String id, Map<String, dynamic> body) async {
    final res = await _dio.post<Map<String, dynamic>>('/orders/$id/trader-adjust', data: body);
    return ApiResponse.unwrapData(res.data!, (d) => d as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> setTraderCounterPrice(String itemId, double unitPrice) async {
    final res = await _dio.put<Map<String, dynamic>>(
      '/orders/items/$itemId/counter-price',
      data: {'unitPrice': unitPrice},
    );
    return ApiResponse.unwrapData(res.data!, (d) => d as Map<String, dynamic>);
  }
}
