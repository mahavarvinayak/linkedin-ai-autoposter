import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../providers/post_provider.dart';
import '../providers/auth_provider.dart';
import '../providers/settings_provider.dart';
import '../theme/app_theme.dart';

class CreatePostScreen extends StatefulWidget {
  const CreatePostScreen({super.key});

  @override
  State<CreatePostScreen> createState() => _CreatePostScreenState();
}

class _CreatePostScreenState extends State<CreatePostScreen> {
  final _topicController = TextEditingController();
  final _contentController = TextEditingController();
  final _hashtagController = TextEditingController();
  String _targetType = 'personal';

  @override
  void dispose() {
    _topicController.dispose();
    _contentController.dispose();
    _hashtagController.dispose();
    super.dispose();
  }

  Future<void> _generatePost() async {
    if (_topicController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a topic')),
      );
      return;
    }

    final provider = context.read<PostProvider>();
    await provider.generateAIPost(topic: _topicController.text.trim());

    if (provider.generatedContent != null) {
      _contentController.text = provider.generatedContent!;
      _hashtagController.text = provider.generatedHashtags.join(', ');
    }

    if (provider.error != null && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(provider.error!)),
      );
    }
  }

  Future<void> _publishPost() async {
    if (_contentController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Post content cannot be empty')),
      );
      return;
    }

    final auth = context.read<AppAuthProvider>();
    if (!auth.isLinkedInConnected) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please connect your LinkedIn account first'),
        ),
      );
      return;
    }

    final hashtags = _hashtagController.text
        .split(',')
        .map((h) => h.trim())
        .where((h) => h.isNotEmpty)
        .toList();

    final fullContent = _contentController.text.trim() +
        (hashtags.isNotEmpty ? '\n\n${hashtags.map((h) => h.startsWith('#') ? h : '#$h').join(' ')}' : '');

    final provider = context.read<PostProvider>();
    final settings = context.read<SettingsProvider>();
    final organizationId = _targetType == 'organization'
        ? settings.selectedOrgId
        : null;

    if (_targetType == 'organization' &&
        (organizationId == null || organizationId.isEmpty)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Set company organization ID in Settings first'),
        ),
      );
      return;
    }

    await provider.publishPost(
      content: fullContent,
      targetType: _targetType,
      organizationId: organizationId,
    );

    if (provider.error == null && mounted) {
      _contentController.clear();
      _hashtagController.clear();
      _topicController.clear();
      provider.clearGenerated();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Post published to LinkedIn!'),
          backgroundColor: AppColors.success,
        ),
      );
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(provider.error ?? 'Failed to publish')),
      );
    }
  }

  Future<void> _saveDraft() async {
    if (_contentController.text.trim().isEmpty) return;

    final hashtags = _hashtagController.text
        .split(',')
        .map((h) => h.trim())
        .where((h) => h.isNotEmpty)
        .toList();

    final provider = context.read<PostProvider>();
    await provider.savePost(
      content: _contentController.text.trim(),
      hashtags: hashtags,
      targetType: _targetType,
      status: 'draft',
    );

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Draft saved')),
      );
    }
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
              'Create Post',
              style: Theme.of(context)
                  .textTheme
                  .headlineSmall
                  ?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              'Generate and publish AI-powered LinkedIn posts',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppColors.textSecondary,
                  ),
            ),
            const SizedBox(height: 24),

            // AI Topic Input
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.auto_awesome, color: AppColors.accent, size: 20),
                        const SizedBox(width: 8),
                        Text(
                          'AI Post Generator',
                          style: Theme.of(context).textTheme.titleSmall,
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _topicController,
                      decoration: const InputDecoration(
                        hintText: 'Enter a topic (e.g., AI trends, startup tips, tech leadership)',
                      ),
                    ),
                    const SizedBox(height: 12),
                    Consumer<PostProvider>(
                      builder: (context, provider, _) {
                        return SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            onPressed:
                                provider.isGenerating ? null : _generatePost,
                            icon: provider.isGenerating
                                ? const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  )
                                : const Icon(Icons.auto_awesome),
                            label: Text(provider.isGenerating
                                ? 'Generating...'
                                : 'Generate with AI'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.accent,
                            ),
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 16),

            // Content Editor
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Post Content',
                          style: Theme.of(context).textTheme.titleSmall,
                        ),
                        Consumer<PostProvider>(
                          builder: (context, provider, _) {
                            final len = _contentController.text.length;
                            return Text(
                              '$len / 1500',
                              style: TextStyle(
                                color: len > 1500
                                    ? AppColors.error
                                    : AppColors.textSecondary,
                                fontSize: 12,
                              ),
                            );
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _contentController,
                      maxLines: 8,
                      maxLength: 1500,
                      maxLengthEnforcement: MaxLengthEnforcement.enforced,
                      onChanged: (_) => setState(() {}),
                      decoration: const InputDecoration(
                        hintText: 'Write your LinkedIn post or generate one with AI above...',
                        counterText: '',
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 16),

            // Hashtags
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Hashtags',
                      style: Theme.of(context).textTheme.titleSmall,
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _hashtagController,
                      decoration: const InputDecoration(
                        hintText: '#AI, #Technology, #Startups',
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 16),

            // Target Selection
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Post Target',
                      style: Theme.of(context).textTheme.titleSmall,
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: _TargetOption(
                            label: 'Personal',
                            icon: Icons.person,
                            selected: _targetType == 'personal',
                            onTap: () =>
                                setState(() => _targetType = 'personal'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _TargetOption(
                            label: 'Company',
                            icon: Icons.business,
                            selected: _targetType == 'organization',
                            onTap: () =>
                                setState(() => _targetType = 'organization'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 24),

            // Action Buttons
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _saveDraft,
                    child: const Text('Save Draft'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: Consumer<PostProvider>(
                    builder: (context, provider, _) {
                      return ElevatedButton.icon(
                        onPressed:
                            provider.isLoading ? null : _publishPost,
                        icon: provider.isLoading
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Icon(Icons.send),
                        label: Text(provider.isLoading
                            ? 'Publishing...'
                            : 'Publish to LinkedIn'),
                      );
                    },
                  ),
                ),
              ],
            ),

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}

class _TargetOption extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  const _TargetOption({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: selected
              ? AppColors.primary.withAlpha(30)
              : AppColors.surfaceLight,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? AppColors.primary : AppColors.cardBorder,
            width: selected ? 2 : 1,
          ),
        ),
        child: Column(
          children: [
            Icon(
              icon,
              color: selected ? AppColors.primary : AppColors.textSecondary,
            ),
            const SizedBox(height: 6),
            Text(
              label,
              style: TextStyle(
                color: selected ? AppColors.primary : AppColors.textSecondary,
                fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
                fontSize: 13,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
