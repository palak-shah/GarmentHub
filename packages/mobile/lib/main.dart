import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';
import 'core/config/client_debug.dart';
import 'core/debug/client_debug_overlay.dart';
import 'core/providers/app_providers.dart';
import 'features/vendor/domain/vendor_share_prefs.dart';
import 'shared/models/user.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  if (kClientDebug) {
    FlutterError.onError = (FlutterErrorDetails details) {
      ClientDebug.report(
        details.exceptionAsString(),
        details.stack?.toString(),
      );
      FlutterError.presentError(details);
    };
    PlatformDispatcher.instance.onError = (Object error, StackTrace stack) {
      ClientDebug.report(error.toString(), stack.toString());
      return false;
    };
  }

  final container = ProviderContainer();
  await container.read(authSessionProvider.notifier).restore();
  final auth = container.read(authSessionProvider);
  if (auth.isAuthenticated && auth.user?.role == UserRole.vendor) {
    await VendorSharePrefs.syncAndroidDirectShare();
  }
  runApp(
    UncontrolledProviderScope(
      container: container,
      child: const GarmentHubApp(),
    ),
  );
}
