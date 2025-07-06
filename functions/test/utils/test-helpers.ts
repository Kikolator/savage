import {jest} from '@jest/globals';
import {Request, Response} from 'express';

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

export const mockFirestoreDocument = (data: any = {}) => ({
  exists: true,
  data: () => data,
  id: 'test-doc-id',
  ref: {
    id: 'test-doc-id',
  },
});

export const mockFirestoreQuerySnapshot = (docs: any[] = []) => ({
  empty: docs.length === 0,
  size: docs.length,
  docs: docs.map((doc, index) => ({
    ...mockFirestoreDocument(doc),
    id: `doc-${index}`,
  })),
  forEach: jest.fn((callback: any) => {
    docs.forEach((doc, index) => {
      callback({
        ...mockFirestoreDocument(doc),
        id: `doc-${index}`,
      });
    });
  }),
});

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
