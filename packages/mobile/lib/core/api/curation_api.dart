import 'package:dio/dio.dart';

import '../network/api_response.dart';

class CurationApi {
  CurationApi(this._dio);
  final Dio _dio;

  Future<Map<String, dynamic>> createShare(Map<String, dynamic> data) async {
    final res = await _dio.post<Map<String, dynamic>>('/curation/share', data: data);
    final body = res.data!;
    final success = body['success'] == true;
    if (!success) throw Exception(body['message']?.toString() ?? 'Share failed');
    return body['data'] as Map<String, dynamic>;
  }

  Future<List<dynamic>> listSent() async {
    final res = await _dio.get<Map<String, dynamic>>('/curation/sent');
    return ApiResponse.unwrapData(res.data!, (d) => d as List<dynamic>);
  }

  Future<List<dynamic>> listReceived() async {
    final res = await _dio.get<Map<String, dynamic>>('/curation/received');
    return ApiResponse.unwrapData(res.data!, (d) => d as List<dynamic>);
  }

  Future<Map<String, dynamic>> getSharedPhotosForProduct(String productId) async {
    final res = await _dio.get<Map<String, dynamic>>('/curation/shared-photos/$productId');
    return ApiResponse.unwrapData(res.data!, (d) => d as Map<String, dynamic>);
  }

  Future<void> markRead(String shareId) async {
    await _dio.put<Map<String, dynamic>>('/curation/read/$shareId');
  }

  Future<List<dynamic>> getCustomers() async {
    final res = await _dio.get<Map<String, dynamic>>('/curation/customers');
    return ApiResponse.unwrapData(res.data!, (d) => d as List<dynamic>);
  }

  Future<List<dynamic>> listCustomerGroups() async {
    final res = await _dio.get<Map<String, dynamic>>('/curation/groups');
    return ApiResponse.unwrapData(res.data!, (d) => d as List<dynamic>);
  }

  Future<Map<String, dynamic>> getCustomerGroup(String groupId) async {
    final res = await _dio.get<Map<String, dynamic>>('/curation/groups/$groupId');
    return ApiResponse.unwrapData(res.data!, (d) => d as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> createCustomerGroup(Map<String, dynamic> body) async {
    final res = await _dio.post<Map<String, dynamic>>('/curation/groups', data: body);
    return ApiResponse.unwrapData(res.data!, (d) => d as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> updateCustomerGroup(String groupId, Map<String, dynamic> body) async {
    final res = await _dio.patch<Map<String, dynamic>>('/curation/groups/$groupId', data: body);
    return ApiResponse.unwrapData(res.data!, (d) => d as Map<String, dynamic>);
  }

  Future<void> deleteCustomerGroup(String groupId) async {
    await _dio.delete<Map<String, dynamic>>('/curation/groups/$groupId');
  }

  Future<Map<String, dynamic>> addCustomerGroupMembers(String groupId, List<String> customerIds) async {
    final res = await _dio.post<Map<String, dynamic>>(
      '/curation/groups/$groupId/members',
      data: {'customerIds': customerIds},
    );
    return ApiResponse.unwrapData(res.data!, (d) => d as Map<String, dynamic>);
  }

  Future<void> removeCustomerGroupMember(String groupId, String customerId) async {
    await _dio.delete<Map<String, dynamic>>('/curation/groups/$groupId/members/$customerId');
  }
}
