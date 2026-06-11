import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:http_parser/http_parser.dart';

/// Multer on the API rejects names without a known image extension and many
/// `application/octet-stream` bodies unless extension matches (see upload middleware).
String _safeImageFilename(PlatformFile f) {
  var name = f.name.trim();
  if (name.isEmpty) return 'upload.jpg';
  if (!RegExp(r'\.(jpe?g|png|gif|webp|bmp|heic|heif|avif)$', caseSensitive: false).hasMatch(name)) {
    name = '$name.jpg';
  }
  return name;
}

MediaType _mediaTypeForFilename(String filename) {
  final lower = filename.toLowerCase();
  if (lower.endsWith('.png')) return MediaType('image', 'png');
  if (lower.endsWith('.webp')) return MediaType('image', 'webp');
  if (lower.endsWith('.gif')) return MediaType('image', 'gif');
  if (lower.endsWith('.bmp')) return MediaType('image', 'bmp');
  if (lower.endsWith('.heic') || lower.endsWith('.heif')) return MediaType('image', 'heic');
  if (lower.endsWith('.avif')) return MediaType('image', 'avif');
  return MediaType('image', 'jpeg');
}

class UploadApi {
  UploadApi(this._dio);
  final Dio _dio;

  /// Same origin as [Dio.options.baseUrl] — avoids duplicating host logic and
  /// keeps behavior consistent with `/products`, etc.
  Future<List<String>> _postImageFormData(FormData fd) async {
    final res = await _dio.post<Map<String, dynamic>>(
      '/upload/images',
      data: fd,
      options: Options(sendTimeout: const Duration(minutes: 3)),
    );
    final body = res.data!;
    if (body['success'] != true || body['data'] == null) {
      throw Exception(body['error']?.toString() ?? 'Upload failed');
    }
    final urls = (body['data'] as Map)['urls'] as List?;
    if (urls == null) throw Exception('Invalid upload response');
    return urls.map((e) => e.toString()).toList();
  }

  /// Local filesystem paths (mobile/desktop, share-intent flows).
  Future<List<String>> postProductImages(List<String> filePaths, {String? productId}) async {
    final fd = FormData();
    if (productId != null && productId.trim().isNotEmpty) {
      fd.fields.add(MapEntry('productId', productId.trim()));
    }
    for (final p in filePaths) {
      fd.files.add(MapEntry('files', await MultipartFile.fromFile(p)));
    }
    return _postImageFormData(fd);
  }

  /// [PlatformFile] from [FilePicker]. Prefer **bytes** when present so Flutter Web
  /// works: `path` is often a `blob:` URL where [MultipartFile.fromFile] cannot read bytes.
  Future<List<String>> postProductImagesFromPlatformFiles(
    List<PlatformFile> files, {
    String? productId,
  }) async {
    final fd = FormData();
    if (productId != null && productId.trim().isNotEmpty) {
      fd.fields.add(MapEntry('productId', productId.trim()));
    }
    for (final f in files) {
      if (f.bytes != null && f.bytes!.isNotEmpty) {
        final name = _safeImageFilename(f);
        fd.files.add(
          MapEntry(
            'files',
            MultipartFile.fromBytes(
              f.bytes!,
              filename: name,
              contentType: _mediaTypeForFilename(name),
            ),
          ),
        );
      } else if (f.readStream != null && f.size > 0) {
        final name = _safeImageFilename(f);
        fd.files.add(
          MapEntry(
            'files',
            MultipartFile.fromStream(
              () => f.readStream!,
              f.size,
              filename: name,
              contentType: _mediaTypeForFilename(name),
            ),
          ),
        );
      } else if (!kIsWeb) {
        final p = f.path;
        if (p != null && p.trim().isNotEmpty) {
          fd.files.add(MapEntry('files', await MultipartFile.fromFile(p)));
        }
      }
    }
    if (fd.files.isEmpty) {
      throw Exception('No image data to upload. On web, pick again or use smaller images.');
    }
    return _postImageFormData(fd);
  }
}
