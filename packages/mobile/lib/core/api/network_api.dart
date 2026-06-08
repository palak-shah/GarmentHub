import 'package:dio/dio.dart';

import '../network/api_response.dart';

class NetworkApi {
  NetworkApi(this._dio);
  final Dio _dio;

  Future<List<dynamic>> getStories() async {
    final res = await _dio.get<Map<String, dynamic>>('/network/stories');
    return ApiResponse.unwrapData(res.data!, (d) => d as List<dynamic>);
  }

  Future<List<dynamic>> getConnections() async {
    final res = await _dio.get<Map<String, dynamic>>('/network/connections');
    return ApiResponse.unwrapData(res.data!, (d) => d as List<dynamic>);
  }

  Future<List<dynamic>> getSuggestions() async {
    final res = await _dio.get<Map<String, dynamic>>('/network/suggestions');
    return ApiResponse.unwrapData(res.data!, (d) => d as List<dynamic>);
  }

  Future<void> follow(String userId) async {
    await _dio.post<Map<String, dynamic>>('/network/follow/$userId');
  }

  Future<void> unfollow(String userId) async {
    await _dio.delete<Map<String, dynamic>>('/network/unfollow/$userId');
  }

  Future<List<dynamic>> search(String q) async {
    final res = await _dio.get<Map<String, dynamic>>('/network/search', queryParameters: {'q': q});
    return ApiResponse.unwrapData(res.data!, (d) => d as List<dynamic>);
  }

  Future<Map<String, dynamic>> getInviteCode() async {
    final res = await _dio.get<Map<String, dynamic>>('/network/invite-code');
    return ApiResponse.unwrapData(res.data!, (d) => d as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> connectViaInvite(String code) async {
    final res = await _dio.post<Map<String, dynamic>>('/network/connect-invite', data: {'code': code});
    return ApiResponse.unwrapData(res.data!, (d) => d as Map<String, dynamic>);
  }

  Future<void> connectTrader(String traderId) async {
    await _dio.post<Map<String, dynamic>>('/network/connect-trader/$traderId');
  }

  Future<Map<String, dynamic>> getTraderInsights(String traderId) async {
    final res = await _dio.get<Map<String, dynamic>>('/network/traders/$traderId/insights');
    return ApiResponse.unwrapData(res.data!, (d) => d as Map<String, dynamic>);
  }
}
