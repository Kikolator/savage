import {jest} from '@jest/globals';
import {Request} from 'express';
import {
  DocumentSnapshot,
  QuerySnapshot,
  DocumentReference,
  CollectionReference,
  Query,
  DocumentData,
  WriteBatch,
  Transaction,
} from 'firebase-admin/firestore';

export interface MockRequest extends Partial<Request> {
  body?: any;
  query?: any;
  params?: any;
  headers?: any;
}

export interface MockResponse {
  status: jest.Mock;
  json: jest.Mock;
  send: jest.Mock;
  end: jest.Mock;
  set: jest.Mock;
}

export const createMockRequest = (
  overrides: MockRequest = {}
): MockRequest => ({
  body: {},
  query: {},
  params: {},
  headers: {},
  ...overrides,
});

export const createMockResponse = (): MockResponse => {
  const res: MockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
  };
  return res;
};

export const createMockCallableRequest = (data: any = {}) => ({
  data,
  auth: {
    uid: 'test-user-id',
    token: {
      email: 'test@example.com',
    },
  },
  rawRequest: {
    headers: {},
  },
});

export const createMockCallableResponse = () => ({
  success: jest.fn(),
  error: jest.fn(),
});

// Enhanced Firestore mocks with proper type compatibility
export const createMockDocumentReference = (
  id = 'test-doc-id'
): DocumentReference => {
  const mockDoc = {
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

  return mockDoc;
};

export const createMockDocumentSnapshot = (
  data: DocumentData = {},
  exists = true,
  id = 'test-doc-id'
): DocumentSnapshot => {
  const mockDocRef = createMockDocumentReference(id);

  const mockSnapshot = {
    exists,
    data: () => (exists ? data : undefined),
    id,
    ref: mockDocRef,
    readTime: {toDate: () => new Date()},
    get: jest.fn(),
    isEqual: jest.fn(),
  } as unknown as DocumentSnapshot;

  return mockSnapshot;
};

export const createMockQuerySnapshot = (
  docs: DocumentSnapshot[] = []
): QuerySnapshot => {
  const mockQuery = {
    where: jest.fn(),
    get: jest.fn(),
  } as unknown as Query;

  const mockSnapshot = {
    empty: docs.length === 0,
    size: docs.length,
    docs,
    query: mockQuery,
    readTime: {toDate: () => new Date()},
    docChanges: jest.fn(),
    forEach: jest.fn((callback: (doc: DocumentSnapshot) => void) => {
      docs.forEach(callback);
    }),
    isEqual: jest.fn(),
  } as unknown as QuerySnapshot;

  return mockSnapshot;
};

export const createMockCollectionReference = (): CollectionReference => {
  const mockCollection = {
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

  return mockCollection;
};

export const createMockQuery = (): Query => {
  const mockQuery = {
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

  return mockQuery;
};

export const createMockWriteBatch = (): WriteBatch => {
  const mockBatch = {
    set: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    create: jest.fn().mockReturnThis(),
    commit: jest.fn(),
  } as unknown as WriteBatch;

  return mockBatch;
};

export const createMockTransaction = (): Transaction => {
  const mockTransaction = {
    get: jest.fn(),
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
  } as unknown as Transaction;

  return mockTransaction;
};

// Legacy functions for backward compatibility
export const mockFirestoreDocument = (data: any = {}) =>
  createMockDocumentSnapshot(data);

export const mockFirestoreQuerySnapshot = (docs: any[] = []) => {
  const documentSnapshots = docs.map((doc, index) =>
    createMockDocumentSnapshot(doc, true, `doc-${index}`)
  );
  return createMockQuerySnapshot(documentSnapshots);
};

export const createMockCollection = (docs: any[] = []): CollectionReference => {
  const mockCollection = createMockCollectionReference();
  const querySnapshot = mockFirestoreQuerySnapshot(docs);

  // Setup mock implementations
  (mockCollection.get as any).mockResolvedValue(querySnapshot);
  (mockCollection.where as any).mockReturnValue(createMockQuery());
  (mockCollection.doc as any).mockImplementation((id?: string) => {
    return createMockDocumentReference(id || 'auto-generated-id');
  });

  return mockCollection;
};

export const createMockConfig = () => ({
  firebase: {
    projectId: 'test-project',
  },
  officeRnd: {
    apiKey: 'test-api-key',
    baseUrl: 'https://api.test.com',
  },
  sendgrid: {
    apiKey: 'test-sendgrid-key',
    fromEmail: 'test@example.com',
    fromName: 'Test Sender',
  },
  typeform: {
    accessToken: 'test-token',
    workspaceId: 'test-workspace',
  },
  cors: {
    origin: ['http://localhost:3000'],
    credentials: true,
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 100,
  },
  urls: {
    frontend: 'http://localhost:3000',
    api: 'http://localhost:5001',
  },
});

export const waitForAsync = (ms = 100) =>
  new Promise((resolve) => setTimeout(resolve, ms));
