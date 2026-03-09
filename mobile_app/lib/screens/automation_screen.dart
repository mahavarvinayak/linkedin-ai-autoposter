import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/settings_provider.dart';
import '../providers/auth_provider.dart';
import '../theme/app_theme.dart';

class AutomationScreen extends StatefulWidget {
  const AutomationScreen({super.key});

  @override
  State<AutomationScreen> createState() => _AutomationScreenState();
}

class _AutomationScreenState extends State<AutomationScreen> {
  @override
  void initState() {
    super.initState();
    context.read<SettingsProvider>().loadSettings();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Settings',
              style: Theme.of(context)
                  .textTheme
                  .headlineSmall
                  ?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              'Configure automation and account settings',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppColors.textSecondary,
                  ),
            ),
            const SizedBox(height: 24),

            // LinkedIn Account
            _LinkedInSection(),

            const SizedBox(height: 16),

            // Automation Toggle
            _AutomationSection(),

            const SizedBox(height: 16),

            // Daily Auto-Post Topic
            _DailyTopicSection(),

            const SizedBox(height: 16),

            // Posting Time
            _PostingTimeSection(),

            const SizedBox(height: 16),

            // Target Account
            _TargetSection(),

            const SizedBox(height: 24),

            // Save Button
            Consumer<SettingsProvider>(
              builder: (context, settings, _) {
                return SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: settings.isSaving
                        ? null
                        : () async {
                            await settings.saveSettings();
                            if (mounted && settings.error == null) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Settings saved'),
                                  backgroundColor: AppColors.success,
                                ),
                              );
                            } else if (mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(
                                      settings.error ?? 'Failed to save'),
                                ),
                              );
                            }
                          },
                    child: settings.isSaving
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Text('Save Settings'),
                  ),
                );
              },
            ),

            const SizedBox(height: 32),

            // Danger Zone
            _DangerZone(),
          ],
        ),
      ),
    );
  }
}

class _LinkedInSection extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Consumer<AppAuthProvider>(
      builder: (context, auth, _) {
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.link, color: AppColors.primary, size: 20),
                    const SizedBox(width: 8),
                    Text(
                      'LinkedIn Account',
                      style: Theme.of(context).textTheme.titleSmall,
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: auth.isLinkedInConnected
                            ? AppColors.success.withAlpha(30)
                            : AppColors.surfaceLight,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(
                        auth.isLinkedInConnected
                            ? Icons.check_circle
                            : Icons.person_outline,
                        color: auth.isLinkedInConnected
                            ? AppColors.success
                            : AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            auth.isLinkedInConnected
                                ? 'Account Connected'
                                : 'Not Connected',
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                          if (auth.appUser?.linkedinId != null)
                            Text(
                              'ID: ${auth.appUser!.linkedinId}',
                              style: const TextStyle(
                                color: AppColors.textSecondary,
                                fontSize: 12,
                              ),
                            ),
                        ],
                      ),
                    ),
                    if (auth.isLinkedInConnected)
                      OutlinedButton(
                        onPressed: () => _showDisconnectDialog(context, auth),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.error,
                          side: const BorderSide(color: AppColors.error),
                        ),
                        child: const Text('Disconnect'),
                      )
                    else
                      ElevatedButton(
                        onPressed: () => auth.connectLinkedIn(),
                        child: const Text('Connect'),
                      ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showDisconnectDialog(BuildContext context, AppAuthProvider auth) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text('Disconnect LinkedIn?'),
        content: const Text(
          'This will remove your LinkedIn connection. You can reconnect anytime.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              auth.disconnectLinkedIn();
              Navigator.pop(ctx);
            },
            style: TextButton.styleFrom(foregroundColor: AppColors.error),
            child: const Text('Disconnect'),
          ),
        ],
      ),
    );
  }
}

class _AutomationSection extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Consumer<SettingsProvider>(
      builder: (context, settings, _) {
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: settings.automationEnabled
                        ? AppColors.accent.withAlpha(30)
                        : AppColors.surfaceLight,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    Icons.smart_toy_outlined,
                    color: settings.automationEnabled
                        ? AppColors.accent
                        : AppColors.textSecondary,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Daily Automation',
                        style: Theme.of(context).textTheme.titleSmall,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        settings.automationEnabled
                            ? 'AI posts daily at ${settings.postingTime}'
                            : 'Disabled',
                        style: const TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                Switch(
                  value: settings.automationEnabled,
                  onChanged: (value) =>
                      settings.setAutomationEnabled(value),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _PostingTimeSection extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Consumer<SettingsProvider>(
      builder: (context, settings, _) {
        return Card(
          child: InkWell(
            onTap: () async {
              final parts = settings.postingTime.split(':');
              final initialTime = TimeOfDay(
                hour: int.tryParse(parts[0]) ?? 9,
                minute: int.tryParse(parts.length > 1 ? parts[1] : '0') ?? 0,
              );
              final picked = await showTimePicker(
                context: context,
                initialTime: initialTime,
              );
              if (picked != null) {
                settings.setPostingTime(
                  '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}',
                );
              }
            },
            borderRadius: BorderRadius.circular(16),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: AppColors.primary.withAlpha(30),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.schedule, color: AppColors.primary),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Posting Time',
                          style: Theme.of(context).textTheme.titleSmall,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          settings.postingTime,
                          style: const TextStyle(
                            color: AppColors.textSecondary,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Icon(
                    Icons.chevron_right,
                    color: AppColors.textSecondary,
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _TargetSection extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Consumer<SettingsProvider>(
      builder: (context, settings, _) {
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.campaign_outlined,
                        color: AppColors.accent, size: 20),
                    const SizedBox(width: 8),
                    Text(
                      'Default Post Target',
                      style: Theme.of(context).textTheme.titleSmall,
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: GestureDetector(
                        onTap: () => settings.setTargetType('personal'),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          decoration: BoxDecoration(
                            color: settings.targetType == 'personal'
                                ? AppColors.primary.withAlpha(30)
                                : AppColors.surfaceLight,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: settings.targetType == 'personal'
                                  ? AppColors.primary
                                  : AppColors.cardBorder,
                              width:
                                  settings.targetType == 'personal' ? 2 : 1,
                            ),
                          ),
                          child: Column(
                            children: [
                              Icon(
                                Icons.person,
                                color: settings.targetType == 'personal'
                                    ? AppColors.primary
                                    : AppColors.textSecondary,
                              ),
                              const SizedBox(height: 6),
                              Text(
                                'Personal',
                                style: TextStyle(
                                  color: settings.targetType == 'personal'
                                      ? AppColors.primary
                                      : AppColors.textSecondary,
                                  fontWeight:
                                      settings.targetType == 'personal'
                                          ? FontWeight.w600
                                          : FontWeight.normal,
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: GestureDetector(
                        onTap: () => settings.setTargetType('organization'),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          decoration: BoxDecoration(
                            color: settings.targetType == 'organization'
                                ? AppColors.primary.withAlpha(30)
                                : AppColors.surfaceLight,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: settings.targetType == 'organization'
                                  ? AppColors.primary
                                  : AppColors.cardBorder,
                              width: settings.targetType == 'organization'
                                  ? 2
                                  : 1,
                            ),
                          ),
                          child: Column(
                            children: [
                              Icon(
                                Icons.business,
                                color: settings.targetType == 'organization'
                                    ? AppColors.primary
                                    : AppColors.textSecondary,
                              ),
                              const SizedBox(height: 6),
                              Text(
                                'Company',
                                style: TextStyle(
                                  color: settings.targetType == 'organization'
                                      ? AppColors.primary
                                      : AppColors.textSecondary,
                                  fontWeight:
                                      settings.targetType == 'organization'
                                          ? FontWeight.w600
                                          : FontWeight.normal,
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                if (settings.targetType == 'organization') ...[
                  const SizedBox(height: 12),
                  TextFormField(
                    initialValue: settings.selectedOrgId ?? '',
                    onChanged: settings.setSelectedOrgId,
                    decoration: const InputDecoration(
                      hintText: 'LinkedIn Organization ID (numbers only)',
                    ),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}

class _DailyTopicSection extends StatefulWidget {
  @override
  State<_DailyTopicSection> createState() => _DailyTopicSectionState();
}

class _DailyTopicSectionState extends State<_DailyTopicSection> {
  final _controller = TextEditingController();
  bool _synced = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<SettingsProvider>(
      builder: (context, settings, _) {
        // Sync controller once settings have loaded
        if (!_synced && !settings.isLoading) {
          _controller.text = settings.dailyTopic;
          _synced = true;
        }
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.auto_awesome,
                        color: AppColors.accent, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Daily Auto-Post Topic',
                            style: Theme.of(context).textTheme.titleSmall,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'AI will generate 2 posts per day about this topic automatically',
                            style: const TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _controller,
                  onChanged: settings.setDailyTopic,
                  decoration: const InputDecoration(
                    hintText:
                        'e.g. daily latest trends in AI, startup growth tips',
                    prefixIcon: Icon(Icons.lightbulb_outline),
                  ),
                  maxLines: 1,
                ),
                if (settings.dailyTopic.isNotEmpty) ...[  
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppColors.accent.withAlpha(20),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.check_circle_outline,
                            color: AppColors.accent, size: 14),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            'AI will auto-generate posts about "${settings.dailyTopic}"',
                            style: const TextStyle(
                              color: AppColors.accent,
                              fontSize: 11,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}

class _DangerZone extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: AppColors.error.withAlpha(60)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Account',
              style: Theme.of(context)
                  .textTheme
                  .titleSmall
                  ?.copyWith(color: AppColors.error),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () {
                  context.read<AppAuthProvider>().signOut();
                },
                icon: const Icon(Icons.logout),
                label: const Text('Sign Out'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.error,
                  side: const BorderSide(color: AppColors.error),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
