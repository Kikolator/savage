/* eslint-disable @typescript-eslint/no-var-requires */
import {jest, describe, it, expect, beforeEach} from '@jest/globals';

// Minimal mocks for Firebase Functions v2 and Admin
jest.mock('firebase-admin/app', () => ({
  initializeApp: jest.fn(),
}));
jest.mock('firebase-functions/v2/https', () => ({
  onRequest: jest.fn(() => jest.fn()),
  onCall: jest.fn(() => jest.fn()),
}));

// Mock DI container and services
jest.doMock('../src/core/services/di/container', () => ({
  container: {
    resolve: jest.fn(() => ({})),
    has: jest.fn(() => true),
  },
  initializeContainer: jest.fn(),
}));

jest.doMock('../src/core/services/di/service-resolver', () => ({
  ServiceResolver: {
    getTrialdayService: jest.fn(() => ({})),
    getFirestoreService: jest.fn(() => ({})),
    getOfficeRndService: jest.fn(() => ({})),
    getSendgridService: jest.fn(() => ({})),
    getEmailConfirmationService: jest.fn(() => ({})),
    getReferralService: jest.fn(() => ({})),
    getRewardService: jest.fn(() => ({})),
    getBankPayoutService: jest.fn(() => ({})),
    getTrialdayMigrationService: jest.fn(() => ({})),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  // Clear the module cache to ensure fresh imports
  Object.keys(require.cache).forEach((key) => {
    if (
      key.includes('src/index') ||
      key.includes('firebase-admin/app') ||
      key.includes('firebase-functions/v2/https')
    ) {
      delete require.cache[key];
    }
  });
});

describe('index.ts', () => {
  it('should load without throwing', () => {
    expect(() => require('../src/index')).not.toThrow();
  });

  it('should export an api function', () => {
    const exports = require('../src/index');
    expect(exports.api).toBeDefined();
    expect(typeof exports.api).toBe('function');
  });

  it('should export other functions as functions', () => {
    const exports = require('../src/index');
    Object.keys(exports).forEach((key) => {
      expect(typeof exports[key]).toBe('function');
    });
  });
});
