import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show kIsWeb;

import '../config/environment.dart';
import 'api_response.dart';

String? _trimStr(Object? v) {
  if (v is String && v.trim().isNotEmpty) return v.trim();
  return null;
}

String _truncateDebug(String s, [int max = 2000]) {
  if (s.length <= max) return s;
  return '${s.substring(0, max)}… [truncated, ${s.length} chars]';
}

String? _messageFromPayload(dynamic data) {
  if (data is! Map) return null;
  final o = Map<String, dynamic>.from(data);
  final direct = _trimStr(o['error']) ?? _trimStr(o['message']);
  if (direct != null) {
    if (direct == 'Validation failed' && o['details'] is List) {
      final list = o['details'] as List;
      if (list.isNotEmpty && list.first is Map) {
        final first = list.first as Map;
        final dMsg = _trimStr(first['message']);
        if (dMsg != null) return '$direct: $dMsg';
      }
    }
    if (direct == 'Insufficient permissions' || direct == 'Forbidden') {
      return 'You do not have permission for this action. Check that you are signed in with the correct role.';
    }
    return direct;
  }
  if (o['details'] is List) {
    final list = o['details'] as List;
    if (list.isNotEmpty && list.first is Map) {
      return _trimStr((list.first as Map)['message']);
    }
  }
  return null;
}

String _apiErrorUserMessage(Object err, [String fallback = 'Something went wrong']) {
  if (err is DioException) {
    if (err.type == DioExceptionType.connectionError ||
        err.type == DioExceptionType.connectionTimeout) {
      return 'No response from server — is the API running and reachable?';
    }
    if (kIsWeb &&
        err.response == null &&
        (err.type == DioExceptionType.unknown || err.type == DioExceptionType.cancel)) {
      final path = err.requestOptions.path;
      if (path.contains('upload')) {
        return 'Upload failed in the browser (often CORS). Add this app\'s exact URL '
            '(scheme + host + port, e.g. http://YOUR_IP:8080) to API CORS_ORIGINS, '
            'or set CORS_ALLOW_LAN_ORIGINS=1 on the API if you use a private LAN URL. '
            'Hard-refresh after changing CORS.';
      }
    }
    if (err.response == null && err.requestOptions.path.isNotEmpty) {
      return 'Network error — check your connection';
    }
    final status = err.response?.statusCode;
    final raw = err.response?.data;
    dynamic data = raw;
    if (raw is String && raw.trim().startsWith('{')) {
      try {
        // ignore: avoid_dynamic_calls
        data = raw; // keep string for body check
      } catch (_) {}
    }
    if (raw is String) {
      final t = raw.trim();
      if (t.startsWith('<!DOCTYPE') || t.contains('<html')) {
        return 'API returned HTML instead of JSON. Check API_BASE_URL points to the JSON API (/api).';
      }
      if (t.isNotEmpty && t.length < 300) return t;
    }
    if (data is Map) {
      final fromBody = _messageFromPayload(data);
      if (fromBody != null) return fromBody;
    }
    if (status == 404) {
      return 'Not found (404). Check API_BASE_URL and that the backend is running.';
    }
    if (status == 502 || status == 503) {
      return 'Server unavailable ($status). Try again in a moment.';
    }
    if (status != null && status >= 500) {
      return 'Server error ($status). Check the API logs.';
    }
    if (status != null) return 'Request failed ($status)';
  }
  if (err is ApiEnvelopeException) return err.message;
  if (err is Exception) return err.toString().replaceFirst('Exception: ', '');
  return fallback;
}

String _stringifyResponseData(dynamic data) {
  if (data == null) return '(null)';
  if (data is String) return data;
  if (data is Map || data is List) {
    try {
      return jsonEncode(data);
    } catch (_) {
      return data.toString();
    }
  }
  return data.toString();
}

Map<String, dynamic> _headersForDebug(Map<String, dynamic>? headers) {
  if (headers == null || headers.isEmpty) return {};
  final out = <String, dynamic>{};
  headers.forEach((name, value) {
    final lower = name.toLowerCase();
    if (lower == 'authorization' || lower == 'cookie') {
      out[name] = '<redacted>';
    } else {
      out[name] = value;
    }
  });
  return out;
}

/// Technical details for developers when [Environment.clientDebug] is true.
String formatApiErrorDebug(Object err) {
  final buf = StringBuffer();
  if (err is DioException) {
    buf.writeln('DioException');
    buf.writeln('type: ${err.type}');
    if (err.message != null && err.message!.isNotEmpty) {
      buf.writeln('message: ${err.message}');
    }
    buf.writeln('method: ${err.requestOptions.method}');
    buf.writeln('uri: ${err.requestOptions.uri}');
    buf.writeln('headers: ${_stringifyResponseData(_headersForDebug(err.requestOptions.headers))}');
    buf.writeln('statusCode: ${err.response?.statusCode}');
    buf.writeln('responseType: ${err.response?.requestOptions.responseType}');
    final body = _stringifyResponseData(err.response?.data);
    buf.writeln('response.data: ${_truncateDebug(body)}');
    buf.writeln('stackTrace: ${err.stackTrace}');
    return buf.toString().trimRight();
  }
  if (err is ApiEnvelopeException) {
    buf.writeln('ApiEnvelopeException');
    buf.writeln('message: ${err.message}');
    return buf.toString().trimRight();
  }
  buf.writeln(err.runtimeType.toString());
  buf.writeln(_truncateDebug(err.toString(), 4000));
  if (err is Error && err.stackTrace != null) {
    buf.writeln('stackTrace: ${err.stackTrace}');
  }
  return buf.toString().trimRight();
}

String apiErrorMessage(Object err, [String fallback = 'Something went wrong']) {
  final user = _apiErrorUserMessage(err, fallback);
  if (!Environment.clientDebug) return user;
  final detail = formatApiErrorDebug(err);
  if (detail.isEmpty) return user;
  return '$user\n\n---\n$detail';
}
