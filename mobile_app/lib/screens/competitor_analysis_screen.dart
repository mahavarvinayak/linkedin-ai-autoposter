import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/post_provider.dart';
import '../providers/auth_provider.dart';
import '../theme/app_theme.dart';

class CompetitorAnalysisScreen extends StatefulWidget {
  const CompetitorAnalysisScreen({super.key});

  @override
  State<CompetitorAnalysisScreen> createState() => _CompetitorAnalysisScreenState();
}

class _CompetitorAnalysisScreenState extends State<CompetitorAnalysisScreen> {
  final _competitorTextController = TextEditingController();
  final _topicController = TextEditingController();

  @override
  void dispose() {
    _competitorTextController.dispose();
    _topicController.dispose();
    super.dispose();
  }

  Future<void> _analyzeAndGenerate() async {
    if (_competitorTextController.text.trim().isEmpty || _topicController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter both competitor content and your topic')),
      );
      return;
    }

    final provider = context.read<PostProvider>();
    await provider.analyzeCompetitor(
      competitorContent: _competitorTextController.text.trim(),
      topic: _topicController.text.trim(),
    );

    if (provider.error != null && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(provider.error!)),
      );
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Post generated successfully! Check the Create tab.'),
          backgroundColor: AppColors.success,
        ),
      );
      // Optional: Navigate to Create tab or pass the generated content
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
              'Competitor Analysis',
              style: Theme.of(context)
                  .textTheme
                  .headlineSmall
                  ?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              'Generate posts mimicking a competitor\'s style',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppColors.textSecondary,
                  ),
            ),
            const SizedBox(height: 24),

            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.person_search, color: AppColors.primary, size: 20),
                        const SizedBox(width: 8),
                        Text(
                          '1. Competitor\'s Content',
                          style: Theme.of(context).textTheme.titleSmall,
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _competitorTextController,
                      maxLines: 5,
                      decoration: const InputDecoration(
                        hintText: 'Paste 2-3 viral posts from your competitor here...',
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 16),

            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.topic, color: AppColors.accent, size: 20),
                        const SizedBox(width: 8),
                        Text(
                          '2. Your New Topic',
                          style: Theme.of(context).textTheme.titleSmall,
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _topicController,
                      decoration: const InputDecoration(
                        hintText: 'What should the AI write about using their style?',
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 24),

            Consumer<PostProvider>(
              builder: (context, provider, _) {
                return SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: provider.isGenerating ? null : _analyzeAndGenerate,
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
                        ? 'Analyzing & Generating...'
                        : 'Analyze & Generate Post'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                  ),
                );
              },
            ),
            
            const SizedBox(height: 24),
            
            Consumer<PostProvider>(
              builder: (context, provider, _) {
                if (provider.generatedContent == null || provider.generatedContent!.isEmpty) {
                  return const SizedBox.shrink();
                }
                
                return Card(
                  color: AppColors.surfaceLight,
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Generated Result',
                          style: Theme.of(context).textTheme.titleSmall?.copyWith(color: AppColors.accent),
                        ),
                        const SizedBox(height: 12),
                        SelectableText(
                          provider.generatedContent!,
                          style: const TextStyle(height: 1.5),
                        ),
                        if (provider.generatedHashtags.isNotEmpty) ...[
                          const SizedBox(height: 12),
                          SelectableText(
                            provider.generatedHashtags.map((h) => '#$h').join(' '),
                            style: const TextStyle(color: AppColors.accent),
                          ),
                        ]
                      ],
                    ),
                  ),
                );
              },
            ),
            
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}
