import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/user_model.dart';
import '../services/firestore_service.dart';
import '../services/cloud_function_service.dart';

class AppAuthProvider extends ChangeNotifier {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirestoreService _firestoreService = FirestoreService();

  User? _user;
  AppUser? _appUser;
  bool _isLoading = true;
  String? _error;

  User? get user => _user;
  AppUser? get appUser => _appUser;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isLinkedInConnected => _appUser?.isLinkedInConnected ?? false;

  AppAuthProvider() {
    _auth.authStateChanges().listen(_onAuthStateChanged);
  }

  Future<void> _onAuthStateChanged(User? user) async {
    _user = user;
    try {
      if (user != null) {
        _appUser = await _firestoreService.getUser(user.uid);
        if (_appUser == null) {
          _appUser = AppUser(userId: user.uid);
          await _firestoreService.createOrUpdateUser(_appUser!);
        }
      } else {
        _appUser = null;
      }
    } catch (e) {
      // Firestore may fail (e.g. permission error) — still proceed with auth state
      _error = null; // don't show a cryptic error, just continue
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> signInWithEmail(String email, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      await _auth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );
      // _isLoading will be set to false by _onAuthStateChanged
    } on FirebaseAuthException catch (e) {
      _error = e.message ?? 'Authentication failed';
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = 'An unexpected error occurred. Please try again.';
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> signUpWithEmail(String email, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      await _auth.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );
      // _isLoading will be set to false by _onAuthStateChanged
    } on FirebaseAuthException catch (e) {
      _error = e.message ?? 'Registration failed';
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = 'An unexpected error occurred. Please try again.';
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> connectLinkedIn() async {
    if (_user == null) return;
    _error = null;
    try {
      final token = await _user!.getIdToken();
      final service = CloudFunctionService(token!);
      final authUrl = await service.getLinkedInAuthUrl();
      final uri = Uri.parse(authUrl);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    } catch (e) {
      _error = 'Failed to initiate LinkedIn connection';
      notifyListeners();
    }
  }

  Future<void> handleLinkedInCallback(String code) async {
    if (_user == null) return;
    _isLoading = true;
    notifyListeners();
    try {
      final token = await _user!.getIdToken();
      final service = CloudFunctionService(token!);
      await service.exchangeLinkedInCode(code);
      // Refresh user data
      _appUser = await _firestoreService.getUser(_user!.uid);
    } catch (e) {
      _error = 'Failed to connect LinkedIn account';
    }
    _isLoading = false;
    notifyListeners();
  }

  Future<void> disconnectLinkedIn() async {
    if (_user == null) return;
    try {
      final token = await _user!.getIdToken();
      final service = CloudFunctionService(token!);
      await service.disconnectLinkedIn();
      _appUser = await _firestoreService.getUser(_user!.uid);
      notifyListeners();
    } catch (e) {
      _error = 'Failed to disconnect LinkedIn';
      notifyListeners();
    }
  }

  Future<void> refreshUser() async {
    if (_user == null) return;
    _appUser = await _firestoreService.getUser(_user!.uid);
    notifyListeners();
  }

  Future<void> signOut() async {
    await _auth.signOut();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
