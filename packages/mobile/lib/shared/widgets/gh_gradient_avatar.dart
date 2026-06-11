import 'package:flutter/material.dart';

/// Deterministic soft gradient avatar from a display name.
class GhGradientAvatar extends StatelessWidget {
  const GhGradientAvatar({super.key, required this.name, this.size = 44});

  final String name;
  final double size;

  static List<Color> _colorsFor(String seed) {
    const palettes = <List<Color>>[
      [Color(0xFF7C3AED), Color(0xFFA78BFA)],
      [Color(0xFF0369A1), Color(0xFF38BDF8)],
      [Color(0xFFC2410C), Color(0xFFFB923C)],
      [Color(0xFF047857), Color(0xFF34D399)],
      [Color(0xFFBE123C), Color(0xFFFB7185)],
      [Color(0xFF4F46E5), Color(0xFF818CF8)],
    ];
    var h = 0;
    for (var i = 0; i < seed.length; i++) {
      h = seed.codeUnitAt(i) + ((h << 5) - h);
    }
    return palettes[h.abs() % palettes.length];
  }

  @override
  Widget build(BuildContext context) {
    final letter = (name.trim().isEmpty ? '?' : name.trim()[0]).toUpperCase();
    final colors = _colorsFor(name.isEmpty ? '?' : name);
    return SizedBox(
      width: size,
      height: size,
      child: DecoratedBox(
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: colors),
        ),
        child: Center(
          child: Text(
            letter,
            style: TextStyle(
              color: Colors.white,
              fontSize: size * 0.38,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ),
    );
  }
}
