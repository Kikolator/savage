import {jest} from '@jest/globals';

// Mock Firebase Functions
jest.mock('firebase-functions', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  onRequest: jest.fn(),
  onCall: jest.fn((options, handler) => handler), // Return the handler function directly
  defineSecret: jest.fn(() => ({
    value: jest.fn(() => 'mock-secret-value'),
  })),
}));

// Mock Firebase Functions v2
jest.mock('firebase-functions/v2', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  onCall: jest.fn((options, handler) => handler), // Return the handler function directly
  https: {
    onCall: jest.fn((options, handler) => handler), // Return the handler function directly
  },
}));

// Mock Firebase Functions v2/scheduler
jest.mock('firebase-functions/v2/scheduler', () => ({
  onSchedule: jest.fn((options, handler) => handler), // Return the handler function directly
}));

// Mock Firebase Functions v2/https
jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: class HttpsError extends Error {
    constructor(
      public code: string,
      public message: string
    ) {
      super(message);
      this.code = code;
    }
  },
  onCall: jest.fn((options, handler) => handler), // Return the handler function directly
}));

// Mock Firebase Admin
jest.mock('firebase-admin/app', () => ({
  initializeApp: jest.fn(),
  getApp: jest.fn(),
}));

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      })),
      get: jest.fn(),
      where: jest.fn(),
    })),
    batch: jest.fn(() => ({
      set: jest.fn(),
      commit: jest.fn(),
    })),
    runTransaction: jest.fn(),
  })),
  FieldValue: {
    serverTimestamp: jest.fn(() => 'mock-timestamp'),
  },
}));

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.FIREBASE_PROJECT_ID = 'test-project';
process.env.FUNCTIONS_EMULATOR = 'true';

// Global test utilities
global.console = {
  ...console,
  // Suppress console.log during tests unless explicitly needed
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
