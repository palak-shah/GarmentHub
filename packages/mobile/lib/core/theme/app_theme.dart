import 'package:flutter/material.dart';

class AppTheme {
  /// Align with production PWA primary (indigo/purple family).
  static const Color brandSeed = Color(0xFF5D5FEF);

  /// Soft page background (vendor mocks, form screens). Prefer over ad-hoc hex literals.
  static const Color pageBackgroundSoft = Color(0xFFF5F5FA);

  /// Muted filled field background for dense forms (e.g. edit product listing details).
  static const Color formFieldFillMuted = Color(0xFFE8E8EE);

  /// Vendor list cards (incoming orders, brands, catalog) — matches UI mocks.
  static const Color vendorCardBackground = Color(0xFFF7F7FD);

  static ThemeData light() {
    final scheme = ColorScheme.fromSeed(seedColor: brandSeed);
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      navigationBarTheme: NavigationBarThemeData(
        indicatorColor: scheme.primaryContainer,
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return TextStyle(color: scheme.primary, fontWeight: FontWeight.w600, fontSize: 12);
          }
          return TextStyle(color: scheme.onSurfaceVariant, fontSize: 12);
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return IconThemeData(color: scheme.primary, size: 24);
          }
          return IconThemeData(color: scheme.onSurfaceVariant, size: 24);
        }),
      ),
      appBarTheme: AppBarTheme(
        centerTitle: true,
        backgroundColor: scheme.surface,
        foregroundColor: scheme.onSurface,
        elevation: 0,
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        color: scheme.surfaceContainerLow,
      ),
      inputDecorationTheme: InputDecorationTheme(
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        filled: true,
      ),
    );
  }
}
