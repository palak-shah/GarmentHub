import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart' show kIsWeb;

String _safeMultipartFilename(String name) {
  var n = name.trim();
  if (n.isEmpty) return 'image.jpg';
  // Avoid path segments and odd characters that can break multipart servers.
  n = n.replaceAll(RegExp(r'[/\\]'), '_');
  if (!n.toLowerCase().endsWith('.jpg') &&
      !n.toLowerCase().endsWith('.jpeg') &&
      !n.toLowerCase().endsWith('.png') &&
      !n.toLowerCase().endsWith('.webp') &&
      !n.toLowerCase().endsWith('.gif')) {
    n = '$n.jpg';
  }
  return n;
}

/// Builds Dio multipart parts from [FilePicker] results.
///
/// On **Flutter Web**, [PlatformFile.path] is often unusable with [MultipartFile.fromFile]
/// (throws at runtime). Web must use [PlatformFile.bytes].
Future<List<MultipartFile>> platformFilesToMultipart(List<PlatformFile> files) async {
  final out = <MultipartFile>[];
  for (final f in files) {
    if (kIsWeb) {
      if (f.bytes != null && f.bytes!.isNotEmpty) {
        out.add(
          MultipartFile.fromBytes(
            f.bytes!,
            filename: _safeMultipartFilename(f.name),
          ),
        );
      }
      continue;
    }
    final path = f.path;
    if (path != null && path.trim().isNotEmpty) {
      out.add(await MultipartFile.fromFile(path.trim()));
    } else if (f.bytes != null && f.bytes!.isNotEmpty) {
      out.add(
        MultipartFile.fromBytes(
          f.bytes!,
          filename: _safeMultipartFilename(f.name),
        ),
      );
    }
  }
  return out;
}
