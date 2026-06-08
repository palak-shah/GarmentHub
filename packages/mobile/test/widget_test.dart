import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:garmenthub_mobile/app.dart';

void main() {
  testWidgets('App shows login when logged out', (tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: GarmentHubApp(),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Sign in'), findsOneWidget);
  });
}
