import {jest, describe, it, expect, beforeEach, afterEach} from '@jest/globals';
import {
  getFirestore,
  FieldValue,
  WhereFilterOp,
  Transaction,
  WriteBatch,
  DocumentReference,
  QuerySnapshot,
  DocumentData,
  Timestamp,
} from 'firebase-admin/firestore';

import {FirestoreService} from '../../../src/core/services/firestore-service';
import {AppError, ErrorCode} from '../../../src/core/errors/app-error';
import {FirestoreServiceError} from '../../../src/core/errors/services/firestore-service-error';
import {CreateDoc, SetDoc, UpdateDoc} from '../../../src/core/data/models';
import {
  mockFirestoreQuerySnapshot,
  mockFirestoreDocument,
  createMockCollection,
} from '../../utils/test-helpers';

// Mock firebase-admin/firestore
jest.mock('firebase-admin/firestore');

const mockGetFirestore = getFirestore as jest.MockedFunction<
  typeof getFirestore
>;
const mockFieldValue = FieldValue as jest.Mocked<typeof FieldValue>;

describe('FirestoreService', () => {
  let firestoreService: FirestoreService;
  let mockDb: any;
  let mockCollection: any;
  let mockDoc: any;
  let mockBatch: any;
  let mockTransaction: any;
  let mockQuery: any;

  beforeEach(() => {
    // Reset singleton instance
    (FirestoreService as any).instance = null;

    // Create simple mocks following Firebase best practices
    mockDoc = {
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      ref: {
        id: 'test-doc-id',
      },
      collection: jest.fn(() => createMockCollection()),
    };

    mockQuery = {
      where: jest.fn().mockReturnThis(),
      get: jest.fn(),
    };

    mockCollection = {
      doc: jest.fn(() => mockDoc),
      get: jest.fn(),
      where: jest.fn(() => mockQuery),
    };

    mockBatch = {
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(),
      commit: jest.fn(),
    };

    mockTransaction = {
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(),
    };

    mockDb = {
      collection: jest.fn(() => mockCollection),
      batch: jest.fn(() => mockBatch),
      runTransaction: jest.fn(),
    };

    mockGetFirestore.mockReturnValue(mockDb);

    // Mock FieldValue methods with simple return values
    mockFieldValue.serverTimestamp = jest.fn(() => 'mock-timestamp' as any);
    mockFieldValue.increment = jest.fn(
      (value: number) => `increment-${value}` as any
    );
    mockFieldValue.arrayUnion = jest.fn(
      (...elements: any[]) => `arrayUnion-${elements.length}` as any
    );
    mockFieldValue.arrayRemove = jest.fn(
      (...elements: any[]) => `arrayRemove-${elements.length}` as any
    );

    firestoreService = FirestoreService.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ──────────────────────────────────────────────────────────
  // SINGLETON PATTERN TESTS
  // ──────────────────────────────────────────────────────────

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = FirestoreService.getInstance();
      const instance2 = FirestoreService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should initialize database lazily', () => {
      expect(mockGetFirestore).not.toHaveBeenCalled();

      // Access the private getDb method to trigger initialization
      (firestoreService as any).getDb();

      expect(mockGetFirestore).toHaveBeenCalledTimes(1);
    });
  });

  // ──────────────────────────────────────────────────────────
  // CRUD OPERATION TESTS
  // ──────────────────────────────────────────────────────────

  describe('createDocument', () => {
    const createDocData: CreateDoc = {
      collection: 'test-collection',
      data: {name: 'test', value: 123},
    };

    it('should create document with auto-generated ID', async () => {
      await firestoreService.createDocument(createDocData);

      expect(mockDb.collection).toHaveBeenCalledWith('test-collection');
      expect(mockCollection.doc).toHaveBeenCalledWith();
      expect(mockDoc.create).toHaveBeenCalledWith({
        name: 'test',
        value: 123,
        created_at: 'mock-timestamp',
        updated_at: 'mock-timestamp',
      });
    });

    it('should create document with specified ID', async () => {
      const dataWithId: CreateDoc = {
        ...createDocData,
        documentId: 'test-id',
      };

      await firestoreService.createDocument(dataWithId);

      expect(mockCollection.doc).toHaveBeenCalledWith('test-id');
      expect(mockDoc.create).toHaveBeenCalledWith({
        name: 'test',
        value: 123,
        created_at: 'mock-timestamp',
        updated_at: 'mock-timestamp',
      });
    });

    it('should throw FirestoreServiceError when document already exists', async () => {
      const error = new Error('Document already exists: ALREADY_EXISTS');
      mockDoc.create.mockRejectedValue(error);

      await expect(
        firestoreService.createDocument(createDocData)
      ).rejects.toThrow(FirestoreServiceError);

      await expect(
        firestoreService.createDocument(createDocData)
      ).rejects.toMatchObject({
        message: expect.stringContaining('Failed to create document'),
        code: ErrorCode.DOCUMENT_CREATION_FAILED,
        status: 500,
      });
    });

    it('should throw FirestoreServiceError when permission denied', async () => {
      const error = new Error('Permission denied: PERMISSION_DENIED');
      mockDoc.create.mockRejectedValue(error);

      await expect(
        firestoreService.createDocument(createDocData)
      ).rejects.toThrow(FirestoreServiceError);

      await expect(
        firestoreService.createDocument(createDocData)
      ).rejects.toMatchObject({
        message: expect.stringContaining('Permission denied'),
        code: ErrorCode.PERMISSION_DENIED,
        status: 403,
      });
    });

    it('should let unexpected errors bubble up', async () => {
      const unexpectedError = new Error('Network error');
      mockDoc.create.mockRejectedValue(unexpectedError);

      await expect(
        firestoreService.createDocument(createDocData)
      ).rejects.toThrow('Network error');
    });
  });

  describe('updateDocument', () => {
    const updateDocData: UpdateDoc = {
      collection: 'test-collection',
      documentId: 'test-id',
      data: {name: 'updated', value: 456},
    };

    it('should update existing document', async () => {
      await firestoreService.updateDocument(updateDocData);

      expect(mockDb.collection).toHaveBeenCalledWith('test-collection');
      expect(mockCollection.doc).toHaveBeenCalledWith('test-id');
      expect(mockDoc.update).toHaveBeenCalledWith({
        name: 'updated',
        value: 456,
        updated_at: 'mock-timestamp',
      });
    });

    it('should throw FirestoreServiceError when document not found', async () => {
      const error = new Error('Document not found: NOT_FOUND');
      mockDoc.update.mockRejectedValue(error);

      await expect(
        firestoreService.updateDocument(updateDocData)
      ).rejects.toThrow(FirestoreServiceError);

      await expect(
        firestoreService.updateDocument(updateDocData)
      ).rejects.toMatchObject({
        message: expect.stringContaining('Document not found'),
        code: ErrorCode.DOCUMENT_NOT_FOUND,
        status: 404,
      });
    });

    it('should throw FirestoreServiceError when permission denied', async () => {
      const error = new Error('Permission denied: PERMISSION_DENIED');
      mockDoc.update.mockRejectedValue(error);

      await expect(
        firestoreService.updateDocument(updateDocData)
      ).rejects.toThrow(FirestoreServiceError);

      await expect(
        firestoreService.updateDocument(updateDocData)
      ).rejects.toMatchObject({
        message: expect.stringContaining('Permission denied'),
        code: ErrorCode.PERMISSION_DENIED,
        status: 403,
      });
    });
  });

  describe('setDocument', () => {
    const setDocData: SetDoc = {
      collection: 'test-collection',
      documentId: 'test-id',
      data: {name: 'test', value: 123},
    };

    it('should set document with merge by default', async () => {
      await firestoreService.setDocument(setDocData);

      expect(mockDoc.set).toHaveBeenCalledWith(
        {
          name: 'test',
          value: 123,
          updated_at: 'mock-timestamp',
        },
        {merge: true}
      );
    });

    it('should set document without merge when specified', async () => {
      const dataWithoutMerge: SetDoc = {
        ...setDocData,
        merge: false,
      };

      await firestoreService.setDocument(dataWithoutMerge);

      expect(mockDoc.set).toHaveBeenCalledWith(
        {
          name: 'test',
          value: 123,
          updated_at: 'mock-timestamp',
        },
        {merge: false}
      );
    });

    it('should set document with auto-generated ID when no documentId provided', async () => {
      const dataWithoutId: SetDoc = {
        collection: 'test-collection',
        data: {name: 'test', value: 123},
      };

      await firestoreService.setDocument(dataWithoutId);

      expect(mockCollection.doc).toHaveBeenCalledWith();
    });

    it('should throw FirestoreServiceError when permission denied', async () => {
      const error = new Error('Permission denied: PERMISSION_DENIED');
      mockDoc.set.mockRejectedValue(error);

      await expect(firestoreService.setDocument(setDocData)).rejects.toThrow(
        FirestoreServiceError
      );

      await expect(
        firestoreService.setDocument(setDocData)
      ).rejects.toMatchObject({
        message: expect.stringContaining('Permission denied'),
        code: ErrorCode.PERMISSION_DENIED,
        status: 403,
      });
    });
  });

  describe('getDocument', () => {
    it('should return document data when document exists', async () => {
      const mockData = {name: 'test', value: 123};
      mockDoc.get.mockResolvedValue(mockFirestoreDocument(mockData));

      const result = await firestoreService.getDocument(
        'test-collection',
        'test-id'
      );

      expect(mockDb.collection).toHaveBeenCalledWith('test-collection');
      expect(mockCollection.doc).toHaveBeenCalledWith('test-id');
      expect(mockDoc.get).toHaveBeenCalled();
      expect(result).toEqual(mockData);
    });

    it('should throw FirestoreServiceError when document does not exist', async () => {
      mockDoc.get.mockResolvedValue({
        exists: false,
        data: () => null,
        id: 'test-doc-id',
        ref: {id: 'test-doc-id'},
      });

      await expect(
        firestoreService.getDocument('test-collection', 'test-id')
      ).rejects.toThrow(FirestoreServiceError);

      await expect(
        firestoreService.getDocument('test-collection', 'test-id')
      ).rejects.toMatchObject({
        message: expect.stringContaining('Document not found'),
        code: ErrorCode.DOCUMENT_NOT_FOUND,
        status: 404,
      });
    });

    it('should throw FirestoreServiceError when permission denied', async () => {
      const error = new Error('Permission denied: PERMISSION_DENIED');
      mockDoc.get.mockRejectedValue(error);

      await expect(
        firestoreService.getDocument('test-collection', 'test-id')
      ).rejects.toThrow(FirestoreServiceError);

      await expect(
        firestoreService.getDocument('test-collection', 'test-id')
      ).rejects.toMatchObject({
        message: expect.stringContaining('Permission denied'),
        code: ErrorCode.PERMISSION_DENIED,
        status: 403,
      });
    });

    it('should re-throw FirestoreServiceError without transformation', async () => {
      const customError = FirestoreServiceError.documentNotFound(
        'test-collection',
        'test-id'
      );
      mockDoc.get.mockRejectedValue(customError);

      await expect(
        firestoreService.getDocument('test-collection', 'test-id')
      ).rejects.toBe(customError);
    });
  });

  // ──────────────────────────────────────────────────────────
  // COLLECTION OPERATION TESTS
  // ──────────────────────────────────────────────────────────

  describe('getCollection', () => {
    it('should return collection data for main collection', async () => {
      const mockDocs = [{name: 'test1'}, {name: 'test2'}];

      mockCollection.get.mockResolvedValue(
        mockFirestoreQuerySnapshot(mockDocs)
      );

      const result = await firestoreService.getCollection('test-collection');

      expect(mockDb.collection).toHaveBeenCalledWith('test-collection');
      expect(mockCollection.get).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result).toEqual([{name: 'test1'}, {name: 'test2'}]);
    });

    it('should return subcollection data when isSubCollection is true', async () => {
      const mockDocs = [{name: 'test1'}];

      // Mock the subcollection
      const mockSubCollection = createMockCollection(mockDocs);
      mockCollection.doc.mockReturnValue({
        collection: jest.fn(() => mockSubCollection),
      });

      const result = await firestoreService.getCollection(
        'parent-collection',
        true,
        'parent-id',
        'sub-collection'
      );

      expect(mockDb.collection).toHaveBeenCalledWith('parent-collection');
      expect(mockCollection.doc).toHaveBeenCalledWith('parent-id');
      expect(result).toHaveLength(1);
    });

    it('should throw AppError when subcollection parameters are missing', async () => {
      await expect(
        firestoreService.getCollection('parent-collection', true)
      ).rejects.toThrow(AppError);

      await expect(
        firestoreService.getCollection('parent-collection', true)
      ).rejects.toMatchObject({
        message: expect.stringContaining(
          'documentId and subCollection are required'
        ),
        code: ErrorCode.VALIDATION_ERROR,
        status: 400,
      });
    });

    it('should throw FirestoreServiceError when collection is empty', async () => {
      // Mock the subcollection with empty results
      const mockSubCollection = createMockCollection([]);
      mockCollection.doc.mockReturnValue({
        collection: jest.fn(() => mockSubCollection),
      });

      await expect(
        firestoreService.getCollection(
          'parent-collection',
          true,
          'parent-id',
          'sub-collection'
        )
      ).rejects.toMatchObject({
        code: ErrorCode.COLLECTION_EMPTY,
        status: 404,
      });
    });

    it('should throw FirestoreServiceError when permission denied', async () => {
      const error = new Error('Permission denied: PERMISSION_DENIED');
      mockCollection.get.mockRejectedValue(error);

      await expect(
        firestoreService.getCollection('test-collection')
      ).rejects.toThrow(FirestoreServiceError);

      await expect(
        firestoreService.getCollection('test-collection')
      ).rejects.toMatchObject({
        message: expect.stringContaining('Permission denied'),
        code: ErrorCode.PERMISSION_DENIED,
        status: 403,
      });
    });
  });

  describe('getCollectionWithRefs', () => {
    it('should return collection data with references', async () => {
      const mockDocs = [{name: 'test1'}, {name: 'test2'}];

      mockCollection.get.mockResolvedValue(
        mockFirestoreQuerySnapshot(mockDocs)
      );

      const result =
        await firestoreService.getCollectionWithRefs('test-collection');

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('refs');
      expect(result.data).toHaveLength(2);
      expect(result.refs).toHaveLength(2);
      expect(result.data).toEqual([{name: 'test1'}, {name: 'test2'}]);
    });

    it('should handle subcollections with references', async () => {
      const mockDocs = [{name: 'test1'}];

      // Mock the subcollection
      const mockSubCollection = createMockCollection(mockDocs);
      mockCollection.doc.mockReturnValue({
        collection: jest.fn(() => mockSubCollection),
      });

      const result = await firestoreService.getCollectionWithRefs(
        'parent-collection',
        true,
        'parent-id',
        'sub-collection'
      );

      expect(result.data).toHaveLength(1);
      expect(result.refs).toHaveLength(1);
    });

    it('should throw AppError when subcollection parameters are missing', async () => {
      await expect(
        firestoreService.getCollectionWithRefs('parent-collection', true)
      ).rejects.toThrow(AppError);
    });

    it('should throw FirestoreServiceError when permission denied', async () => {
      const error = new Error('Permission denied: PERMISSION_DENIED');
      mockCollection.get.mockRejectedValue(error);

      await expect(
        firestoreService.getCollectionWithRefs('test-collection')
      ).rejects.toThrow(FirestoreServiceError);
    });
  });

  // ──────────────────────────────────────────────────────────
  // QUERY OPERATION TESTS
  // ──────────────────────────────────────────────────────────

  describe('queryCollection', () => {
    const filters = [
      {field: 'active', operator: '==' as WhereFilterOp, value: true},
      {
        field: 'category',
        operator: 'in' as WhereFilterOp,
        value: ['A', 'B'] as any,
      },
    ];

    it('should query collection with filters', async () => {
      const mockDocs = [
        {
          id: 'doc1',
          data: () => ({name: 'test1', active: true, category: 'A'}),
        },
      ];

      mockQuery.get.mockResolvedValue(mockFirestoreQuerySnapshot(mockDocs));

      const result = await firestoreService.queryCollection(
        'test-collection',
        filters
      );

      expect(mockDb.collection).toHaveBeenCalledWith('test-collection');
      expect(mockCollection.where).toHaveBeenCalledWith('active', '==', true);
      expect(mockQuery.where).toHaveBeenCalledWith('category', 'in', [
        'A',
        'B',
      ]);
      expect(mockQuery.get).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('should handle empty query results', async () => {
      mockQuery.get.mockResolvedValue(mockFirestoreQuerySnapshot([]));

      const result = await firestoreService.queryCollection(
        'test-collection',
        filters
      );

      expect(result).toHaveLength(0);
    });

    it('should throw FirestoreServiceError when permission denied', async () => {
      const error = new Error('Permission denied: PERMISSION_DENIED');
      mockQuery.get.mockRejectedValue(error);

      await expect(
        firestoreService.queryCollection('test-collection', filters)
      ).rejects.toThrow(FirestoreServiceError);

      await expect(
        firestoreService.queryCollection('test-collection', filters)
      ).rejects.toMatchObject({
        message: expect.stringContaining('Permission denied'),
        code: ErrorCode.PERMISSION_DENIED,
        status: 403,
      });
    });

    it('should throw FirestoreServiceError when query fails', async () => {
      const error = new Error('Invalid argument: INVALID_ARGUMENT');
      mockQuery.get.mockRejectedValue(error);

      await expect(
        firestoreService.queryCollection('test-collection', filters)
      ).rejects.toThrow(FirestoreServiceError);

      await expect(
        firestoreService.queryCollection('test-collection', filters)
      ).rejects.toMatchObject({
        message: expect.stringContaining('Query failed'),
        code: ErrorCode.QUERY_FAILED,
        status: 500,
      });
    });
  });

  describe('queryCollectionSnapshot', () => {
    const filters = [
      {field: 'active', operator: '==' as WhereFilterOp, value: true},
    ];

    it('should return query snapshot', async () => {
      const mockDocs = [{name: 'test1', active: true}];

      mockQuery.get.mockResolvedValue(mockFirestoreQuerySnapshot(mockDocs));

      const result = await firestoreService.queryCollectionSnapshot(
        'test-collection',
        filters
      );

      expect(result).toBeDefined();
      expect(result.docs).toHaveLength(1);
    });

    it('should verify mock chain is working', async () => {
      const error = new Error('PERMISSION_DENIED');
      mockQuery.get.mockImplementation(() => Promise.reject(error));

      // Verify the mock chain is set up correctly
      expect(mockDb.collection).toBeDefined();
      expect(mockCollection.where).toBeDefined();
      expect(mockQuery.get).toBeDefined();

      // This should throw the error
      await expect(mockQuery.get()).rejects.toThrow('PERMISSION_DENIED');
    });

    it('should throw FirestoreServiceError when permission denied', async () => {
      const error = new Error('PERMISSION_DENIED');
      mockQuery.get.mockImplementation(() => Promise.reject(error));

      await expect(
        firestoreService.queryCollectionSnapshot('test-collection', filters)
      ).rejects.toThrow(FirestoreServiceError);

      await expect(
        firestoreService.queryCollectionSnapshot('test-collection', filters)
      ).rejects.toMatchObject({
        message: expect.stringContaining('Permission denied'),
        code: ErrorCode.PERMISSION_DENIED,
        status: 403,
      });
    });

    it('should throw FirestoreServiceError when query fails', async () => {
      const error = new Error('INVALID_ARGUMENT');
      mockQuery.get.mockImplementation(() => Promise.reject(error));

      await expect(
        firestoreService.queryCollectionSnapshot('test-collection', filters)
      ).rejects.toThrow(FirestoreServiceError);

      await expect(
        firestoreService.queryCollectionSnapshot('test-collection', filters)
      ).rejects.toMatchObject({
        message: expect.stringContaining('Query failed'),
        code: ErrorCode.QUERY_FAILED,
        status: 500,
      });
    });
  });

  describe('queryCollectionWithRefs', () => {
    const filters = [
      {field: 'active', operator: '==' as WhereFilterOp, value: true},
    ];

    it('should return query results with references', async () => {
      const mockDocs = [
        {id: 'doc1', data: () => ({name: 'test1', active: true})},
      ];

      mockQuery.get.mockResolvedValue(mockFirestoreQuerySnapshot(mockDocs));

      const result = await firestoreService.queryCollectionWithRefs(
        'test-collection',
        filters
      );

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('refs');
      expect(result.data).toHaveLength(1);
      expect(result.refs).toHaveLength(1);
    });

    it('should throw FirestoreServiceError when permission denied', async () => {
      const error = new Error('Permission denied: PERMISSION_DENIED');
      mockQuery.get.mockRejectedValue(error);

      await expect(
        firestoreService.queryCollectionWithRefs('test-collection', filters)
      ).rejects.toThrow(FirestoreServiceError);
    });

    it('should throw FirestoreServiceError when query fails', async () => {
      const error = new Error('Invalid argument: INVALID_ARGUMENT');
      mockQuery.get.mockRejectedValue(error);

      await expect(
        firestoreService.queryCollectionWithRefs('test-collection', filters)
      ).rejects.toThrow(FirestoreServiceError);
    });
  });

  // ──────────────────────────────────────────────────────────
  // BATCH OPERATION TESTS
  // ──────────────────────────────────────────────────────────

  describe('runBatch', () => {
    it('should run batch operation successfully', async () => {
      const batchFunction = jest.fn().mockImplementation(async () => {
        // Mock implementation
      });
      mockBatch.commit.mockResolvedValue(undefined);

      await firestoreService.runBatch(batchFunction as any);

      expect(mockDb.batch).toHaveBeenCalled();
      expect(batchFunction).toHaveBeenCalledWith(mockBatch);
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it('should throw FirestoreServiceError when batch operation fails', async () => {
      const batchFunction = jest.fn().mockImplementation(async () => {
        throw new Error('Invalid argument: INVALID_ARGUMENT');
      });

      await expect(
        firestoreService.runBatch(batchFunction as any)
      ).rejects.toThrow(FirestoreServiceError);

      await expect(
        firestoreService.runBatch(batchFunction as any)
      ).rejects.toMatchObject({
        message: expect.stringContaining('Batch operation'),
        code: ErrorCode.BATCH_OPERATION_FAILED,
        status: 500,
      });
    });

    it('should throw FirestoreServiceError when permission denied', async () => {
      const batchFunction = jest.fn().mockImplementation(async () => {
        throw new Error('Permission denied: PERMISSION_DENIED');
      });

      await expect(
        firestoreService.runBatch(batchFunction as any)
      ).rejects.toThrow(FirestoreServiceError);

      await expect(
        firestoreService.runBatch(batchFunction as any)
      ).rejects.toMatchObject({
        message: expect.stringContaining('Permission denied'),
        code: ErrorCode.PERMISSION_DENIED,
        status: 403,
      });
    });
  });

  describe('Batch Helper Methods', () => {
    it('should add set operation to batch', () => {
      const data = {name: 'test', value: 123};

      firestoreService.addSetToBatch(
        mockBatch,
        'test-collection',
        'test-id',
        data
      );

      expect(mockBatch.set).toHaveBeenCalledWith(
        expect.anything(),
        {
          name: 'test',
          value: 123,
          updated_at: 'mock-timestamp',
        },
        {merge: true}
      );
    });

    it('should add update operation to batch', () => {
      const data = {name: 'updated', value: 456};

      firestoreService.addUpdateToBatch(
        mockBatch,
        'test-collection',
        'test-id',
        data
      );

      expect(mockBatch.update).toHaveBeenCalledWith(expect.anything(), {
        name: 'updated',
        value: 456,
        updated_at: 'mock-timestamp',
      });
    });

    it('should add delete operation to batch', () => {
      firestoreService.addDeleteToBatch(
        mockBatch,
        'test-collection',
        'test-id'
      );

      expect(mockBatch.delete).toHaveBeenCalledWith(expect.anything());
    });

    it('should add create operation to batch', () => {
      const data = {name: 'new', value: 789};

      firestoreService.addCreateToBatch(
        mockBatch,
        'test-collection',
        'test-id',
        data
      );

      expect(mockBatch.create).toHaveBeenCalledWith(expect.anything(), {
        name: 'new',
        value: 789,
        created_at: 'mock-timestamp',
        updated_at: 'mock-timestamp',
      });
    });
  });

  // ──────────────────────────────────────────────────────────
  // TRANSACTION TESTS
  // ──────────────────────────────────────────────────────────

  describe('runTransaction', () => {
    it('should run transaction successfully', async () => {
      const mockUpdateFunction = jest.fn().mockImplementation(async () => {
        return 'transaction-result';
      });
      mockDb.runTransaction.mockImplementation(
        async (
          updateFunction: (transaction: Transaction) => Promise<string>
        ) => {
          return await updateFunction(mockTransaction);
        }
      );

      const result = await firestoreService.runTransaction(
        mockUpdateFunction as any
      );

      expect(mockDb.runTransaction).toHaveBeenCalled();
      expect(mockUpdateFunction).toHaveBeenCalledWith(mockTransaction);
      expect(result).toBe('transaction-result');
    });

    it('should throw FirestoreServiceError when transaction fails', async () => {
      const mockUpdateFunction = jest.fn().mockImplementation(async () => {
        throw new Error('Failed precondition: FAILED_PRECONDITION');
      });
      mockDb.runTransaction.mockImplementation(
        async (
          updateFunction: (transaction: Transaction) => Promise<string>
        ) => {
          return await updateFunction(mockTransaction);
        }
      );

      await expect(
        firestoreService.runTransaction(mockUpdateFunction as any)
      ).rejects.toThrow(FirestoreServiceError);

      await expect(
        firestoreService.runTransaction(mockUpdateFunction as any)
      ).rejects.toMatchObject({
        message: expect.stringContaining('Transaction'),
        code: ErrorCode.TRANSACTION_FAILED,
        status: 500,
      });
    });

    it('should throw FirestoreServiceError when permission denied', async () => {
      const mockUpdateFunction = jest.fn().mockImplementation(async () => {
        throw new Error('Permission denied: PERMISSION_DENIED');
      });
      mockDb.runTransaction.mockImplementation(
        async (
          updateFunction: (transaction: Transaction) => Promise<string>
        ) => {
          return await updateFunction(mockTransaction);
        }
      );

      await expect(
        firestoreService.runTransaction(mockUpdateFunction as any)
      ).rejects.toThrow(FirestoreServiceError);

      await expect(
        firestoreService.runTransaction(mockUpdateFunction as any)
      ).rejects.toMatchObject({
        message: expect.stringContaining('Permission denied'),
        code: ErrorCode.PERMISSION_DENIED,
        status: 403,
      });
    });
  });

  describe('Transaction Helper Methods', () => {
    it('should create document reference', () => {
      const ref = firestoreService.createDocumentReference(
        'test-collection',
        'test-id'
      );

      expect(mockDb.collection).toHaveBeenCalledWith('test-collection');
      expect(mockCollection.doc).toHaveBeenCalledWith('test-id');
    });

    it('should create document reference with auto-generated ID', () => {
      const ref = firestoreService.createDocumentReference('test-collection');

      expect(mockCollection.doc).toHaveBeenCalledWith();
    });

    it('should get document reference', () => {
      const ref = firestoreService.getDocumentReference(
        'test-collection',
        'test-id'
      );

      expect(mockDb.collection).toHaveBeenCalledWith('test-collection');
      expect(mockCollection.doc).toHaveBeenCalledWith('test-id');
    });

    it('should update document with transaction', () => {
      const data = {name: 'updated', value: 456};

      firestoreService.updateDocumentWithTransaction(
        mockTransaction,
        'test-collection',
        'test-id',
        data
      );

      expect(mockTransaction.update).toHaveBeenCalledWith(expect.anything(), {
        name: 'updated',
        value: 456,
        updated_at: 'mock-timestamp',
      });
    });

    it('should set document with transaction', () => {
      const data = {name: 'test', value: 123};

      firestoreService.setDocumentWithTransaction(
        mockTransaction,
        'test-collection',
        'test-id',
        data,
        true
      );

      expect(mockTransaction.set).toHaveBeenCalledWith(
        expect.anything(),
        {
          name: 'test',
          value: 123,
          updated_at: 'mock-timestamp',
        },
        {merge: true}
      );
    });

    it('should create document with transaction', () => {
      const data = {name: 'new', value: 789};

      firestoreService.createDocumentWithTransaction(
        mockTransaction,
        'test-collection',
        'test-id',
        data
      );

      expect(mockTransaction.create).toHaveBeenCalledWith(expect.anything(), {
        name: 'new',
        value: 789,
        created_at: 'mock-timestamp',
        updated_at: 'mock-timestamp',
      });
    });

    it('should delete document with transaction', () => {
      firestoreService.deleteDocumentWithTransaction(
        mockTransaction,
        'test-collection',
        'test-id'
      );

      expect(mockTransaction.delete).toHaveBeenCalledWith(expect.anything());
    });

    it('should get document with transaction', async () => {
      const mockData = {name: 'test', value: 123};
      mockTransaction.get.mockResolvedValue({
        exists: true,
        data: () => mockData,
        id: 'test-doc-id',
        ref: {id: 'test-doc-id'},
      });

      const result = await firestoreService.getDocumentWithTransaction(
        mockTransaction,
        'test-collection',
        'test-id'
      );

      expect(mockTransaction.get).toHaveBeenCalledWith(expect.anything());
      expect(result.data()).toEqual(mockData);
    });

    it('should query collection with transaction', async () => {
      const filters = [
        {field: 'active', operator: '==' as WhereFilterOp, value: true},
      ];
      const mockDocs = [
        {id: 'doc1', data: () => ({name: 'test1', active: true})},
      ];

      mockTransaction.get.mockResolvedValue(
        mockFirestoreQuerySnapshot(mockDocs)
      );

      const result = await firestoreService.queryCollectionWithTransaction(
        mockTransaction,
        'test-collection',
        filters
      );

      expect(mockTransaction.get).toHaveBeenCalledWith(mockQuery);
      expect(result).toBeDefined();
    });
  });

  // ──────────────────────────────────────────────────────────
  // FIELD VALUE UTILITY TESTS
  // ──────────────────────────────────────────────────────────

  describe('Field Value Utilities', () => {
    it('should return server timestamp', () => {
      const result = firestoreService.getServerTimestamp();

      expect(mockFieldValue.serverTimestamp).toHaveBeenCalled();
      expect(result).toBe('mock-timestamp');
    });

    it('should return increment field value', () => {
      const result = firestoreService.increment(5);

      expect(mockFieldValue.increment).toHaveBeenCalledWith(5);
      expect(result).toBe('increment-5');
    });

    it('should return arrayUnion field value', () => {
      const elements = ['tag1', 'tag2', 123];
      const result = firestoreService.arrayUnion(...elements);

      expect(mockFieldValue.arrayUnion).toHaveBeenCalledWith(...elements);
      expect(result).toBe('arrayUnion-3');
    });

    it('should return arrayRemove field value', () => {
      const elements = ['tag1', 'tag2'];
      const result = firestoreService.arrayRemove(...elements);

      expect(mockFieldValue.arrayRemove).toHaveBeenCalledWith(...elements);
      expect(result).toBe('arrayRemove-2');
    });
  });

  // ──────────────────────────────────────────────────────────
  // EDGE CASE TESTS
  // ──────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('should handle empty filters array in queries', async () => {
      const mockDocs = [{id: 'doc1', data: () => ({name: 'test1'})}];

      mockCollection.get.mockResolvedValue(
        mockFirestoreQuerySnapshot(mockDocs)
      );

      const result = await firestoreService.queryCollection(
        'test-collection',
        []
      );

      expect(result).toHaveLength(1);
      expect(mockCollection.get).toHaveBeenCalled();
    });

    it('should handle null values in field value utilities', () => {
      const result = firestoreService.arrayUnion(null, 'valid');

      expect(mockFieldValue.arrayUnion).toHaveBeenCalledWith(null, 'valid');
    });

    it('should handle complex DocumentData in field value utilities', () => {
      const complexData = {
        nested: {value: 'test'},
        array: [1, 2, 3],
        boolean: true,
      };

      const result = firestoreService.arrayUnion(complexData);

      expect(mockFieldValue.arrayUnion).toHaveBeenCalledWith(complexData);
    });
  });

  // ──────────────────────────────────────────────────────────
  // ERROR CHAINING TESTS
  // ──────────────────────────────────────────────────────────

  describe('Error Chaining', () => {
    it('should preserve original error as cause', async () => {
      const originalError = new Error(
        'Document already exists: ALREADY_EXISTS'
      );
      mockDoc.create.mockRejectedValue(originalError);

      try {
        await firestoreService.createDocument({
          collection: 'test-collection',
          data: {name: 'test'},
        });
      } catch (error) {
        expect(error).toBeInstanceOf(FirestoreServiceError);
        expect((error as FirestoreServiceError).cause).toBe(originalError);
      }
    });

    it('should maintain error chain for debugging', async () => {
      const originalError = new Error('Permission denied: PERMISSION_DENIED');
      mockDoc.get.mockRejectedValue(originalError);

      try {
        await firestoreService.getDocument('test-collection', 'test-id');
      } catch (error) {
        expect(error).toBeInstanceOf(FirestoreServiceError);
        const errorChain = (error as FirestoreServiceError).getErrorChain();
        expect(errorChain).toHaveLength(2);
        expect(errorChain[0]).toBe(error);
        expect(errorChain[1]).toBe(originalError);
      }
    });
  });
});
