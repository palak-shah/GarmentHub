import 'package:dio/dio.dart';

import '../network/api_response.dart';

class NotificationApi {
  NotificationApi(this._dio);
  final Dio _dio;

  Future<List<dynamic>> list({bool unread = false}) async {
    final res = await _dio.get<Map<String, dynamic>>(
      '/notifications',
      queryParameters: {'unread': unread},
    );
    return ApiResponse.unwrapData(res.data!, (d) => d as List<dynamic>);
  }

  Future<Map<String, dynamic>> unreadCount() async {
    final res = await _dio.get<Map<String, dynamic>>('/notifications/unread-count');
    return ApiResponse.unwrapData(res.data!, (d) => d as Map<String, dynamic>);
  }

  Future<void> markRead(String id) async {
    await _dio.put<Map<String, dynamic>>('/notifications/$id/read');
  }

  Future<void> markAllRead() async {
    await _dio.put<Map<String, dynamic>>('/notifications/read-all');
  }
}
