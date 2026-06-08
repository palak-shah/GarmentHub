import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';
import 'core/providers/app_providers.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final container = ProviderContainer();
  await container.read(authSessionProvider.notifier).restore();
  runApp(
    UncontrolledProviderScope(
      container: container,
      child: const GarmentHubApp(),
    ),
  );
}
