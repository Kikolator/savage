import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { CreateDoc, SetDoc, UpdateDoc } from '../data/models';

export class FirestoreService {
  private readonly db;
  private static instance: FirestoreService;

  private constructor() {
    this.db = getFirestore();
  }

  public static getInstance(): FirestoreService {
    if (!FirestoreService.instance) {
      FirestoreService.instance = new FirestoreService();
    }
    return FirestoreService.instance;
  }

  // Create a document in firestore
  // If the document exists, it will fail.
  public async createDocument(data: CreateDoc) {
    let docRef;
    if (!data.documentId) {
      docRef = this.db.collection(data.collection).doc();
    } else {
      docRef = this.db.collection(data.collection).doc(data.documentId);
    }
    await docRef.create({
      ...data.data,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });
  }

  // Updates a document in firestore
  // If documentId is provided, updates the document with the given id
  // If document does not exist fails.
  public async updateDocument(data: UpdateDoc) {
    const docRef = this.db.collection(data.collection).doc(data.documentId);
    await docRef.update({
      ...data.data,
      updated_at: FieldValue.serverTimestamp(),
    });
  }

  // Sets a document in firestore
  // If documentId is provided, updates the document with the given id
  // If document does not exist creates a new document
  // If merge is true, only the provided fields will be updated, otherwise the entire document will be overwritten.
  // By default merge is true.
  public async setDocument(data: SetDoc) {
    let docRef;
    if (!data.documentId) {
      docRef = this.db.collection(data.collection).doc();
    } else {
      docRef = this.db.collection(data.collection).doc(data.documentId);
    }
    await docRef.set({
      ...data.data,
      updated_at: FieldValue.serverTimestamp(),
    }, { merge: data.merge || true });
  }
}
