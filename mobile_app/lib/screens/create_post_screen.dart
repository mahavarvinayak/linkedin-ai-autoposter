import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:convert';
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

  Future<void> _generateImage() async {
    final provider = context.read<PostProvider>();
    final topic = _topicController.text.trim();
    final content = _contentController.text.trim();
    
    if (topic.isEmpty && content.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a topic or content first')),
      );
      return;
    }

    await provider.generateAIImage(topic: topic.isNotEmpty ? topic : content);

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
      imageUrl: provider.generatedImageUrl,
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
                        return Column(
                          children: [
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton.icon(
                                onPressed: provider.isGenerating ? null : _generatePost,
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
                                    ? 'Generating Text...'
                                    : 'Generate Text with AI'),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.accent,
                                ),
                              ),
                            ),
                            const SizedBox(height: 8),
                            SizedBox(
                              width: double.infinity,
                              child: OutlinedButton.icon(
                                onPressed: provider.isGenerating ? null : _generateImage,
                                icon: const Icon(Icons.image_outlined),
                                label: const Text('Generate Relevant Image'),
                              ),
                            ),
                          ],
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 16),

            // Live Preview Card
            Consumer<PostProvider>(
              builder: (context, provider, _) {
                if (_contentController.text.isEmpty && provider.generatedImageUrl == null && !provider.isGenerating) {
                  return const SizedBox.shrink();
                }
                
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(left: 4, bottom: 8),
                      child: Text(
                        'Live Preview',
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          color: AppColors.primary,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    Card(
                      elevation: 4,
                      shadowColor: Colors.black26,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: BorderSide(color: AppColors.cardBorder.withAlpha(100)),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                CircleAvatar(
                                  radius: 20,
                                  backgroundColor: AppColors.surfaceLight,
                                  child: const Icon(Icons.person, color: AppColors.textSecondary),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text(
                                        'You',
                                        style: TextStyle(fontWeight: FontWeight.bold),
                                      ),
                                      Text(
                                        'LinkedIn Post • Public',
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: AppColors.textSecondary,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const Icon(Icons.more_horiz, color: AppColors.textSecondary),
                              ],
                            ),
                            const SizedBox(height: 12),
                            ValueListenableBuilder(
                              valueListenable: _contentController,
                              builder: (context, value, _) {
                                return Text(
                                  value.text.isEmpty 
                                    ? 'Your post content will appear here...'
                                    : value.text,
                                  style: const TextStyle(fontSize: 14),
                                );
                              }
                            ),
                            if (provider.generatedImageUrl != null || provider.isGenerating) ...[
                              const SizedBox(height: 12),
                              ClipRRect(
                                borderRadius: BorderRadius.circular(12),
                                child: provider.isGenerating && provider.generatedImageUrl == null
                                    ? Container(
                                        height: 250,
                                        width: double.infinity,
                                        decoration: BoxDecoration(
                                          color: AppColors.surfaceLight,
                                          borderRadius: BorderRadius.circular(12),
                                          border: Border.all(color: AppColors.cardBorder),
                                        ),
                                        child: const Center(
                                          child: Column(
                                            mainAxisAlignment: MainAxisAlignment.center,
                                            children: [
                                              CircularProgressIndicator(),
                                              SizedBox(height: 12),
                                              Text('Designing your image...', style: TextStyle(color: AppColors.textSecondary)),
                                            ],
                                          ),
                                        ),
                                      )
                                    : provider.generatedImageUrl != null
                                        ? Stack(
                                            children: [
                                              provider.generatedImageUrl!.startsWith('data:image')
                                                  ? Image.memory(
                                                      base64Decode(provider.generatedImageUrl!.split(',').last),
                                                      width: double.infinity,
                                                      fit: BoxFit.contain,
                                                    )
                                                  : Image.network(
                                                      provider.generatedImageUrl!,
                                                      width: double.infinity,
                                                      fit: BoxFit.contain,
                                                      loadingBuilder: (context, child, loadingProgress) {
                                                        if (loadingProgress == null) return child;
                                                        final progress = loadingProgress.expectedTotalBytes != null
                                                            ? loadingProgress.cumulativeBytesLoaded / loadingProgress.expectedTotalBytes!
                                                            : null;
                                                        return Container(
                                                          height: 250,
                                                          width: double.infinity,
                                                          color: AppColors.surfaceLight,
                                                          child: Center(
                                                            child: Column(
                                                              mainAxisAlignment: MainAxisAlignment.center,
                                                              children: [
                                                                CircularProgressIndicator(value: progress),
                                                                const SizedBox(height: 8),
                                                                const Text('Loading image...',
                                                                    style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                                                              ],
                                                            ),
                                                          ),
                                                        );
                                                      },
                                                      errorBuilder: (context, error, stackTrace) {
                                                        return Container(
                                                          height: 250,
                                                          width: double.infinity,
                                                          color: AppColors.surfaceLight,
                                                          child: const Center(
                                                            child: Column(
                                                              mainAxisAlignment: MainAxisAlignment.center,
                                                              children: [
                                                                Icon(Icons.broken_image, color: Colors.red, size: 40),
                                                                SizedBox(height: 12),
                                                                Text('Image failed to load',
                                                                    style: TextStyle(color: AppColors.textSecondary)),
                                                              ],
                                                            ),
                                                          ),
                                                        );
                                                      },
                                                    ),
                                              Positioned(
                                                top: 12,
                                                right: 12,
                                                child: GestureDetector(
                                                  onTap: () => provider.clearGenerated(),
                                                  child: Container(
                                                    padding: const EdgeInsets.all(6),
                                                    decoration: const BoxDecoration(
                                                      color: Colors.black54,
                                                      shape: BoxShape.circle,
                                                    ),
                                                    child: const Icon(Icons.close, size: 20, color: Colors.white),
                                                  ),
                                                ),
                                              ),
                                            ],
                                          )
                                        : const SizedBox.shrink(),
                              ),
                            ],
                            const SizedBox(height: 12),
                            const Divider(height: 1),
                            const SizedBox(height: 8),
                            const Row(
                              mainAxisAlignment: MainAxisAlignment.spaceAround,
                              children: [
                                _MockAction(icon: Icons.thumb_up_outlined, label: 'Like'),
                                _MockAction(icon: Icons.comment_outlined, label: 'Comment'),
                                _MockAction(icon: Icons.share_outlined, label: 'Share'),
                                _MockAction(icon: Icons.send_outlined, label: 'Send'),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                );
              },
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

class _MockAction extends StatelessWidget {
  final IconData icon;
  final String label;

  const _MockAction({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 16, color: AppColors.textSecondary),
        const SizedBox(width: 4),
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            color: AppColors.textSecondary,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}
