class ApiResponse<T> {
  const ApiResponse({
    required this.success,
    required this.data,
    required this.message,
  });

  final bool success;
  final T? data;
  final String message;

  static ApiResponse<dynamic> parseMap(Map<String, dynamic> json) {
    return ApiResponse<dynamic>(
      success: json['success'] == true,
      data: json['data'],
      message: json['message']?.toString() ?? '',
    );
  }

  static T unwrapData<T>(
    Map<String, dynamic> json,
    T Function(dynamic data) fromData,
  ) {
    final r = parseMap(json);
    if (!r.success) {
      throw ApiEnvelopeException(r.message.isNotEmpty ? r.message : 'Request failed');
    }
    return fromData(r.data);
  }
}

class ApiEnvelopeException implements Exception {
  ApiEnvelopeException(this.message);
  final String message;

  @override
  String toString() => message;
}
