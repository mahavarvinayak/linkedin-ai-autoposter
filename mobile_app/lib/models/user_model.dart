import 'package:cloud_firestore/cloud_firestore.dart';

class AppUser {
  final String userId;
  final String? linkedinId;
  final List<String> organizationIds;
  final String? selectedOrganizationId;
  final String? aiProvider;
  final String? postingTime;
  final bool automationEnabled;
  final String targetType; // 'personal' or 'organization'
  final String? dailyTopic;

  AppUser({
    required this.userId,
    this.linkedinId,
    this.organizationIds = const [],
    this.selectedOrganizationId,
    this.aiProvider = 'gemini',
    this.postingTime = '09:00',
    this.automationEnabled = false,
    this.targetType = 'personal',
    this.dailyTopic,
  });

  factory AppUser.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>? ?? {};
    return AppUser(
      userId: doc.id,
      linkedinId: data['linkedinId'] as String?,
      organizationIds: List<String>.from(data['organizationIds'] ?? []),
      selectedOrganizationId: data['selectedOrganizationId'] as String?,
      aiProvider: data['aiProvider'] as String? ?? 'gemini',
      postingTime: data['postingTime'] as String? ?? '09:00',
      automationEnabled: data['automationEnabled'] as bool? ?? false,
      targetType: data['targetType'] as String? ?? 'personal',
      dailyTopic: data['dailyTopic'] as String?,
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'userId': userId,
      'linkedinId': linkedinId,
      'organizationIds': organizationIds,
      'selectedOrganizationId': selectedOrganizationId,
      'aiProvider': aiProvider,
      'postingTime': postingTime,
      'automationEnabled': automationEnabled,
      'targetType': targetType,
      'dailyTopic': dailyTopic,
    };
  }

  bool get isLinkedInConnected => linkedinId != null && linkedinId!.isNotEmpty;
}
