import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/post_model.dart';
import '../services/firestore_service.dart';
import '../services/cloud_function_service.dart';

class PostProvider extends ChangeNotifier {
  final FirestoreService _firestoreService = FirestoreService();

  List<Post> _posts = [];
  Post? _nextScheduledPost;
  bool _isLoading = false;
  bool _isGenerating = false;
  String? _error;
  String? _generatedContent;
  List<String> _generatedHashtags = [];

  List<Post> get posts => _posts;
  Post? get nextScheduledPost => _nextScheduledPost;
  bool get isLoading => _isLoading;
  bool get isGenerating => _isGenerating;
  String? get error => _error;
  String? get generatedContent => _generatedContent;
  List<String> get generatedHashtags => _generatedHashtags;

  int get totalPosted => _posts.where((p) => p.status == 'posted').length;
  int get totalScheduled => _posts.where((p) => p.status == 'scheduled').length;
  int get totalDrafts => _posts.where((p) => p.status == 'draft').length;

  Future<void> loadPosts() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    _isLoading = true;
    notifyListeners();

    try {
      _posts = await _firestoreService.getPosts(user.uid);
      _nextScheduledPost = await _firestoreService.getNextScheduledPost(user.uid);
    } catch (e) {
      _error = 'Failed to load posts';
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> generateAIPost({required String topic}) async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    _isGenerating = true;
    _error = null;
    notifyListeners();

    try {
      final token = await user.getIdToken();
      final service = CloudFunctionService(token!);
      final result = await service.generateAIPost(topic: topic);

      _generatedContent = result['caption'] as String?;
      _generatedHashtags = List<String>.from(result['hashtags'] ?? []);
    } catch (e) {
      _error = 'Failed to generate post';
    }

    _isGenerating = false;
    notifyListeners();
  }

  Future<void> analyzeCompetitor({
    required String competitorContent,
    required String topic,
  }) async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    _isGenerating = true;
    _error = null;
    notifyListeners();

    try {
      final token = await user.getIdToken();
      final service = CloudFunctionService(token!);
      final result = await service.analyzeCompetitor(
        competitorContent: competitorContent,
        topic: topic,
      );

      _generatedContent = result['caption'] as String?;
      _generatedHashtags = List<String>.from(result['hashtags'] ?? []);
    } catch (e) {
      _error = 'Failed to analyze competitor';
    }

    _isGenerating = false;
    notifyListeners();
  }

  Future<void> savePost({
    required String content,
    required List<String> hashtags,
    required String targetType,
    required String status,
    DateTime? scheduledTime,
  }) async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    _isLoading = true;
    notifyListeners();

    try {
      final post = Post(
        content: content,
        hashtags: hashtags,
        targetType: targetType,
        status: status,
        scheduledTime: scheduledTime,
      );
      await _firestoreService.createPost(user.uid, post);
      await loadPosts();
    } catch (e) {
      _error = 'Failed to save post';
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> publishPost({
    required String content,
    required String targetType,
    String? organizationId,
  }) async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final token = await user.getIdToken();
      final service = CloudFunctionService(token!);
      final result = await service.publishToLinkedIn(
        content: content,
        targetType: targetType,
        organizationId: organizationId,
      );

      // Save the post with the LinkedIn URN
      final post = Post(
        content: content,
        targetType: targetType,
        status: 'posted',
        linkedinPostUrn: result['postUrn'] as String?,
      );
      await _firestoreService.createPost(user.uid, post);
      await loadPosts();
    } catch (e) {
      _error = 'Failed to publish post';
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> deletePost(String postId) async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    try {
      await _firestoreService.deletePost(user.uid, postId);
      await loadPosts();
    } catch (e) {
      _error = 'Failed to delete post';
      notifyListeners();
    }
  }

  void clearGenerated() {
    _generatedContent = null;
    _generatedHashtags = [];
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
