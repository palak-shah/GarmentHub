import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

/// On-device share flow diagnostics (temporary).
///
/// - Debug / profile: overlay on when [kDebugMode] is true.
/// - Release: `flutter build apk --dart-define=SHARE_DEBUG_OVERLAY=true`
class ShareDebugLog {
  ShareDebugLog._();

  static const int maxLines = 48;

  static bool get overlayEnabled =>
      !kIsWeb && (kDebugMode || const bool.fromEnvironment('SHARE_DEBUG_OVERLAY', defaultValue: false));

  static final ValueNotifier<List<String>> lines = ValueNotifier<List<String>>(<String>[]);

  static void log(String message) {
    debugPrint('[share-debug] $message');
    final t = DateTime.now();
    final stamp =
        '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}:${t.second.toString().padLeft(2, '0')}';
    final next = List<String>.from(lines.value)..add('$stamp $message');
    if (next.length > maxLines) {
      next.removeRange(0, next.length - maxLines);
    }
    lines.value = next;
  }

  static void clear() {
    lines.value = <String>[];
  }
}

/// Bottom panel over the whole app; scrollable log lines.
class ShareDebugLogOverlay extends StatelessWidget {
  const ShareDebugLogOverlay({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    if (!ShareDebugLog.overlayEnabled) return child;

    return Stack(
      fit: StackFit.expand,
      children: [
        child,
        Positioned(
          left: 6,
          right: 6,
          bottom: 6,
          height: 168,
          child: Material(
            elevation: 8,
            borderRadius: BorderRadius.circular(10),
            color: Colors.black.withValues(alpha: 0.88),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  child: Row(
                    children: [
                      const Text(
                        'Share debug',
                        style: TextStyle(
                          color: Colors.white70,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const Spacer(),
                      TextButton(
                        onPressed: ShareDebugLog.clear,
                        style: TextButton.styleFrom(
                          minimumSize: Size.zero,
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        child: const Text('Clear', style: TextStyle(color: Colors.orangeAccent, fontSize: 11)),
                      ),
                    ],
                  ),
                ),
                const Divider(height: 1, color: Colors.white24),
                Expanded(
                  child: ValueListenableBuilder<List<String>>(
                    valueListenable: ShareDebugLog.lines,
                    builder: (context, items, _) {
                      if (items.isEmpty) {
                        return const Center(
                          child: Text(
                            '(no logs yet)',
                            style: TextStyle(color: Colors.white38, fontSize: 11),
                          ),
                        );
                      }
                      return ListView.builder(
                        padding: const EdgeInsets.fromLTRB(8, 4, 8, 8),
                        itemCount: items.length,
                        itemBuilder: (context, i) {
                          return Text(
                            items[i],
                            style: const TextStyle(
                              color: Colors.greenAccent,
                              fontSize: 10,
                              height: 1.25,
                              fontFamily: 'monospace',
                            ),
                          );
                        },
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
