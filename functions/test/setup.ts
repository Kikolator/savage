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
  onCall: jest.fn(),
  defineSecret: jest.fn(() => ({
    value: jest.fn(() => 'mock-secret-value'),
  })),
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
