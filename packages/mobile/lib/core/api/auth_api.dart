import 'package:dio/dio.dart';

import '../network/api_response.dart' show ApiResponse, ApiEnvelopeException;
import '../../shared/models/user.dart';

class AuthApi {
  AuthApi(this._dio);

  final Dio _dio;

  Future<void> sendOtp(String phone) async {
    final res = await _dio.post<Map<String, dynamic>>('/auth/send-otp', data: {'phone': phone});
    final body = res.data!;
    final r = ApiResponse.parseMap(body);
    if (!r.success) {
      throw ApiEnvelopeException(r.message.isNotEmpty ? r.message : 'Request failed');
    }
  }

  Future<({String token, User user, bool isNewUser})> verifyOtp({
    required String phone,
    required String code,
    String? role,
  }) async {
    final res = await _dio.post<Map<String, dynamic>>(
      '/auth/verify-otp',
      data: {
        'phone': phone,
        'code': code,
        'role': ?role,
      },
    );
    return ApiResponse.unwrapData(res.data!, (data) {
      final m = data as Map<String, dynamic>;
      return (
        token: m['token'] as String,
        user: User.fromJson(m['user'] as Map<String, dynamic>),
        isNewUser: m['isNewUser'] == true,
      );
    });
  }

  Future<User> getProfile() async {
    final res = await _dio.get<Map<String, dynamic>>('/auth/me');
    return ApiResponse.unwrapData(res.data!, (data) => User.fromJson(data as Map<String, dynamic>));
  }

  Future<User> updateProfile(Map<String, dynamic> body) async {
    final res = await _dio.put<Map<String, dynamic>>('/auth/me', data: body);
    return ApiResponse.unwrapData(res.data!, (data) => User.fromJson(data as Map<String, dynamic>));
  }
}
