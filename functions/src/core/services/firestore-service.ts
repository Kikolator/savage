import {
  getFirestore,
  FieldValue,
  Firestore,
  DocumentData,
  QuerySnapshot,
  WhereFilterOp,
  DocumentReference,
  Transaction,
  WriteBatch,
} from 'firebase-admin/firestore';
import {logger} from 'firebase-functions';

import {CreateDoc, SetDoc, UpdateDoc} from '../data/models';
import {AppError, ErrorCode} from '../errors/app-error';

export class FirestoreService {
  private db: Firestore | null = null;
  private static instance: FirestoreService;

  private constructor() {
    // Empty constructor, initialization will happen lazily.
  }

  public static getInstance(): FirestoreService {
    if (!FirestoreService.instance) {
      FirestoreService.instance = new FirestoreService();
    }
    return FirestoreService.instance;
  }

  private getDb(): Firestore {
    if (!this.db) {
      this.db = getFirestore();
    }
    return this.db;
  }

  // Create a document in firestore
  // If the document exists, it will fail.
  public async createDocument(data: CreateDoc) {
    logger.info(
      'FirestoreService.createDocument()- creating document in Firestore.',
      {
        collection: data.collection,
        documentId: data.documentId,
      }
    );
    const db = this.getDb();
    let docRef;
    if (!data.documentId) {
      docRef = db.collection(data.collection).doc();
    } else {
      docRef = db.collection(data.collection).doc(data.documentId);
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
    logger.info([
      'FirestoreService.updateDocument()- updating document in Firestore.',
      {
        collection: data.collection,
        documentId: data.documentId,
      },
    ]);
    const db = this.getDb();
    const docRef = db.collection(data.collection).doc(data.documentId);
    await docRef.update({
      ...data.data,
      updated_at: FieldValue.serverTimestamp(),
    });
  }

  // Set multiple documents in a batch.
  public async updateDocuments(data: UpdateDoc[]) {
    logger.info([
      'FirestoreService.updateDocuments()- updating documents in Firestore.',
      {
        amount: data.length,
        data: data,
      },
    ]);
    const db = this.getDb();
    const batch = db.batch();
    data.forEach((doc) => {
      let docRef;
      if (!doc.documentId) {
        docRef = db.collection(doc.collection).doc();
      } else {
        docRef = db.collection(doc.collection).doc(doc.documentId);
      }
      batch.update(docRef, {
        ...doc.data,
        updated_at: FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();
  }

  // Sets a document in firestore
  // If documentId is provided, updates the document with the given id
  // If document does not exist creates a new document
  // If merge is true, only the provided fields will be updated, otherwise the entire document will be overwritten.
  // By default merge is true.
  public async setDocument(data: SetDoc) {
    logger.info([
      'FirestoreService.setDocument()- setting document in Firestore.',
      {
        collection: data.collection,
        documentId: data.documentId,
        merge: data.merge,
      },
    ]);
    const db = this.getDb();
    let docRef;
    if (!data.documentId) {
      docRef = db.collection(data.collection).doc();
    } else {
      docRef = db.collection(data.collection).doc(data.documentId);
    }
    await docRef.set(
      {
        ...data.data,
        updated_at: FieldValue.serverTimestamp(),
      },
      {merge: data.merge || true}
    );
  }

  // Set multiple documents in a batch.
  public async setDocuments(data: SetDoc[]) {
    logger.info([
      'FirestoreService.setDocuments()- setting documents in Firestore.',
      {
        amount: data.length,
        data: data,
      },
    ]);
    const db = this.getDb();
    const batch = db.batch();
    data.forEach((doc) => {
      let docRef;
      if (!doc.documentId) {
        docRef = db.collection(doc.collection).doc();
      } else {
        docRef = db.collection(doc.collection).doc(doc.documentId);
      }
      batch.set(
        docRef,
        {
          ...doc.data,
          updated_at: FieldValue.serverTimestamp(),
        },
        {merge: doc.merge || true}
      );
    });
    await batch.commit();
  }

  // Gets a document from firestore
  public async getDocument(
    collection: string,
    documentId: string
  ): Promise<DocumentData> {
    logger.info([
      'FirestoreService.getDocument()- getting document from Firestore.',
      {
        collection: collection,
        documentId: documentId,
      },
    ]);
    const db = this.getDb();
    const docRef = db.collection(collection).doc(documentId);
    const doc = await docRef.get();
    const data = doc.data();
    if (!data) {
      throw new AppError(
        'Document not found',
        ErrorCode.DOCUMENT_NOT_FOUND,
        404,
        {
          collection: collection,
          documentId: documentId,
        }
      );
    }
    return data;
  }

  public async getCollection(
    collection: string,
    isSubCollection = false,
    documentId?: string,
    subCollection?: string
  ): Promise<Array<DocumentData>> {
    logger.info([
      'FirestoreService.getCollection()- getting collection from Firestore.',
      {
        collection: collection,
        isSubCollection: isSubCollection,
        documentId: documentId,
        subCollection: subCollection,
      },
    ]);
    const db = this.getDb();
    if (isSubCollection) {
      // Check documentId and subCollection are provided.
      if (!documentId || !subCollection) {
        throw new AppError(
          'FirestoreService.getCollection()- documentId and subCollection are required when isSubCollection is true.',
          ErrorCode.VALIDATION_ERROR,
          400,
          {
            collection: collection,
            documentId: documentId,
            subCollection: subCollection,
          }
        );
      }
      const querySnapshot = await db
        .collection(collection)
        .doc(documentId)
        .collection(subCollection)
        .get();
      const result: Array<DocumentData> = [];
      querySnapshot.docs.map((doc) => result.push(doc.data()));
      if (result.length === 0) {
        throw new AppError(
          'FirestoreService.getCollection()- collection is empty.',
          ErrorCode.COLLECTION_EMPTY,
          404,
          {
            collection: collection,
            documentId: documentId,
            subCollection: subCollection,
          }
        );
      }
      return result;
    } else {
      const querySnapshot = await db.collection(collection).get();
      return querySnapshot.docs.map((doc) => doc.data());
    }
  }

  public async queryCollection(
    collection: string,
    filters: {
      field: string;
      operator: WhereFilterOp;
      value: string | number | boolean;
    }[]
  ): Promise<Array<DocumentData>> {
    logger.info([
      'FirestoreService.queryCollection()- querying collection from Firestore.',
      {
        collection: collection,
        filters: filters,
      },
    ]);
    const db = this.getDb();
    let query:
      | ReturnType<typeof db.collection>
      | ReturnType<ReturnType<typeof db.collection>['where']> =
      db.collection(collection);

    filters.forEach((filter) => {
      query = query.where(filter.field, filter.operator, filter.value);
    });

    const querySnapshot: QuerySnapshot<DocumentData> = await query.get();
    return querySnapshot.docs.map((doc) => doc.data());
  }

  public createReference(collection: string): DocumentReference {
    const db = this.getDb();
    return db.collection(collection).doc();
  }

  public async runBatch(batch: (batch: WriteBatch) => Promise<void>) {
    logger.info('FirestoreService.runBatch()- starting batch operation');
    const db = this.getDb();
    const writeBatch = db.batch();

    try {
      await batch(writeBatch);
      await writeBatch.commit();
      logger.info(
        'FirestoreService.runBatch()- batch operation completed successfully'
      );
    } catch (error) {
      logger.error(
        'FirestoreService.runBatch()- batch operation failed',
        error
      );
      throw error;
    }
  }

  /**
   * Runs a transaction that ensures atomicity and prevents data races.
   * The transaction function receives a transaction object that should be used
   * for all Firestore operations within the transaction.
   * @param updateFunction - Function that performs the transaction operations
   * @returns The result of the transaction function
   */
  public async runTransaction<T>(
    updateFunction: (transaction: Transaction) => Promise<T>
  ): Promise<T> {
    logger.info('FirestoreService.runTransaction()- starting transaction');
    const db = this.getDb();

    try {
      const result = await db.runTransaction(updateFunction);
      logger.info(
        'FirestoreService.runTransaction()- transaction completed successfully'
      );
      return result;
    } catch (error) {
      logger.error(
        'FirestoreService.runTransaction()- transaction failed',
        error
      );
      throw error;
    }
  }

  /**
   * Gets the Firestore database instance.
   * This method is public to allow access to the database instance for transactions.
   * @returns The Firestore database instance
   */
  public getFirestoreInstance(): Firestore {
    return this.getDb();
  }

  /**
   * Gets the FieldValue utility for server timestamps.
   * @returns The FieldValue utility
   */
  public getFieldValue(): typeof FieldValue {
    return FieldValue;
  }
}
