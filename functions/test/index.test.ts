/* eslint-disable @typescript-eslint/no-var-requires */
import {jest, describe, it, expect, beforeEach, afterEach} from '@jest/globals';

// Minimal mocks for Firebase Functions v2 and Admin
jest.mock('firebase-admin/app', () => ({
  initializeApp: jest.fn(),
}));
jest.mock('firebase-functions/v2/https', () => ({
  onRequest: jest.fn(() => jest.fn()),
}));

beforeEach(() => {
  jest.clearAllMocks();
  delete require.cache[require.resolve('../src/index')];
});

describe('index.ts', () => {
  it('should load without throwing', () => {
    expect(() => require('../src/index')).not.toThrow();
  });

  it('should initialize Firebase Admin', () => {
    require('../src/index');
    const {initializeApp} = require('firebase-admin/app');
    expect(initializeApp).toHaveBeenCalled();
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

  it('should call onRequest to create the api function', () => {
    require('../src/index');
    const {onRequest} = require('firebase-functions/v2/https');
    expect(onRequest).toHaveBeenCalled();
  });
});
