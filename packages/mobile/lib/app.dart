import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/routing/app_router.dart';
import 'core/theme/app_theme.dart';

class GarmentHubApp extends ConsumerWidget {
  const GarmentHubApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(goRouterProvider);
    return MaterialApp.router(
      title: 'GarmentHub',
      theme: AppTheme.light(),
      routerConfig: router,
    );
  }
}
