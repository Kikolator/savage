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
  Timestamp,
} from 'firebase-admin/firestore';

import {CreateDoc, SetDoc, UpdateDoc} from '../data/models';
import {FirestoreServiceError, FirestoreErrorCode} from '../errors';

import {BaseService} from './base-service';

export class FirestoreService extends BaseService {
  private db: Firestore | null = null;
  private static instance: FirestoreService | null = null;

  private constructor() {
    super();
  }

  public static getInstance(): FirestoreService {
    if (!FirestoreService.instance) {
      FirestoreService.instance = new FirestoreService();
    }
    return FirestoreService.instance;
  }

  public static reset(): void {
    FirestoreService.instance = null;
  }

  /**
   * Perform Firestore initialization
   */
  protected async performInitialization(): Promise<void> {
    // Firestore is initialized lazily when first accessed
    this.getDb();
  }

  private getDb(): Firestore {
    if (!this.db) {
      this.db = getFirestore();
    }
    return this.db;
  }

  /**
   * Creates a document in Firestore.
   * If the document exists, it will fail.
   * @param data - The document creation data
   */
  public async createDocument(data: CreateDoc) {
    const methodName = 'createDocument';
    this.logMethodEntry(methodName, {
      collection: data.collection,
      documentId: data.documentId,
    });

    try {
      await this.ensureInitialized();
      const db = this.getDb();
      let docRef;
      if (!data.documentId) {
        docRef = db.collection(data.collection).doc();
      } else {
        docRef = db.collection(data.collection).doc(data.documentId);
      }
      await docRef.create({
        ...data.data,
        created_at: this.getServerTimestamp(),
        updated_at: this.getServerTimestamp(),
      });
      this.logMethodSuccess(methodName);
    } catch (error) {
      this.logMethodError(methodName, error as Error);

      // Transform Firestore errors to provide better context
      if (error instanceof Error) {
        if (error.message.includes('ALREADY_EXISTS')) {
          throw FirestoreServiceError.documentCreationFailed(
            data.collection,
            data.documentId || 'auto-generated',
            error
          );
        }
        if (error.message.includes('PERMISSION_DENIED')) {
          throw FirestoreServiceError.permissionDenied(
            'create',
            data.collection,
            error
          );
        }
        // For other unexpected errors, wrap them in a FirestoreServiceError
        throw new FirestoreServiceError(
          `Failed to create document in collection '${data.collection}'`,
          FirestoreErrorCode.DOCUMENT_CREATION_FAILED,
          500,
          {collection: data.collection, documentId: data.documentId},
          error
        );
      }
      throw error;
    }
  }

  /**
   * Updates a document in Firestore.
   * If document does not exist, it will fail.
   * @param data - The document update data
   */
  public async updateDocument(data: UpdateDoc) {
    const methodName = 'updateDocument';
    this.logMethodEntry(methodName, {
      collection: data.collection,
      documentId: data.documentId,
    });

    try {
      await this.ensureInitialized();
      const db = this.getDb();
      const docRef = db.collection(data.collection).doc(data.documentId);
      await docRef.update({
        ...data.data,
        updated_at: this.getServerTimestamp(),
      });
      this.logMethodSuccess(methodName);
    } catch (error) {
      this.logMethodError(methodName, error as Error);

      // Transform Firestore errors to provide better context
      if (error instanceof Error) {
        if (error.message.includes('NOT_FOUND')) {
          throw FirestoreServiceError.documentNotFound(
            data.collection,
            data.documentId,
            error
          );
        }
        if (error.message.includes('PERMISSION_DENIED')) {
          throw FirestoreServiceError.permissionDenied(
            'update',
            data.collection,
            error
          );
        }
        // For other unexpected errors, wrap them in a FirestoreServiceError
        throw new FirestoreServiceError(
          `Failed to update document in collection '${data.collection}'`,
          FirestoreErrorCode.DOCUMENT_UPDATE_FAILED,
          500,
          {collection: data.collection, documentId: data.documentId},
          error
        );
      }
      throw error;
    }
  }

  /**
   * Sets a document in Firestore.
   * If documentId is provided, updates the document with the given id.
   * If document does not exist, creates a new document.
   * If merge is true, only the provided fields will be updated, otherwise the entire document will be overwritten.
   * By default merge is true.
   * @param data - The document set data
   */
  public async setDocument(data: SetDoc) {
    const methodName = 'setDocument';
    this.logMethodEntry(methodName, {
      collection: data.collection,
      documentId: data.documentId,
      merge: data.merge,
    });

    try {
      await this.ensureInitialized();
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
          updated_at: this.getServerTimestamp(),
        },
        {merge: data.merge !== undefined ? data.merge : true}
      );
      this.logMethodSuccess(methodName);
    } catch (error) {
      this.logMethodError(methodName, error as Error);

      // Transform Firestore errors to provide better context
      if (error instanceof Error) {
        if (error.message.includes('PERMISSION_DENIED')) {
          throw FirestoreServiceError.permissionDenied(
            'set',
            data.collection,
            error
          );
        }
        // For other unexpected errors, wrap them in a FirestoreServiceError
        throw new FirestoreServiceError(
          `Failed to set document in collection '${data.collection}'`,
          FirestoreErrorCode.DOCUMENT_UPDATE_FAILED,
          500,
          {collection: data.collection, documentId: data.documentId},
          error
        );
      }
      throw error;
    }
  }

  /**
   * Gets a document from Firestore.
   * @param collection - The collection name
   * @param documentId - The document ID
   * @returns Promise that resolves to the document data
   * @throws FirestoreServiceError if document is not found
   */
  public async getDocument(
    collection: string,
    documentId: string
  ): Promise<DocumentData> {
    const methodName = 'getDocument';
    this.logMethodEntry(methodName, {
      collection: collection,
      documentId: documentId,
    });

    try {
      await this.ensureInitialized();
      const db = this.getDb();
      const docRef = db.collection(collection).doc(documentId);
      const doc = await docRef.get();
      const data = doc.data();
      if (!data) {
        throw FirestoreServiceError.documentNotFound(collection, documentId);
      }
      this.logMethodSuccess(methodName);
      return data;
    } catch (error) {
      this.logMethodError(methodName, error as Error);

      // If it's already our custom error, re-throw it
      if (error instanceof FirestoreServiceError) {
        throw error;
      }

      // Transform Firestore errors to provide better context
      if (error instanceof Error) {
        if (error.message.includes('PERMISSION_DENIED')) {
          throw FirestoreServiceError.permissionDenied(
            'get',
            collection,
            error
          );
        }
        // For other unexpected errors, wrap them in a FirestoreServiceError
        throw new FirestoreServiceError(
          `Failed to get document from collection '${collection}'`,
          FirestoreErrorCode.DOCUMENT_NOT_FOUND,
          500,
          {collection, documentId},
          error
        );
      }
      throw error;
    }
  }

  /**
   * Gets all documents from a collection or subcollection.
   * This is the standard method for retrieving all documents.
   * @param collection - The collection name
   * @param isSubCollection - Whether this is a subcollection
   * @param documentId - The parent document ID (required for subcollections)
   * @param subCollection - The subcollection name (required for subcollections)
   * @returns Promise that resolves to an array of document data
   */
  public async getCollection(
    collection: string,
    isSubCollection = false,
    documentId?: string,
    subCollection?: string
  ): Promise<Array<DocumentData>> {
    const methodName = 'getCollection';
    this.logMethodEntry(methodName, {
      collection: collection,
      isSubCollection: isSubCollection,
      documentId: documentId,
      subCollection: subCollection,
    });

    try {
      await this.ensureInitialized();
      const db = this.getDb();
      if (isSubCollection) {
        // Check documentId and subCollection are provided.
        if (!documentId || !subCollection) {
          throw FirestoreServiceError.validationError(
            'FirestoreService.getCollection()- documentId and subCollection are required when isSubCollection is true.',
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
          throw FirestoreServiceError.collectionEmpty(
            collection,
            documentId,
            subCollection
          );
        }
        this.logMethodSuccess(methodName);
        return result;
      } else {
        const querySnapshot = await db.collection(collection).get();
        this.logMethodSuccess(methodName);
        return querySnapshot.docs.map((doc) => doc.data());
      }
    } catch (error) {
      this.logMethodError(methodName, error as Error);

      // If it's already our custom error, re-throw it
      if (error instanceof FirestoreServiceError) {
        throw error;
      }

      // Transform Firestore errors to provide better context
      if (error instanceof Error) {
        if (error.message.includes('PERMISSION_DENIED')) {
          throw FirestoreServiceError.permissionDenied(
            'get',
            collection,
            error
          );
        }
        // Let other errors bubble up as they might be unexpected
        throw error;
      }
      throw error;
    }
  }

  /**
   * Gets all documents from a collection or subcollection with their references.
   * Use this method when you need both document data and references.
   * @param collection - The collection name
   * @param isSubCollection - Whether this is a subcollection
   * @param documentId - The parent document ID (required for subcollections)
   * @param subCollection - The subcollection name (required for subcollections)
   * @returns Promise that resolves to an object containing data and references
   */
  public async getCollectionWithRefs(
    collection: string,
    isSubCollection = false,
    documentId?: string,
    subCollection?: string
  ): Promise<{
    data: Array<DocumentData>;
    refs: Array<DocumentReference>;
  }> {
    const methodName = 'getCollectionWithRefs';
    this.logMethodEntry(methodName, {
      collection: collection,
      isSubCollection: isSubCollection,
      documentId: documentId,
      subCollection: subCollection,
    });

    try {
      await this.ensureInitialized();
      const db = this.getDb();
      if (isSubCollection) {
        // Check documentId and subCollection are provided.
        if (!documentId || !subCollection) {
          throw FirestoreServiceError.validationError(
            'FirestoreService.getCollectionWithRefs()- documentId and subCollection are required when isSubCollection is true.',
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
        this.logMethodSuccess(methodName);
        return {
          data: querySnapshot.docs.map((doc) => doc.data()),
          refs: querySnapshot.docs.map((doc) => doc.ref),
        };
      } else {
        const querySnapshot = await db.collection(collection).get();
        this.logMethodSuccess(methodName);
        return {
          data: querySnapshot.docs.map((doc) => doc.data()),
          refs: querySnapshot.docs.map((doc) => doc.ref),
        };
      }
    } catch (error) {
      this.logMethodError(methodName, error as Error);

      // If it's already our custom error, re-throw it
      if (error instanceof FirestoreServiceError) {
        throw error;
      }

      // Transform Firestore errors to provide better context
      if (error instanceof Error) {
        if (error.message.includes('PERMISSION_DENIED')) {
          throw FirestoreServiceError.permissionDenied(
            'get',
            collection,
            error
          );
        }
        // Let other errors bubble up as they might be unexpected
        throw error;
      }
      throw error;
    }
  }

  /**
   * Queries a collection and returns document data.
   * This is the standard method for most use cases.
   * @param collection - The collection name
   * @param filters - Array of filters to apply
   * @returns Promise that resolves to an array of document data
   */
  public async queryCollection(
    collection: string,
    filters: {
      field: string;
      operator: WhereFilterOp;
      value: string | number | boolean | Timestamp;
    }[]
  ): Promise<Array<DocumentData>> {
    const methodName = 'queryCollection';
    this.logMethodEntry(methodName, {
      collection: collection,
      filters: filters,
    });

    try {
      await this.ensureInitialized();
      const querySnapshot = await this.queryCollectionSnapshot(
        collection,
        filters
      );
      this.logMethodSuccess(methodName);
      return querySnapshot.docs.map((doc) => doc.data());
    } catch (error) {
      this.logMethodError(methodName, error as Error);

      // Transform Firestore errors to provide better context
      if (error instanceof Error) {
        if (error.message.includes('PERMISSION_DENIED')) {
          throw FirestoreServiceError.permissionDenied(
            'query',
            collection,
            error
          );
        }
        if (error.message.includes('INVALID_ARGUMENT')) {
          throw FirestoreServiceError.queryFailed(collection, filters, error);
        }
        // Let other errors bubble up as they might be unexpected
        throw error;
      }
      throw error;
    }
  }

  /**
   * Queries a collection and returns the query snapshot for operations that need document references.
   * Use this method only when you need access to document references for batch operations.
   * @param collection - The collection name
   * @param filters - Array of filters to apply
   * @returns Promise that resolves to the query snapshot
   */
  public async queryCollectionSnapshot(
    collection: string,
    filters: {
      field: string;
      operator: WhereFilterOp;
      value: string | number | boolean | Timestamp;
    }[]
  ): Promise<QuerySnapshot<DocumentData>> {
    const methodName = 'queryCollectionSnapshot';
    this.logMethodEntry(methodName, {
      collection: collection,
      filters: filters,
    });

    try {
      await this.ensureInitialized();
      const db = this.getDb();
      let query:
        | ReturnType<typeof db.collection>
        | ReturnType<ReturnType<typeof db.collection>['where']> =
        db.collection(collection);

      filters.forEach((filter) => {
        query = query.where(filter.field, filter.operator, filter.value);
      });

      const querySnapshot = await query.get();
      this.logMethodSuccess(methodName);
      return querySnapshot;
    } catch (error) {
      this.logMethodError(methodName, error as Error);

      // If it's already our custom error, re-throw it
      if (error instanceof FirestoreServiceError) {
        throw error;
      }

      // Transform Firestore errors to provide better context
      if (error instanceof Error) {
        if (error.message.includes('PERMISSION_DENIED')) {
          throw FirestoreServiceError.permissionDenied(
            'query',
            collection,
            error
          );
        }
        if (error.message.includes('INVALID_ARGUMENT')) {
          throw FirestoreServiceError.queryFailed(collection, filters, error);
        }
        // Wrap any other errors as generic query errors
        throw FirestoreServiceError.queryFailed(collection, filters, error);
      }
      // Wrap non-Error objects as generic query errors
      throw FirestoreServiceError.queryFailed(
        collection,
        filters,
        error as Error
      );
    }
  }

  /**
   * Queries a collection and returns both document data and references.
   * Use this method when you need both the data and references for batch operations.
   * @param collection - The collection name
   * @param filters - Array of filters to apply
   * @returns Promise that resolves to an object containing data and references
   */
  public async queryCollectionWithRefs(
    collection: string,
    filters: {
      field: string;
      operator: WhereFilterOp;
      value: string | number | boolean | Timestamp;
    }[]
  ): Promise<{
    data: Array<DocumentData>;
    refs: Array<DocumentReference>;
  }> {
    const methodName = 'queryCollectionWithRefs';
    this.logMethodEntry(methodName, {
      collection: collection,
      filters: filters,
    });

    try {
      await this.ensureInitialized();
      const querySnapshot = await this.queryCollectionSnapshot(
        collection,
        filters
      );
      this.logMethodSuccess(methodName);
      return {
        data: querySnapshot.docs.map((doc) => doc.data()),
        refs: querySnapshot.docs.map((doc) => doc.ref),
      };
    } catch (error) {
      this.logMethodError(methodName, error as Error);

      // Transform Firestore errors to provide better context
      if (error instanceof Error) {
        if (error.message.includes('PERMISSION_DENIED')) {
          throw FirestoreServiceError.permissionDenied(
            'query',
            collection,
            error
          );
        }
        if (error.message.includes('INVALID_ARGUMENT')) {
          throw FirestoreServiceError.queryFailed(collection, filters, error);
        }
        // For other unexpected errors, wrap them in a FirestoreServiceError
        throw new FirestoreServiceError(
          `Failed to query collection '${collection}' with refs`,
          FirestoreErrorCode.QUERY_FAILED,
          500,
          {collection, filters},
          error
        );
      }
      throw error;
    }
  }

  public async runBatch(batch: (batch: WriteBatch) => Promise<void>) {
    const methodName = 'runBatch';
    this.logMethodEntry(methodName);

    try {
      await this.ensureInitialized();
      const db = this.getDb();
      const writeBatch = db.batch();

      await batch(writeBatch);
      await writeBatch.commit();
      this.logMethodSuccess(methodName);
    } catch (error) {
      this.logMethodError(methodName, error as Error);

      // Transform batch operation errors to provide better context
      if (error instanceof Error) {
        if (error.message.includes('PERMISSION_DENIED')) {
          throw FirestoreServiceError.permissionDenied(
            'batch',
            'unknown',
            error
          );
        }
        if (error.message.includes('INVALID_ARGUMENT')) {
          throw FirestoreServiceError.batchOperationFailed(
            'batch operation',
            error
          );
        }
        // For other unexpected errors, wrap them in a FirestoreServiceError
        throw new FirestoreServiceError(
          'Failed to execute batch operation',
          FirestoreErrorCode.BATCH_OPERATION_FAILED,
          500,
          {},
          error
        );
      }
      throw error;
    }
  }

  // ──────────────────────────────────────────────────────────
  // BATCH OPERATION HELPERS
  // ──────────────────────────────────────────────────────────

  /**
   * Adds a set operation to a batch.
   * @param batch - The write batch
   * @param collection - The collection name
   * @param documentId - The document ID
   * @param data - The data to set
   * @param merge - Whether to merge with existing data (default: true)
   */
  public addSetToBatch(
    batch: WriteBatch,
    collection: string,
    documentId: string,
    data: DocumentData,
    merge = true
  ): void {
    const docRef = this.getDocumentReference(collection, documentId);
    batch.set(
      docRef,
      {
        ...data,
        updated_at: this.getServerTimestamp(),
      },
      {merge}
    );
  }

  /**
   * Adds an update operation to a batch.
   * @param batch - The write batch
   * @param collection - The collection name
   * @param documentId - The document ID
   * @param data - The data to update
   */
  public addUpdateToBatch(
    batch: WriteBatch,
    collection: string,
    documentId: string,
    data: DocumentData
  ): void {
    const docRef = this.getDocumentReference(collection, documentId);
    batch.update(docRef, {
      ...data,
      updated_at: this.getServerTimestamp(),
    });
  }

  /**
   * Adds a delete operation to a batch.
   * @param batch - The write batch
   * @param collection - The collection name
   * @param documentId - The document ID
   */
  public addDeleteToBatch(
    batch: WriteBatch,
    collection: string,
    documentId: string
  ): void {
    const docRef = this.getDocumentReference(collection, documentId);
    batch.delete(docRef);
  }

  /**
   * Adds a create operation to a batch.
   * @param batch - The write batch
   * @param collection - The collection name
   * @param documentId - The document ID
   * @param data - The data to create
   */
  public addCreateToBatch(
    batch: WriteBatch,
    collection: string,
    documentId: string,
    data: DocumentData
  ): void {
    const docRef = this.getDocumentReference(collection, documentId);
    batch.create(docRef, {
      ...data,
      created_at: this.getServerTimestamp(),
      updated_at: this.getServerTimestamp(),
    });
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
    const methodName = 'runTransaction';
    this.logMethodEntry(methodName);

    try {
      await this.ensureInitialized();
      const db = this.getDb();
      const result = await db.runTransaction(updateFunction);
      this.logMethodSuccess(methodName);
      return result;
    } catch (error) {
      this.logMethodError(methodName, error as Error);

      // Transform transaction errors to provide better context
      if (error instanceof Error) {
        if (error.message.includes('PERMISSION_DENIED')) {
          throw FirestoreServiceError.permissionDenied(
            'transaction',
            'unknown',
            error
          );
        }
        if (error.message.includes('FAILED_PRECONDITION')) {
          throw FirestoreServiceError.transactionFailed(
            'transaction operation',
            error
          );
        }
        // For other unexpected errors, wrap them in a FirestoreServiceError
        throw new FirestoreServiceError(
          'Failed to execute transaction',
          FirestoreErrorCode.TRANSACTION_FAILED,
          500,
          {},
          error
        );
      }
      throw error;
    }
  }

  // ──────────────────────────────────────────────────────────
  // FIELD VALUE UTILITIES
  // ──────────────────────────────────────────────────────────

  /**
   * Gets a server timestamp FieldValue for use in Firestore operations.
   * @returns The server timestamp FieldValue
   */
  public getServerTimestamp(): FieldValue {
    return FieldValue.serverTimestamp();
  }

  /**
   * Gets an increment FieldValue for use in Firestore operations.
   * @param value - The value to increment by
   * @returns The increment FieldValue
   */
  public increment(value: number): FieldValue {
    return FieldValue.increment(value);
  }

  /**
   * Gets an arrayUnion FieldValue for use in Firestore operations.
   * @param elements - The elements to add to the array
   * @returns The arrayUnion FieldValue
   */
  public arrayUnion(
    ...elements: (string | number | boolean | null | DocumentData)[]
  ): FieldValue {
    return FieldValue.arrayUnion(...elements);
  }

  /**
   * Gets an arrayRemove FieldValue for use in Firestore operations.
   * @param elements - The elements to remove from the array
   * @returns The arrayRemove FieldValue
   */
  public arrayRemove(
    ...elements: (string | number | boolean | null | DocumentData)[]
  ): FieldValue {
    return FieldValue.arrayRemove(...elements);
  }

  // ──────────────────────────────────────────────────────────
  // TRANSACTION-SPECIFIC METHODS
  // ──────────────────────────────────────────────────────────

  /**
   * Creates a document reference within a transaction context.
   * @param collection - The collection name
   * @param documentId - Optional document ID, if not provided a new one will be generated
   * @returns The document reference
   */
  public createDocumentReference(
    collection: string,
    documentId?: string
  ): DocumentReference {
    const db = this.getDb();
    if (documentId) {
      return db.collection(collection).doc(documentId);
    }
    return db.collection(collection).doc();
  }

  /**
   * Gets a document reference for a specific collection and document ID.
   * @param collection - The collection name
   * @param documentId - The document ID
   * @returns The document reference
   */
  public getDocumentReference(
    collection: string,
    documentId: string
  ): DocumentReference {
    const db = this.getDb();
    return db.collection(collection).doc(documentId);
  }

  /**
   * Updates a document within a transaction.
   * @param transaction - The transaction object
   * @param collection - The collection name
   * @param documentId - The document ID
   * @param data - The data to update
   */
  public updateDocumentWithTransaction(
    transaction: Transaction,
    collection: string,
    documentId: string,
    data: DocumentData
  ): void {
    const docRef = this.getDocumentReference(collection, documentId);
    transaction.update(docRef, {
      ...data,
      updated_at: this.getServerTimestamp(),
    });
  }

  /**
   * Sets a document within a transaction.
   * @param transaction - The transaction object
   * @param collection - The collection name
   * @param documentId - The document ID
   * @param data - The data to set
   * @param merge - Whether to merge with existing data (default: true)
   */
  public setDocumentWithTransaction(
    transaction: Transaction,
    collection: string,
    documentId: string,
    data: DocumentData,
    merge = true
  ): void {
    const docRef = this.getDocumentReference(collection, documentId);
    transaction.set(
      docRef,
      {
        ...data,
        updated_at: this.getServerTimestamp(),
      },
      {merge}
    );
  }

  /**
   * Creates a document within a transaction.
   * @param transaction - The transaction object
   * @param collection - The collection name
   * @param documentId - The document ID
   * @param data - The data to create
   */
  public createDocumentWithTransaction(
    transaction: Transaction,
    collection: string,
    documentId: string,
    data: DocumentData
  ): void {
    const docRef = this.getDocumentReference(collection, documentId);
    transaction.create(docRef, {
      ...data,
      created_at: this.getServerTimestamp(),
      updated_at: this.getServerTimestamp(),
    });
  }

  /**
   * Deletes a document within a transaction.
   * @param transaction - The transaction object
   * @param collection - The collection name
   * @param documentId - The document ID
   */
  public deleteDocumentWithTransaction(
    transaction: Transaction,
    collection: string,
    documentId: string
  ): void {
    const docRef = this.getDocumentReference(collection, documentId);
    transaction.delete(docRef);
  }

  /**
   * Gets a document within a transaction.
   * @param transaction - The transaction object
   * @param collection - The collection name
   * @param documentId - The document ID
   * @returns Promise that resolves to the document data
   * @throws FirestoreServiceError if document is not found
   */
  public async getDocumentWithTransaction(
    transaction: Transaction,
    collection: string,
    documentId: string
  ): Promise<DocumentData> {
    const docRef = this.getDocumentReference(collection, documentId);
    const doc = await transaction.get(docRef);
    const data = doc.data();
    if (!data) {
      throw FirestoreServiceError.documentNotFound(collection, documentId);
    }
    return data;
  }

  /**
   * Queries a collection within a transaction.
   * @param transaction - The transaction object
   * @param collection - The collection name
   * @param filters - Optional array of filters to apply
   * @returns Promise that resolves to the query snapshot
   */
  public async queryCollectionWithTransaction(
    transaction: Transaction,
    collection: string,
    filters: {
      field: string;
      operator: WhereFilterOp;
      value: string | number | boolean | Timestamp;
    }[] = []
  ): Promise<QuerySnapshot<DocumentData>> {
    const db = this.getDb();
    let query:
      | ReturnType<typeof db.collection>
      | ReturnType<ReturnType<typeof db.collection>['where']> =
      db.collection(collection);

    filters.forEach((filter) => {
      query = query.where(filter.field, filter.operator, filter.value);
    });

    return transaction.get(query);
  }
}
