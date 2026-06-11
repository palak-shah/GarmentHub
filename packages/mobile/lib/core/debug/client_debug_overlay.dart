import 'package:flutter/material.dart';

import '../config/client_debug.dart';

/// Last global error shown in the on-screen debug banner.
@immutable
class ClientDebugEntry {
  const ClientDebugEntry(this.summary, this.stack);
  final String summary;
  final String? stack;
}

/// Global sink for [FlutterError] / [PlatformDispatcher] when [kClientDebug] is true.
class ClientDebug {
  ClientDebug._();

  static final ValueNotifier<ClientDebugEntry?> notifier = ValueNotifier<ClientDebugEntry?>(null);

  static void report(String summary, [String? stack]) {
    if (!kClientDebug) return;
    notifier.value = ClientDebugEntry(summary, stack);
  }

  static void clear() {
    notifier.value = null;
  }
}

const _maxChars = 8000;

String _truncate(String s) {
  if (s.length <= _maxChars) return s;
  return '${s.substring(0, _maxChars)}\n\n[truncated, ${s.length} chars]';
}

/// Wraps the app subtree with a dismissible bottom panel when a global error was reported.
Widget wrapWithClientDebugBanner(Widget? child) {
  if (child == null) return const SizedBox.shrink();
  if (!kClientDebug) return child;

  return Stack(
    fit: StackFit.expand,
    children: [
      child,
      ListenableBuilder(
        listenable: ClientDebug.notifier,
        builder: (context, _) {
          final e = ClientDebug.notifier.value;
          if (e == null) return const SizedBox.shrink();
          final body = _truncate([e.summary, if (e.stack != null && e.stack!.trim().isNotEmpty) e.stack].join('\n\n'));
          return Positioned(
            left: 8,
            right: 8,
            bottom: 8,
            child: Material(
              elevation: 12,
              color: const Color(0xFF1E1E1E),
              borderRadius: BorderRadius.circular(8),
              child: Container(
                height: 260,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.redAccent, width: 2),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            'Client debug — error',
                            style: TextStyle(
                              color: Colors.red.shade200,
                              fontWeight: FontWeight.w700,
                              fontSize: 13,
                            ),
                          ),
                        ),
                        TextButton(
                          onPressed: ClientDebug.clear,
                          child: const Text('Dismiss'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Expanded(
                      child: SingleChildScrollView(
                        child: SelectableText(
                          body,
                          style: const TextStyle(
                            color: Color(0xFFF5F5F5),
                            fontSize: 11,
                            fontFamily: 'monospace',
                            height: 1.35,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    ],
  );
}
