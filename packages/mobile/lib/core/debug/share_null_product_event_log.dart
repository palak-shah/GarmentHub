import 'dart:convert';
import 'dart:io';

import 'package:path_provider/path_provider.dart';

/// Append-only local log when Android share has media but no listing id (OEM stripped extras/URI).
///
/// JSON Lines under app support dir; capped by line count and total bytes.
class ShareNullProductEventLog {
  ShareNullProductEventLog._();

  static const _fileName = 'share_null_product_id_events.jsonl';
  static const _maxLines = 200;
  static const _maxBytes = 256 * 1024;

  static Future<void> recordNullProductIdShareEvent({
    required String? resolvedSource,
    required String? intentDataPreview,
    required int pathCount,
    String? firstPathBasename,
  }) async {
    try {
      final dir = await getApplicationSupportDirectory();
      final file = File('${dir.path}/$_fileName');
      final line = jsonEncode(<String, Object?>{
        'at': DateTime.now().toUtc().toIso8601String(),
        'resolvedSource': resolvedSource,
        'intentDataPreview': intentDataPreview,
        'pathCount': pathCount,
        if (firstPathBasename != null && firstPathBasename.isNotEmpty) 'firstPathBasename': firstPathBasename,
      });
      var lines = <String>[];
      if (await file.exists()) {
        final body = await file.readAsString();
        lines = body.split('\n').where((e) => e.trim().isNotEmpty).toList();
      }
      lines.add(line);
      while (lines.length > _maxLines) {
        lines.removeAt(0);
      }
      var out = lines.join('\n');
      if (out.length > _maxBytes) {
        out = out.substring(out.length - _maxBytes);
        final idx = out.indexOf('\n');
        if (idx >= 0) {
          out = out.substring(idx + 1);
        }
      }
      await file.writeAsString(out.isEmpty ? '' : '$out\n');
    } catch (_) {}
  }
}
