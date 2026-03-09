import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions are not configured for this platform.',
        );
    }
  }

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyBSqa7COIy6Ez78h7g1uFhH-j28SlHDONM',
    appId: '1:546955373171:android:d686e340e6804685565806',
    messagingSenderId: '546955373171',
    projectId: 'studio-1013588681-626a8',
    storageBucket: 'studio-1013588681-626a8.firebasestorage.app',
  );
}
