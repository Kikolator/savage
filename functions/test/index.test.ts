import {jest, describe, it, expect, beforeEach} from '@jest/globals';

// Mock all the modules
jest.mock('firebase-functions/v2', () => ({
  onRequest: jest.fn(() => jest.fn()),
  onCall: jest.fn(() => jest.fn()),
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('firebase-admin/app', () => ({
  initializeApp: jest.fn(),
  getApp: jest.fn(),
}));

jest.mock('./src/core/services/di', () => ({
  ServiceResolver: {
    getFirestoreService: jest.fn(),
    getSendgridService: jest.fn(),
    getOfficeRndService: jest.fn(),
    getTrialdayService: jest.fn(),
    getReferralService: jest.fn(),
    getEmailConfirmationService: jest.fn(),
    getRewardService: jest.fn(),
    getTrialdayMigrationService: jest.fn(),
    getGoogleCalService: jest.fn(),
    getBankPayoutService: jest.fn(),
  },
}));

jest.mock('./src/api/controllers', () => ({
  getControllersV1: jest.fn(() => []),
}));

jest.mock('./src/app-functions', () => ({
  initializeCallableFunctions: jest.fn(),
}));

jest.mock('./src/event-triggers', () => ({
  initializeEventTriggers: jest.fn(),
}));

jest.mock('./src/scheduled-events', () => ({
  initializeScheduledEvents: jest.fn(),
}));

describe('Index', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should export functions without throwing errors', () => {
    expect(() => {
      require('./src/index');
    }).not.toThrow();
  });

  it('should initialize all required services', () => {
    const {ServiceResolver} = require('./src/core/services/di');

    require('./src/index');

    // Verify that services are accessed (which means they're initialized)
    expect(ServiceResolver.getFirestoreService).toHaveBeenCalled();
    expect(ServiceResolver.getSendgridService).toHaveBeenCalled();
    expect(ServiceResolver.getOfficeRndService).toHaveBeenCalled();
    expect(ServiceResolver.getTrialdayService).toHaveBeenCalled();
    expect(ServiceResolver.getReferralService).toHaveBeenCalled();
  });

  it('should initialize controllers', () => {
    const {getControllersV1} = require('./src/api/controllers');

    require('./src/index');

    expect(getControllersV1).toHaveBeenCalled();
  });

  it('should initialize callable functions', () => {
    const {initializeCallableFunctions} = require('./src/app-functions');

    require('./src/index');

    expect(initializeCallableFunctions).toHaveBeenCalled();
  });

  it('should initialize event triggers', () => {
    const {initializeEventTriggers} = require('./src/event-triggers');

    require('./src/index');

    expect(initializeEventTriggers).toHaveBeenCalled();
  });

  it('should initialize scheduled events', () => {
    const {initializeScheduledEvents} = require('./src/scheduled-events');

    require('./src/index');

    expect(initializeScheduledEvents).toHaveBeenCalled();
  });
});
