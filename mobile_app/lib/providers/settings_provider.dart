import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../services/firestore_service.dart';
import '../services/cloud_function_service.dart';

class SettingsProvider extends ChangeNotifier {
  final FirestoreService _firestoreService = FirestoreService();

  bool _automationEnabled = false;
  String _postingTime = '09:00';
  String _targetType = 'personal';
  String? _selectedOrgId;
  String _dailyTopic = '';
  bool _isLoading = false;
  bool _isSaving = false;
  String? _error;

  bool get automationEnabled => _automationEnabled;
  String get postingTime => _postingTime;
  String get targetType => _targetType;
  String? get selectedOrgId => _selectedOrgId;
  String get dailyTopic => _dailyTopic;
  bool get isLoading => _isLoading;
  bool get isSaving => _isSaving;
  String? get error => _error;

  Future<void> loadSettings() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    _isLoading = true;
    notifyListeners();

    try {
      final appUser = await _firestoreService.getUser(user.uid);
      if (appUser != null) {
        _automationEnabled = appUser.automationEnabled;
        _postingTime = appUser.postingTime ?? '09:00';
        _targetType = appUser.targetType;
        _dailyTopic = appUser.dailyTopic ?? '';
        _selectedOrgId = appUser.selectedOrganizationId ??
          (appUser.organizationIds.isNotEmpty
            ? appUser.organizationIds.first
          : null);
      }
    } catch (e) {
      _error = 'Failed to load settings';
    }

    _isLoading = false;
    notifyListeners();
  }

  void setAutomationEnabled(bool value) {
    _automationEnabled = value;
    notifyListeners();
  }

  void setPostingTime(String time) {
    _postingTime = time;
    notifyListeners();
  }

  void setTargetType(String type) {
    _targetType = type;
    notifyListeners();
  }

  void setSelectedOrgId(String? orgId) {
    _selectedOrgId = orgId;
    notifyListeners();
  }

  void setDailyTopic(String topic) {
    _dailyTopic = topic;
    notifyListeners();
  }

  Future<void> saveSettings() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    _isSaving = true;
    _error = null;
    notifyListeners();

    try {
      // Update Firestore
      await _firestoreService.updateUserSettings(user.uid, {
        'automationEnabled': _automationEnabled,
        'postingTime': _postingTime,
        'targetType': _targetType,
        'dailyTopic': _dailyTopic,
        'selectedOrganizationId': _selectedOrgId,
        'organizationIds': _selectedOrgId != null && _selectedOrgId!.isNotEmpty
            ? [_selectedOrgId]
            : [],
      });

      // Update Cloud Function scheduler
      final token = await user.getIdToken();
      final service = CloudFunctionService(token!);
      await service.updateAutomationSettings(
        enabled: _automationEnabled,
        postingTime: _postingTime,
        targetType: _targetType,
        organizationId: _selectedOrgId,
        dailyTopic: _dailyTopic,
      );
    } catch (e) {
      _error = 'Failed to save settings';
    }

    _isSaving = false;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
