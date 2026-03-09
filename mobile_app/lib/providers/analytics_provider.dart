import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/analytics_model.dart';
import '../services/firestore_service.dart';

class AnalyticsProvider extends ChangeNotifier {
  final FirestoreService _firestoreService = FirestoreService();

  List<PostAnalytics> _analytics = [];
  bool _isLoading = false;
  String? _error;

  List<PostAnalytics> get analytics => _analytics;
  bool get isLoading => _isLoading;
  String? get error => _error;

  int get totalImpressions =>
      _analytics.fold(0, (sum, a) => sum + a.impressions);
  int get totalLikes => _analytics.fold(0, (sum, a) => sum + a.likes);
  int get totalComments => _analytics.fold(0, (sum, a) => sum + a.comments);
  int get totalShares => _analytics.fold(0, (sum, a) => sum + a.shares);

  double get averageEngagementRate {
    if (_analytics.isEmpty) return 0.0;
    final total =
        _analytics.fold(0.0, (sum, a) => sum + a.engagementRate);
    return total / _analytics.length;
  }

  Future<void> loadAnalytics() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    _isLoading = true;
    notifyListeners();

    try {
      _analytics = await _firestoreService.getAnalytics(user.uid);
    } catch (e) {
      _error = 'Failed to load analytics';
    }

    _isLoading = false;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
