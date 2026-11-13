import 'package:flutter/material.dart';

class AeoNexusColors {
  static const Color primary = Color(0xFF3563F6);
  static const Color violetAccent = Color(0xFF6554E8);
  static const Color background = Color(0xFFF7F9FC);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color softBlue = Color(0xFFEAF0FF);
  static const Color softViolet = Color(0xFFEEF0FF);
  static const Color success = Color(0xFF16A36A);
  static const Color warning = Color(0xFFE59A27);
  static const Color textMain = Color(0xFF1E293B);
  static const Color textMuted = Color(0xFF64748B);
  static const Color border = Color(0xFFE2E8F0);
}

class AeoNexusTheme {
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      fontFamily: 'Inter',
      scaffoldBackgroundColor: AeoNexusColors.background,
      colorScheme: ColorScheme.light(
        primary: AeoNexusColors.primary,
        secondary: AeoNexusColors.violetAccent,
        surface: AeoNexusColors.surface,
        background: AeoNexusColors.background,
        error: Colors.red.shade600,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: AeoNexusColors.surface,
        elevation: 0,
        centerTitle: false,
        iconTheme: IconThemeData(color: AeoNexusColors.textMain),
        titleTextStyle: TextStyle(
          color: AeoNexusColors.textMain,
          fontSize: 18,
          fontWeight: FontWeight.w600,
          fontFamily: 'Inter',
        ),
      ),
      cardTheme: CardTheme(
        color: AeoNexusColors.surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: AeoNexusColors.border),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AeoNexusColors.primary,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
          textStyle: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            fontFamily: 'Inter',
          ),
        ),
      ),
    );
  }
}

