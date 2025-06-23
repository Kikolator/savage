import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:referral/data/referral_code.dart';
import 'package:referral/env/env.dart';

class FirestoreService {
  final FirebaseFirestore firestore;

  FirestoreService(this.firestore);

  static FirestoreService? _instance;
  static bool _isInitialized = false;

  static FirestoreService getInstance() {
    if (!_isInitialized) {
      throw StateError(
          'FirestoreService not initialised. Call initialize() first.');
    }
    return _instance!;
  }

  static Future<void> initialize() async {
    if (!_isInitialized) {
      final instance = FirebaseFirestore.instance;
      if (Env.kLocalEmulatorMode) {
        instance.useFirestoreEmulator(Env.kLocalhost, Env.kLocalFirestorePort);
      }
      _instance = FirestoreService(instance);
      _isInitialized = true;
    }
  }

  Future<List<T>> getCollection<T>({
    required String collection,
    required T Function(Map<String, dynamic> data) converter,
    Query Function(Query query)? queryBuilder,
  }) async {
    Query query = firestore.collection(collection);
    if (queryBuilder != null) {
      query = queryBuilder(query);
    }
    final snapshot = await query.get();
    return snapshot.docs
        .map((doc) => converter(doc.data() as Map<String, dynamic>))
        .toList();
  }

  Future<T?> getDocument<T>(
      {required String collection,
      required String documentId,
      required T Function(Map<String, dynamic> data) converter}) async {
    final snapshot =
        await firestore.collection(collection).doc(documentId).get();
    if (snapshot.exists) {
      return converter(snapshot.data() as Map<String, dynamic>);
    }
    return null;
  }
}
