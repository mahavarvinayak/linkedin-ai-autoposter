import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/user_model.dart';
import '../models/post_model.dart';
import '../models/analytics_model.dart';

class FirestoreService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  // --- User Operations ---

  Future<AppUser?> getUser(String userId) async {
    final doc = await _db.collection('users').doc(userId).get();
    if (!doc.exists) return null;
    return AppUser.fromFirestore(doc);
  }

  Future<void> createOrUpdateUser(AppUser user) async {
    await _db.collection('users').doc(user.userId).set(
          user.toFirestore(),
          SetOptions(merge: true),
        );
  }

  Future<void> updateUserSettings(String userId, Map<String, dynamic> data) async {
    await _db.collection('users').doc(userId).set(data, SetOptions(merge: true));
  }

  Stream<AppUser?> userStream(String userId) {
    return _db.collection('users').doc(userId).snapshots().map((doc) {
      if (!doc.exists) return null;
      return AppUser.fromFirestore(doc);
    });
  }

  // --- Post Operations ---

  Future<String> createPost(String userId, Post post) async {
    final docRef = await _db
        .collection('users')
        .doc(userId)
        .collection('posts')
        .add(post.toFirestore());
    return docRef.id;
  }

  Future<void> updatePost(String userId, String postId, Map<String, dynamic> data) async {
    await _db
        .collection('users')
        .doc(userId)
        .collection('posts')
        .doc(postId)
        .update(data);
  }

  Future<void> deletePost(String userId, String postId) async {
    await _db
        .collection('users')
        .doc(userId)
        .collection('posts')
        .doc(postId)
        .delete();
  }

  Stream<List<Post>> postsStream(String userId) {
    return _db
        .collection('users')
        .doc(userId)
        .collection('posts')
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => Post.fromFirestore(doc)).toList());
  }

  Future<List<Post>> getPosts(String userId, {int limit = 20}) async {
    final snapshot = await _db
        .collection('users')
        .doc(userId)
        .collection('posts')
        .orderBy('createdAt', descending: true)
        .limit(limit)
        .get();
    return snapshot.docs.map((doc) => Post.fromFirestore(doc)).toList();
  }

  Future<Post?> getNextScheduledPost(String userId) async {
    final snapshot = await _db
        .collection('users')
        .doc(userId)
        .collection('posts')
        .where('status', isEqualTo: 'scheduled')
        .orderBy('scheduledTime')
        .limit(1)
        .get();
    if (snapshot.docs.isEmpty) return null;
    return Post.fromFirestore(snapshot.docs.first);
  }

  // --- Analytics Operations ---

  Stream<List<PostAnalytics>> analyticsStream(String userId) {
    return _db
        .collection('users')
        .doc(userId)
        .collection('analytics')
        .orderBy('updatedAt', descending: true)
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => PostAnalytics.fromFirestore(doc)).toList());
  }

  Future<List<PostAnalytics>> getAnalytics(String userId) async {
    final snapshot = await _db
        .collection('users')
        .doc(userId)
        .collection('analytics')
        .orderBy('updatedAt', descending: true)
        .get();
    return snapshot.docs.map((doc) => PostAnalytics.fromFirestore(doc)).toList();
  }

  // --- Stats ---

  Future<int> getTotalPostsCount(String userId) async {
    final snapshot = await _db
        .collection('users')
        .doc(userId)
        .collection('posts')
        .where('status', isEqualTo: 'posted')
        .count()
        .get();
    return snapshot.count ?? 0;
  }
}
