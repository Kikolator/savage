import {jest, describe, it, expect, beforeEach, afterEach} from '@jest/globals';
import {getFirestore, FieldValue} from 'firebase-admin/firestore';

import {FirestoreService} from '../../../src/core/services/firestore-service';
import {AppError, ErrorCode} from '../../../src/core/errors/app-error';
import {
  mockFirestoreDocument,
  mockFirestoreQuerySnapshot,
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

  beforeEach(() => {
    // Reset singleton instance
    (FirestoreService as any).instance = null;

    // Create mocks
    mockDoc = {
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    };

    mockCollection = {
      doc: jest.fn(() => mockDoc),
      get: jest.fn(),
      where: jest.fn(),
    };

    mockBatch = {
      set: jest.fn(),
      update: jest.fn(),
      commit: jest.fn(),
    };

    mockTransaction = {
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn(),
    };

    mockDb = {
      collection: jest.fn(() => mockCollection),
      batch: jest.fn(() => mockBatch),
      runTransaction: jest.fn(),
    };

    mockGetFirestore.mockReturnValue(mockDb);
    mockFieldValue.serverTimestamp = jest.fn(() => 'mock-timestamp');

    firestoreService = FirestoreService.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return the same instance', () => {
      const instance1 = FirestoreService.getInstance();
      const instance2 = FirestoreService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('createDocument', () => {
    it('should create document with auto-generated ID', async () => {
      const data = {
        collection: 'test-collection',
        data: {name: 'test', value: 123},
      };

      await firestoreService.createDocument(data);

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
      const data = {
        collection: 'test-collection',
        documentId: 'test-id',
        data: {name: 'test', value: 123},
      };

      await firestoreService.createDocument(data);

      expect(mockDb.collection).toHaveBeenCalledWith('test-collection');
      expect(mockCollection.doc).toHaveBeenCalledWith('test-id');
      expect(mockDoc.create).toHaveBeenCalledWith({
        name: 'test',
        value: 123,
        created_at: 'mock-timestamp',
        updated_at: 'mock-timestamp',
      });
    });
  });

  describe('updateDocument', () => {
    it('should update existing document', async () => {
      const data = {
        collection: 'test-collection',
        documentId: 'test-id',
        data: {name: 'updated', value: 456},
      };

      await firestoreService.updateDocument(data);

      expect(mockDb.collection).toHaveBeenCalledWith('test-collection');
      expect(mockCollection.doc).toHaveBeenCalledWith('test-id');
      expect(mockDoc.update).toHaveBeenCalledWith({
        name: 'updated',
        value: 456,
        updated_at: 'mock-timestamp',
      });
    });
  });

  describe('setDocument', () => {
    it('should set document with merge by default', async () => {
      const data = {
        collection: 'test-collection',
        documentId: 'test-id',
        data: {name: 'test', value: 123},
      };

      await firestoreService.setDocument(data);

      expect(mockDb.collection).toHaveBeenCalledWith('test-collection');
      expect(mockCollection.doc).toHaveBeenCalledWith('test-id');
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
      const data = {
        collection: 'test-collection',
        documentId: 'test-id',
        data: {name: 'test', value: 123},
        merge: false,
      };

      await firestoreService.setDocument(data);

      expect(mockDoc.set).toHaveBeenCalledWith(
        {
          name: 'test',
          value: 123,
          updated_at: 'mock-timestamp',
        },
        {merge: false}
      );
    });
  });

  describe('getDocument', () => {
    it('should return document data when document exists', async () => {
      const mockData = {name: 'test', value: 123};
      mockDoc.get.mockResolvedValue({
        data: () => mockData,
        exists: true,
      });

      const result = await firestoreService.getDocument(
        'test-collection',
        'test-id'
      );

      expect(mockDb.collection).toHaveBeenCalledWith('test-collection');
      expect(mockCollection.doc).toHaveBeenCalledWith('test-id');
      expect(mockDoc.get).toHaveBeenCalled();
      expect(result).toEqual(mockData);
    });

    it('should throw AppError when document does not exist', async () => {
      mockDoc.get.mockResolvedValue({
        data: () => null,
        exists: false,
      });

      await expect(
        firestoreService.getDocument('test-collection', 'test-id')
      ).rejects.toMatchObject({
        message: 'Document not found',
        code: ErrorCode.DOCUMENT_NOT_FOUND,
        statusCode: 404,
      });
    });
  });

  describe('getCollection', () => {
    it('should return collection data', async () => {
      const mockDocs = [
        {id: 'doc1', data: () => ({name: 'test1'})},
        {id: 'doc2', data: () => ({name: 'test2'})},
      ];

      mockCollection.get.mockResolvedValue(
        mockFirestoreQuerySnapshot(mockDocs)
      );

      const result = await firestoreService.getCollection('test-collection');

      expect(mockDb.collection).toHaveBeenCalledWith('test-collection');
      expect(mockCollection.get).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });
  });

  describe('queryCollection', () => {
    it('should query collection with filters', async () => {
      const mockDocs = [
        {id: 'doc1', data: () => ({name: 'test1', active: true})},
      ];

      mockCollection.where.mockReturnValue(mockCollection);
      mockCollection.get.mockResolvedValue(
        mockFirestoreQuerySnapshot(mockDocs)
      );

      const filters = [{field: 'active', operator: '==', value: true}];

      const result = await firestoreService.queryCollection(
        'test-collection',
        filters
      );

      expect(mockDb.collection).toHaveBeenCalledWith('test-collection');
      expect(mockCollection.where).toHaveBeenCalledWith('active', '==', true);
      expect(mockCollection.get).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });

  describe('batch operations', () => {
    it('should update multiple documents in batch', async () => {
      const data = [
        {
          collection: 'test-collection',
          documentId: 'doc1',
          data: {name: 'updated1'},
        },
        {
          collection: 'test-collection',
          documentId: 'doc2',
          data: {name: 'updated2'},
        },
      ];

      await firestoreService.updateDocuments(data);

      expect(mockDb.batch).toHaveBeenCalled();
      expect(mockBatch.update).toHaveBeenCalledTimes(2);
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it('should set multiple documents in batch', async () => {
      const data = [
        {
          collection: 'test-collection',
          documentId: 'doc1',
          data: {name: 'test1'},
          merge: true,
        },
        {
          collection: 'test-collection',
          documentId: 'doc2',
          data: {name: 'test2'},
          merge: false,
        },
      ];

      await firestoreService.setDocuments(data);

      expect(mockDb.batch).toHaveBeenCalled();
      expect(mockBatch.set).toHaveBeenCalledTimes(2);
      expect(mockBatch.commit).toHaveBeenCalled();
    });
  });

  describe('runTransaction', () => {
    it('should run transaction successfully', async () => {
      const mockUpdateFunction = jest
        .fn()
        .mockResolvedValue('transaction-result');
      mockDb.runTransaction.mockImplementation(async (updateFunction) => {
        return await updateFunction(mockTransaction);
      });

      const result = await firestoreService.runTransaction(mockUpdateFunction);

      expect(mockDb.runTransaction).toHaveBeenCalled();
      expect(mockUpdateFunction).toHaveBeenCalledWith(mockTransaction);
      expect(result).toBe('transaction-result');
    });
  });

  describe('utility methods', () => {
    it('should return Firestore instance', () => {
      const instance = firestoreService.getFirestoreInstance();
      expect(instance).toBe(mockDb);
    });

    it('should return FieldValue', () => {
      const fieldValue = firestoreService.getFieldValue();
      expect(fieldValue).toBe(mockFieldValue);
    });
  });
});
