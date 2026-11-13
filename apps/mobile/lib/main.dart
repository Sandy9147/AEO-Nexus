import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'src/theme/app_theme.dart';
import 'src/router/app_router.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    const ProviderScope(
      child: AeoNexusApp(),
    ),
  );
}

class AeoNexusApp extends ConsumerWidget {
  const AeoNexusApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);

    return MaterialApp.router(
      title: 'AEO Nexus',
      debugShowCheckedModeBanner: false,
      theme: AeoNexusTheme.lightTheme,
      routerConfig: router,
    );
  }
}
