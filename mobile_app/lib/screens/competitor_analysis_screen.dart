import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
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
  File? _selectedScreenshot;
  final _picker = ImagePicker();

  @override
  void dispose() {
    _competitorTextController.dispose();
    _topicController.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    final pickedFile = await _picker.pickImage(source: ImageSource.gallery);
    if (pickedFile != null) {
      setState(() {
        _selectedScreenshot = File(pickedFile.path);
      });
    }
  }

  Future<void> _analyzeAndGenerate() async {
    if ((_competitorTextController.text.trim().isEmpty && _selectedScreenshot == null) || 
        _topicController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter competitor content/screenshot and your topic')),
      );
      return;
    }

    String? base64Screenshot;
    if (_selectedScreenshot != null) {
      final bytes = await _selectedScreenshot!.readAsBytes();
      final mimeType = 'image/${_selectedScreenshot!.path.split('.').last}';
      base64Screenshot = 'data:$mimeType;base64,${base64Encode(bytes)}';
    }

    final provider = context.read<PostProvider>();
    await provider.analyzeCompetitor(
      competitorContent: _competitorTextController.text.trim(),
      topic: _topicController.text.trim(),
      screenshotData: base64Screenshot,
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
                    const SizedBox(height: 16),
                    const Center(child: Text('OR', style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.textSecondary))),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: _pickImage,
                        icon: const Icon(Icons.add_a_photo_outlined),
                        label: Text(_selectedScreenshot == null ? 'Upload Screenshot of Post' : 'Change Screenshot'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.primary,
                          side: const BorderSide(color: AppColors.primary),
                        ),
                      ),
                    ),
                    if (_selectedScreenshot != null) ...[
                      const SizedBox(height: 12),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Stack(
                          children: [
                            Image.file(
                              _selectedScreenshot!,
                              height: 150,
                              width: double.infinity,
                              fit: BoxFit.cover,
                            ),
                            Positioned(
                              top: 8,
                              right: 8,
                              child: GestureDetector(
                                onTap: () => setState(() => _selectedScreenshot = null),
                                child: Container(
                                  padding: const EdgeInsets.all(4),
                                  decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
                                  child: const Icon(Icons.close, size: 16, color: Colors.white),
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
