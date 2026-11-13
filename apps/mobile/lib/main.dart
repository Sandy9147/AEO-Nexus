import 'package:flutter/material.dart';
import 'src/theme/app_theme.dart';
import 'src/screens/home_screen.dart';

void main() {
  runApp(const AeoNexusApp());
}

class AeoNexusApp extends StatelessWidget {
  const AeoNexusApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AEO Nexus',
      debugShowCheckedModeBanner: false,
      theme: AeoNexusTheme.lightTheme,
      home: const HomeScreen(),
    );
  }
}

