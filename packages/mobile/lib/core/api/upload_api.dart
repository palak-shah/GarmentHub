import 'package:dio/dio.dart';

import '../config/environment.dart';

class UploadApi {
  UploadApi(this._dio);
  final Dio _dio;

  /// `POST /api/upload/images` — backend mounts upload routes at `/api/upload`.
  Future<List<String>> postProductImages(List<String> filePaths, {String? productId}) async {
    final fd = FormData();
    for (final p in filePaths) {
      fd.files.add(MapEntry('files', await MultipartFile.fromFile(p)));
    }
    if (productId != null && productId.trim().isNotEmpty) {
      fd.fields.add(MapEntry('productId', productId.trim()));
    }
    final base = Environment.apiBaseUrl.replaceAll(RegExp(r'/$'), '');
    final url = '$base/upload/images';
    final res = await _dio.post<Map<String, dynamic>>(url, data: fd);
    final body = res.data!;
    if (body['success'] != true || body['data'] == null) {
      throw Exception(body['error']?.toString() ?? 'Upload failed');
    }
    final urls = (body['data'] as Map)['urls'] as List?;
    if (urls == null) throw Exception('Invalid upload response');
    return urls.map((e) => e.toString()).toList();
  }
}
