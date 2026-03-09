import 'package:cloud_firestore/cloud_firestore.dart';

class Post {
  final String? postId;
  final String content;
  final List<String> hashtags;
  final String targetType; // 'personal' or 'organization'
  final DateTime? scheduledTime;
  final String status; // 'draft', 'scheduled', 'posted', 'failed'
  final String? linkedinPostUrn;
  final DateTime? createdAt;
  final String? errorMessage;

  Post({
    this.postId,
    required this.content,
    this.hashtags = const [],
    this.targetType = 'personal',
    this.scheduledTime,
    this.status = 'draft',
    this.linkedinPostUrn,
    this.createdAt,
    this.errorMessage,
  });

  factory Post.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>? ?? {};
    return Post(
      postId: doc.id,
      content: data['content'] as String? ?? '',
      hashtags: List<String>.from(data['hashtags'] ?? []),
      targetType: data['targetType'] as String? ?? 'personal',
      scheduledTime: (data['scheduledTime'] as Timestamp?)?.toDate(),
      status: data['status'] as String? ?? 'draft',
      linkedinPostUrn: data['linkedinPostUrn'] as String?,
      createdAt: (data['createdAt'] as Timestamp?)?.toDate(),
      errorMessage: data['errorMessage'] as String?,
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'content': content,
      'hashtags': hashtags,
      'targetType': targetType,
      'scheduledTime': scheduledTime != null
          ? Timestamp.fromDate(scheduledTime!)
          : null,
      'status': status,
      'linkedinPostUrn': linkedinPostUrn,
      'createdAt': createdAt != null
          ? Timestamp.fromDate(createdAt!)
          : FieldValue.serverTimestamp(),
      'errorMessage': errorMessage,
    };
  }

  String get fullContent {
    final hashtagStr = hashtags.map((h) => h.startsWith('#') ? h : '#$h').join(' ');
    return '$content\n\n$hashtagStr';
  }
}
