import 'package:cloud_firestore/cloud_firestore.dart';

class PostAnalytics {
  final String? analyticsId;
  final String postId;
  final int impressions;
  final int likes;
  final int comments;
  final int shares;
  final double engagementRate;
  final DateTime? updatedAt;

  PostAnalytics({
    this.analyticsId,
    required this.postId,
    this.impressions = 0,
    this.likes = 0,
    this.comments = 0,
    this.shares = 0,
    this.engagementRate = 0.0,
    this.updatedAt,
  });

  factory PostAnalytics.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>? ?? {};
    return PostAnalytics(
      analyticsId: doc.id,
      postId: data['postId'] as String? ?? '',
      impressions: data['impressions'] as int? ?? 0,
      likes: data['likes'] as int? ?? 0,
      comments: data['comments'] as int? ?? 0,
      shares: data['shares'] as int? ?? 0,
      engagementRate: (data['engagementRate'] as num?)?.toDouble() ?? 0.0,
      updatedAt: (data['updatedAt'] as Timestamp?)?.toDate(),
    );
  }

  int get totalEngagement => likes + comments + shares;
}
