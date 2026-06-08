import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../api/auth_api.dart';
import '../config/environment.dart';
import '../../shared/models/user.dart';

const _kToken = 'garmenthub_token';
const _kUser = 'garmenthub_user';

@immutable
class AuthState {
  const AuthState({this.token, this.user});

  final String? token;
  final User? user;

  bool get isAuthenticated => token != null && token!.isNotEmpty && user != null;

  static const AuthState empty = AuthState();

  AuthState copyWith({String? token, User? user, bool clearToken = false, bool clearUser = false}) {
    return AuthState(
      token: clearToken ? null : (token ?? this.token),
      user: clearUser ? null : (user ?? this.user),
    );
  }
}

final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(
    BaseOptions(
      baseUrl: Environment.apiBaseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 60),
      headers: {'Content-Type': 'application/json'},
    ),
  );

  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) {
        final token = ref.read(authSessionProvider).token;
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        if (options.data is FormData) {
          options.headers.remove('Content-Type');
        }
        handler.next(options);
      },
      onError: (e, handler) async {
        if (e.response?.statusCode == 401) {
          await ref.read(authSessionProvider.notifier).logout();
        }
        handler.next(e);
      },
    ),
  );

  return dio;
});

final authSessionProvider = NotifierProvider<AuthSession, AuthState>(AuthSession.new);

class AuthSession extends Notifier<AuthState> {
  /// Uses [SharedPreferences] so Linux desktop builds work with **Snap Flutter**
  /// (avoids `flutter_secure_storage` → `libsecret` linked against a newer host GLib
  /// than the toolchain bundled in the snap — undefined refs to `g_task_set_static_name`, etc.).
  /// Tokens are not hardware-backed on desktop; use Keychain/Keystore builds for hardened storage.
  Future<SharedPreferences> get _prefs => SharedPreferences.getInstance();

  @override
  AuthState build() => AuthState.empty;

  Future<void> restore() async {
    final p = await _prefs;
    final token = p.getString(_kToken);
    final userJson = p.getString(_kUser);
    if (token == null || token.isEmpty || userJson == null) {
      state = AuthState.empty;
      return;
    }
    try {
      final user = User.fromJson(jsonDecode(userJson) as Map<String, dynamic>);
      state = AuthState(token: token, user: user);
    } catch (_) {
      await logout();
    }
  }

  Future<void> setSession(String token, User user) async {
    final p = await _prefs;
    await p.setString(_kToken, token);
    await p.setString(_kUser, jsonEncode(user.toJson()));
    state = AuthState(token: token, user: user);
  }

  Future<void> updateUser(User user) async {
    final p = await _prefs;
    await p.setString(_kUser, jsonEncode(user.toJson()));
    state = AuthState(token: state.token, user: user);
  }

  Future<void> logout() async {
    final p = await _prefs;
    await p.remove(_kToken);
    await p.remove(_kUser);
    state = AuthState.empty;
  }

  Future<void> sendOtp(String phone) async {
    final api = AuthApi(ref.read(dioProvider));
    await api.sendOtp(phone);
  }

  Future<User> verifyOtp({
    required String phone,
    required String code,
    String? role,
  }) async {
    final api = AuthApi(ref.read(dioProvider));
    final res = await api.verifyOtp(phone: phone, code: code, role: role);
    await setSession(res.token, res.user);
    return res.user;
  }

  Future<User> fetchProfile() async {
    final api = AuthApi(ref.read(dioProvider));
    final user = await api.getProfile();
    await updateUser(user);
    return user;
  }

  Future<User> updateProfile(Map<String, dynamic> body) async {
    final api = AuthApi(ref.read(dioProvider));
    final user = await api.updateProfile(body);
    await updateUser(user);
    return user;
  }
}
