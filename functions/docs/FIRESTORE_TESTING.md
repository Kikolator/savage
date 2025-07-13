# Firebase Firestore Testing Best Practices

This document outlines best practices for testing Firebase Firestore in TypeScript backend projects, specifically for Firebase Functions.

## Table of Contents

1. [Overview](#overview)
2. [Mocking Strategy](#mocking-strategy)
3. [Type-Safe Mocks](#type-safe-mocks)
4. [Testing Patterns](#testing-patterns)
5. [Common Issues and Solutions](#common-issues-and-solutions)
6. [Examples](#examples)

## Overview

When testing Firebase Firestore in TypeScript backend projects, it's essential to:
- Mock the Firebase Admin SDK properly
- Use type-safe mocks that match actual Firestore types
- Test both success and error scenarios
- Follow Firebase best practices for testing

## Mocking Strategy

### 1. Mock the Entire Firebase Admin SDK

```typescript
// In your test setup file (e.g., test/setup.ts)
jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(),
  FieldValue: {
    serverTimestamp: jest.fn(() => 'mock-timestamp'),
    increment: jest.fn((value: number) => `increment-${value}`),
    arrayUnion: jest.fn((...elements) => `arrayUnion-${elements.length}`),
    arrayRemove: jest.fn((...elements) => `arrayRemove-${elements.length}`),
  },
  Timestamp: {
    now: jest.fn(() => ({ toDate: () => new Date() })),
    fromDate: jest.fn((date: Date) => ({ toDate: () => date })),
  },
}));
```

### 2. Create Type-Safe Mock Factories

```typescript
// test/utils/firestore-mocks.ts
import {
  DocumentSnapshot,
  QuerySnapshot,
  DocumentReference,
  CollectionReference,
  Query,
  DocumentData,
  WriteBatch,
  Transaction,
  Timestamp,
} from 'firebase-admin/firestore';

export const createMockDocumentSnapshot = (
  data: DocumentData = {},
  exists: boolean = true,
  id: string = 'test-doc-id'
): DocumentSnapshot => {
  const mockDocRef = createMockDocumentReference(id);
  
  return {
    exists,
    data: () => exists ? data : undefined,
    id,
    ref: mockDocRef,
    readTime: Timestamp.now(),
    get: jest.fn(),
    isEqual: jest.fn(),
  } as unknown as DocumentSnapshot;
};

export const createMockQuerySnapshot = (docs: DocumentSnapshot[] = []): QuerySnapshot => {
  return {
    empty: docs.length === 0,
    size: docs.length,
    docs,
    readTime: Timestamp.now(),
    docChanges: jest.fn(),
    forEach: jest.fn((callback: (doc: DocumentSnapshot) => void) => {
      docs.forEach(callback);
    }),
    isEqual: jest.fn(),
  } as unknown as QuerySnapshot;
};

export const createMockDocumentReference = (id: string = 'test-doc-id'): DocumentReference => {
  return {
    id,
    get: jest.fn(),
    set: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    collection: jest.fn(),
    parent: null,
    path: `test-collection/${id}`,
    firestore: {} as any,
    listCollections: jest.fn(),
    withConverter: jest.fn(),
  } as unknown as DocumentReference;
};

export const createMockCollectionReference = (): CollectionReference => {
  return {
    id: 'test-collection',
    path: 'test-collection',
    parent: null,
    firestore: {} as any,
    doc: jest.fn(),
    get: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
    limitToLast: jest.fn(),
    offset: jest.fn(),
    startAt: jest.fn(),
    startAfter: jest.fn(),
    endAt: jest.fn(),
    endBefore: jest.fn(),
    listDocuments: jest.fn(),
    withConverter: jest.fn(),
  } as unknown as CollectionReference;
};

export const createMockQuery = (): Query => {
  return {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    limitToLast: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    startAt: jest.fn().mockReturnThis(),
    startAfter: jest.fn().mockReturnThis(),
    endAt: jest.fn().mockReturnThis(),
    endBefore: jest.fn().mockReturnThis(),
    get: jest.fn(),
    withConverter: jest.fn(),
  } as unknown as Query;
};

export const createMockWriteBatch = (): WriteBatch => {
  return {
    set: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    create: jest.fn().mockReturnThis(),
    commit: jest.fn(),
  } as unknown as WriteBatch;
};

export const createMockTransaction = (): Transaction => {
  return {
    get: jest.fn(),
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
    getAll: jest.fn(),
  } as unknown as Transaction;
};
```

## Type-Safe Mocks

### Key Principles

1. **Use `as unknown as Type` casting**: This allows you to create mocks that satisfy TypeScript's type checking while maintaining flexibility.

2. **Extend actual interfaces**: When possible, extend the actual Firebase interfaces to ensure compatibility.

3. **Mock all required methods**: Ensure your mocks implement all methods that your code uses.

### Example: Service Test

```typescript
// test/core/services/firestore-service.test.ts
import {jest, describe, it, expect, beforeEach, afterEach} from '@jest/globals';
import {getFirestore, FieldValue} from 'firebase-admin/firestore';
import {FirestoreService} from '../../../src/core/services/firestore-service';
import {
  createMockDocumentReference,
  createMockDocumentSnapshot,
  createMockQuerySnapshot,
  createMockCollectionReference,
  createMockQuery,
  createMockWriteBatch,
  createMockTransaction,
} from '../../utils/firestore-mocks';

// Mock firebase-admin/firestore
jest.mock('firebase-admin/firestore');

const mockGetFirestore = getFirestore as jest.MockedFunction<typeof getFirestore>;
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

    // Create mocks
    mockDoc = createMockDocumentReference();
    mockQuery = createMockQuery();
    mockCollection = createMockCollectionReference();
    mockBatch = createMockWriteBatch();
    mockTransaction = createMockTransaction();

    // Setup mock implementations
    (mockCollection.doc as jest.Mock).mockReturnValue(mockDoc);
    (mockCollection.where as jest.Mock).mockReturnValue(mockQuery);
    (mockCollection.get as jest.Mock).mockResolvedValue(createMockQuerySnapshot());

    mockDb = {
      collection: jest.fn(() => mockCollection),
      batch: jest.fn(() => mockBatch),
      runTransaction: jest.fn(),
    };

    mockGetFirestore.mockReturnValue(mockDb);

    // Mock FieldValue methods
    mockFieldValue.serverTimestamp = jest.fn(() => 'mock-timestamp' as any);
    mockFieldValue.increment = jest.fn((value: number) => `increment-${value}` as any);
    mockFieldValue.arrayUnion = jest.fn((...elements) => `arrayUnion-${elements.length}` as any);
    mockFieldValue.arrayRemove = jest.fn((...elements) => `arrayRemove-${elements.length}` as any);

    firestoreService = FirestoreService.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createDocument', () => {
    it('should create document successfully', async () => {
      const data = { name: 'test', value: 123 };
      
      await firestoreService.createDocument({
        collection: 'test-collection',
        data,
      });

      expect(mockDb.collection).toHaveBeenCalledWith('test-collection');
      expect(mockCollection.doc).toHaveBeenCalled();
      expect(mockDoc.create).toHaveBeenCalledWith(data);
    });

    it('should handle creation errors', async () => {
      const error = new Error('Creation failed');
      (mockDoc.create as jest.Mock).mockRejectedValue(error);

      await expect(
        firestoreService.createDocument({
          collection: 'test-collection',
          data: { name: 'test' },
        })
      ).rejects.toThrow('Creation failed');
    });
  });
});
```

## Testing Patterns

### 1. Singleton Pattern Testing

```typescript
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
```

### 2. Transaction Testing

```typescript
describe('Transactions', () => {
  it('should run transaction successfully', async () => {
    const mockUpdateFunction = jest.fn().mockResolvedValue('result');
    
    await firestoreService.runTransaction(mockUpdateFunction);
    
    expect(mockDb.runTransaction).toHaveBeenCalledWith(mockUpdateFunction);
  });

  it('should handle transaction errors', async () => {
    const error = new Error('Transaction failed');
    mockDb.runTransaction.mockRejectedValue(error);
    
    await expect(
      firestoreService.runTransaction(jest.fn())
    ).rejects.toThrow('Transaction failed');
  });
});
```

### 3. Query Testing

```typescript
describe('Queries', () => {
  it('should query collection with filters', async () => {
    const mockDocs = [
      createMockDocumentSnapshot({ name: 'test1' }, true, 'doc1'),
      createMockDocumentSnapshot({ name: 'test2' }, true, 'doc2'),
    ];
    const mockQuerySnapshot = createMockQuerySnapshot(mockDocs);
    
    (mockQuery.get as jest.Mock).mockResolvedValue(mockQuerySnapshot);
    
    const result = await firestoreService.queryCollection('test-collection', [
      { field: 'status', operator: '==', value: 'active' }
    ]);
    
    expect(mockCollection.where).toHaveBeenCalledWith('status', '==', 'active');
    expect(result).toHaveLength(2);
  });
});
```

## Common Issues and Solutions

### 1. Type Compatibility Issues

**Problem**: TypeScript errors when mocking Firebase types.

**Solution**: Use `as unknown as Type` casting and create comprehensive mock objects.

```typescript
// Instead of this:
const mockDoc = {
  id: 'test-id',
  get: jest.fn(),
} as DocumentReference; // This will cause type errors

// Do this:
const mockDoc = {
  id: 'test-id',
  get: jest.fn(),
  set: jest.fn(),
  update: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
  collection: jest.fn(),
  parent: null,
  path: 'test-collection/test-id',
  firestore: {} as any,
  listCollections: jest.fn(),
  withConverter: jest.fn(),
} as unknown as DocumentReference;
```

### 2. Mock Return Values

**Problem**: Mocks not returning the expected types.

**Solution**: Ensure mock return values match the expected types.

```typescript
// Mock FieldValue methods correctly
mockFieldValue.serverTimestamp = jest.fn(() => 'mock-timestamp' as any);
mockFieldValue.increment = jest.fn((value: number) => `increment-${value}` as any);

// Mock async operations
(mockDoc.get as jest.Mock).mockResolvedValue(createMockDocumentSnapshot());
(mockCollection.get as jest.Mock).mockResolvedValue(createMockQuerySnapshot());
```

### 3. Singleton Pattern Testing

**Problem**: Tests affecting each other due to singleton pattern.

**Solution**: Reset the singleton instance before each test.

```typescript
beforeEach(() => {
  // Reset singleton instance
  (FirestoreService as any).instance = null;
  
  // Setup mocks...
  firestoreService = FirestoreService.getInstance();
});
```

## Examples

### Complete Service Test Example

```typescript
import {jest, describe, it, expect, beforeEach, afterEach} from '@jest/globals';
import {getFirestore, FieldValue} from 'firebase-admin/firestore';
import {FirestoreService} from '../../../src/core/services/firestore-service';
import {FirestoreServiceError} from '../../../src/core/errors';

jest.mock('firebase-admin/firestore');

describe('FirestoreService Integration', () => {
  let firestoreService: FirestoreService;
  let mockDb: any;

  beforeEach(() => {
    (FirestoreService as any).instance = null;
    
    // Setup comprehensive mocks
    mockDb = createComprehensiveFirestoreMock();
    (getFirestore as jest.Mock).mockReturnValue(mockDb);
    
    firestoreService = FirestoreService.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('CRUD Operations', () => {
    it('should perform full CRUD cycle', async () => {
      // Create
      const createData = { name: 'test', value: 123 };
      await firestoreService.createDocument({
        collection: 'test-collection',
        data: createData,
      });
      expect(mockDb.collection).toHaveBeenCalledWith('test-collection');

      // Read
      const mockDoc = createMockDocumentSnapshot(createData);
      (mockDb.collection().doc().get as jest.Mock).mockResolvedValue(mockDoc);
      
      const result = await firestoreService.getDocument('test-collection', 'test-id');
      expect(result).toEqual(createData);

      // Update
      const updateData = { value: 456 };
      await firestoreService.updateDocument('test-collection', 'test-id', updateData);
      expect(mockDb.collection().doc().update).toHaveBeenCalledWith(updateData);

      // Delete
      await firestoreService.deleteDocument('test-collection', 'test-id');
      expect(mockDb.collection().doc().delete).toHaveBeenCalled();
    });
  });
});

function createComprehensiveFirestoreMock() {
  const mockDoc = createMockDocumentReference();
  const mockCollection = createMockCollectionReference();
  const mockBatch = createMockWriteBatch();
  const mockTransaction = createMockTransaction();

  // Setup chainable mocks
  (mockCollection.doc as jest.Mock).mockReturnValue(mockDoc);
  (mockCollection.where as jest.Mock).mockReturnValue(createMockQuery());
  (mockCollection.get as jest.Mock).mockResolvedValue(createMockQuerySnapshot());

  return {
    collection: jest.fn(() => mockCollection),
    batch: jest.fn(() => mockBatch),
    runTransaction: jest.fn(),
  };
}
```

## Best Practices Summary

1. **Mock the entire Firebase Admin SDK** at the module level
2. **Use type-safe mock factories** that return properly typed objects
3. **Reset singleton instances** before each test
4. **Test both success and error scenarios**
5. **Use comprehensive mock objects** that implement all required methods
6. **Follow the actual Firebase API structure** in your mocks
7. **Use `as unknown as Type` casting** for complex type compatibility
8. **Mock async operations properly** with `mockResolvedValue` and `mockRejectedValue`
9. **Test transaction and batch operations** thoroughly
10. **Keep mocks simple and focused** on what your code actually uses

## Resources

- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [Firestore Testing Guide](https://firebase.google.com/docs/firestore/manage-data/enable-offline)
- [Jest Mocking Documentation](https://jestjs.io/docs/mock-functions)
- [TypeScript Handbook - Type Assertions](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions) 