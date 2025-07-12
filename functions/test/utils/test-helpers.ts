import {jest} from '@jest/globals';
import {Request} from 'express';

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

// Enhanced Firestore mocks for correct structure
export const mockFirestoreDocument = (data: any = {}) => ({
  exists: true,
  data: () => data,
  id: 'test-doc-id',
  ref: {
    id: 'test-doc-id',
  },
  collection: jest.fn(() => ({
    get: jest.fn().mockResolvedValue({
      empty: true,
      size: 0,
      docs: [],
      forEach: jest.fn(),
    }),
  })),
});

export const mockFirestoreQuerySnapshot = (docs: any[] = []) => ({
  empty: docs.length === 0,
  size: docs.length,
  docs: docs.map((doc, index) => ({
    exists: true,
    data: () => doc,
    id: `doc-${index}`,
    ref: {id: `doc-${index}`},
    collection: jest.fn(() => ({
      get: jest.fn().mockResolvedValue({
        empty: true,
        size: 0,
        docs: [],
        forEach: jest.fn(),
      }),
    })),
  })),
  forEach: jest.fn((callback: any) => {
    docs.forEach((doc, index) => {
      callback({
        exists: true,
        data: () => doc,
        id: `doc-${index}`,
        ref: {id: `doc-${index}`},
        collection: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({
            empty: true,
            size: 0,
            docs: [],
            forEach: jest.fn(),
          }),
        })),
      });
    });
  }),
});

// Helper to create a mock collection with .get, .where, and .doc
export const createMockCollection = (docs: any[] = []): any => {
  const querySnapshot = mockFirestoreQuerySnapshot(docs);
  return {
    get: jest.fn().mockResolvedValue(querySnapshot),
    where: jest.fn(() => ({
      get: jest.fn().mockResolvedValue(querySnapshot),
      where: jest.fn(),
    })),
    doc: jest.fn((id?: string) =>
      mockFirestoreDocument(docs.find((d) => d.id === id) || {})
    ),
    collection: jest.fn(() => ({
      get: jest.fn().mockResolvedValue({
        empty: true,
        size: 0,
        docs: [],
        forEach: jest.fn(),
      }),
    })),
  };
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
