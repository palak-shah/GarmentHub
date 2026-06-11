import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart' show kIsWeb;

/// On **web**, [PlatformFile.path] throws by design — never read it here.
/// See https://github.com/miguelpruivo/flutter_file_picker/wiki/FAQ
bool platformFileHasUploadableData(PlatformFile f) {
  if (f.bytes != null && f.bytes!.isNotEmpty) return true;
  if (f.readStream != null && f.size > 0) return true;
  if (kIsWeb) return false;
  final p = f.path;
  return p != null && p.trim().isNotEmpty;
}
