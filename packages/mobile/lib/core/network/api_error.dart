import 'package:dio/dio.dart';

import '../config/client_debug.dart';
import 'api_response.dart';

String? _trimStr(Object? v) {
  if (v is String && v.trim().isNotEmpty) return v.trim();
  return null;
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

String apiErrorMessage(Object err, [String fallback = 'Something went wrong']) {
  if (err is DioException) {
    if (err.type == DioExceptionType.connectionError ||
        err.type == DioExceptionType.connectionTimeout) {
      return 'No response from server — is the API running and reachable?';
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

const _verboseMaxChars = 2000;

String _truncateVerbose(String s) {
  if (s.length <= _verboseMaxChars) return s;
  return '${s.substring(0, _verboseMaxChars)}\n[truncated…]';
}

String _redactAuthInString(String s) {
  return s.replaceAllMapped(
    RegExp(r'authorization\s*:\s*bearer\s+\S+', caseSensitive: false),
    (_) => 'Authorization: Bearer [redacted]',
  );
}

String? _bodyPreviewForVerbose(dynamic data) {
  if (data == null) return null;
  String raw;
  if (data is String) {
    raw = data;
  } else {
    raw = data.toString();
  }
  raw = _redactAuthInString(raw).trim();
  if (raw.isEmpty) return null;
  return _truncateVerbose(raw);
}

String? _verboseTail(Object err) {
  if (err is DioException) {
    final parts = <String>['DioException: ${err.type}'];
    final ro = err.requestOptions;
    if (ro.path.isNotEmpty) {
      parts.add('${ro.method} ${ro.uri}');
    }
    final sc = err.response?.statusCode;
    if (sc != null) parts.add('status: $sc');
    final preview = _bodyPreviewForVerbose(err.response?.data);
    if (preview != null) parts.add('body:\n$preview');
    return parts.join('\n');
  }
  if (err is ApiEnvelopeException) {
    return 'ApiEnvelopeException: ${err.message}';
  }
  return err.toString();
}

/// Same as [apiErrorMessage] for end users; when `CLIENT_DEBUG=true`, appends
/// Dio type, status, and a truncated response preview (Authorization redacted).
String apiErrorMessageVerbose(Object err, [String fallback = 'Something went wrong']) {
  final base = apiErrorMessage(err, fallback);
  if (!kClientDebug) return base;
  final tail = _verboseTail(err);
  if (tail == null || tail.trim().isEmpty) return base;
  return '$base\n\n${_truncateVerbose(tail.trim())}';
}
