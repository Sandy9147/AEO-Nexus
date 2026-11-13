import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('AEO Nexus'),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_none_outlined),
            onPressed: () {},
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Welcome Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AeoNexusColors.softBlue,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                    color: AeoNexusColors.primary.withValues(alpha: 0.2)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Welcome to AEO Nexus',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: AeoNexusColors.primary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'AI-powered business operating system mobile client.',
                    style: TextStyle(
                      fontSize: 14,
                      color: AeoNexusColors.textMain,
                    ),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {},
                    child: const Text('View Workspaces'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'Quick Overview',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: AeoNexusColors.textMain,
              ),
            ),
            const SizedBox(height: 12),
            Card(
              child: ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AeoNexusColors.softViolet,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.hub_outlined,
                      color: AeoNexusColors.violetAccent),
                ),
                title: const Text('Workflow Automation'),
                subtitle: const Text('Active and monitored in background'),
                trailing: const Icon(Icons.chevron_right,
                    color: AeoNexusColors.textMuted),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
