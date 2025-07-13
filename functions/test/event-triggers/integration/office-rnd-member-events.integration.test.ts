import {jest, describe, it, expect, beforeEach, afterEach} from '@jest/globals';
import {logger} from 'firebase-functions/v2';

import {OfficeRndMemberEvents} from '../../../src/event-triggers/by-document/office-rnd-member-events';
import {OfficeRndMemberStatus} from '../../../src/core/data/enums';
import {
  handleMemberCreatedLogic,
  handleMemberStatusChangedLogic,
} from '../../../src/event-triggers/by-document/office-rnd-member-logic';

// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  getApp: jest.fn(),
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

jest.mock('firebase-functions/v2', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock the config
jest.mock('../../../src/core/config', () => ({
  STATIC_CONFIG: {
    region: 'us-central1',
  },
}));

describe('OfficeRndMemberEvents Integration', () => {
  let officeRndMemberEvents: OfficeRndMemberEvents;
  let mockLogger: jest.Mocked<typeof logger>;
  let registeredFunctions: Array<{name: string; handler: any}>;

  beforeEach(() => {
    officeRndMemberEvents = new OfficeRndMemberEvents();
    mockLogger = logger as jest.Mocked<typeof logger>;
    registeredFunctions = [];

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Event Handler Registration Integration', () => {
    it('should register event handlers with correct configuration', () => {
      const mockAdd = jest.fn((eventTrigger: any) => {
        registeredFunctions.push(eventTrigger);
      });

      officeRndMemberEvents.initialize(mockAdd);

      expect(registeredFunctions).toHaveLength(2);

      const createdHandler = registeredFunctions.find(
        (fn) => fn.name === 'onOfficeRndMemberCreated'
      );
      const updatedHandler = registeredFunctions.find(
        (fn) => fn.name === 'onOfficeRndMemberStatusChanged'
      );

      expect(createdHandler).toBeDefined();
      expect(updatedHandler).toBeDefined();
      expect(typeof createdHandler?.handler).toBe('function');
      expect(typeof updatedHandler?.handler).toBe('function');
    });
  });

  describe('Member Creation Logic Integration', () => {
    it('should handle complete member creation flow with ACTIVE status', () => {
      const memberData = {
        _id: 'integration-test-member-id',
        name: 'Integration Test User',
        email: 'integration@test.com',
        location: 'Integration Test Location',
        company: 'Integration Test Company',
        status: OfficeRndMemberStatus.ACTIVE,
        startDate: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01T10:00:00Z'),
        modifiedAt: new Date('2024-01-01T10:00:00Z'),
        properties: {
          phone: '+1234567890',
          notes: 'Integration test member',
        },
      };

      const result = handleMemberCreatedLogic(memberData, mockLogger);

      expect(result).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'New member created with active/drop-in status, adding to WhatsApp',
        {
          memberId: 'integration-test-member-id',
          memberName: 'Integration Test User',
          memberEmail: 'integration@test.com',
          status: OfficeRndMemberStatus.ACTIVE,
        }
      );
    });

    it('should handle member creation with DROP_IN status and complex properties', () => {
      const memberData = {
        _id: 'integration-test-dropin-id',
        name: 'Drop-in Test User',
        email: 'dropin@test.com',
        location: 'Drop-in Test Location',
        company: 'Drop-in Test Company',
        status: OfficeRndMemberStatus.DROP_IN,
        startDate: new Date('2024-01-02'),
        createdAt: new Date('2024-01-02T14:30:00Z'),
        modifiedAt: new Date('2024-01-02T14:30:00Z'),
        properties: {
          phone: '+1987654321',
          notes: 'Drop-in integration test',
          preferences: {
            newsletter: true,
            marketing: false,
          },
        },
      };

      const result = handleMemberCreatedLogic(memberData, mockLogger);

      expect(result).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'New member created with active/drop-in status, adding to WhatsApp',
        {
          memberId: 'integration-test-dropin-id',
          memberName: 'Drop-in Test User',
          memberEmail: 'dropin@test.com',
          status: OfficeRndMemberStatus.DROP_IN,
        }
      );
    });

    it('should handle member creation with non-active status without logging', () => {
      const memberData = {
        _id: 'integration-test-pending-id',
        name: 'Pending Test User',
        email: 'pending@test.com',
        location: 'Pending Test Location',
        company: 'Pending Test Company',
        status: OfficeRndMemberStatus.PENDING,
        startDate: new Date('2024-01-03'),
        createdAt: new Date('2024-01-03T09:15:00Z'),
        modifiedAt: new Date('2024-01-03T09:15:00Z'),
        properties: {},
      };

      const result = handleMemberCreatedLogic(memberData, mockLogger);

      expect(result).toBe(false);
      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });

  describe('Member Status Change Logic Integration', () => {
    it('should handle status transition from PENDING to ACTIVE', () => {
      const memberBefore = {
        _id: 'integration-test-member-id',
        name: 'Status Change Test User',
        email: 'statuschange@test.com',
        location: 'Status Change Test Location',
        company: 'Status Change Test Company',
        status: OfficeRndMemberStatus.PENDING,
        startDate: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01T10:00:00Z'),
        modifiedAt: new Date('2024-01-01T10:00:00Z'),
        properties: {},
      };

      const memberAfter = {
        ...memberBefore,
        status: OfficeRndMemberStatus.ACTIVE,
        modifiedAt: new Date('2024-01-01T11:00:00Z'),
      };

      const result = handleMemberStatusChangedLogic(
        memberBefore,
        memberAfter,
        mockLogger
      );

      expect(result).toBe('add');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Member status changed to active/drop-in, adding to WhatsApp',
        {
          memberId: 'integration-test-member-id',
          memberName: 'Status Change Test User',
          memberEmail: 'statuschange@test.com',
          previousStatus: OfficeRndMemberStatus.PENDING,
          newStatus: OfficeRndMemberStatus.ACTIVE,
        }
      );
    });

    it('should handle status transition from ACTIVE to FORMER', () => {
      const memberBefore = {
        _id: 'integration-test-member-id',
        name: 'Former Test User',
        email: 'former@test.com',
        location: 'Former Test Location',
        company: 'Former Test Company',
        status: OfficeRndMemberStatus.ACTIVE,
        startDate: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01T10:00:00Z'),
        modifiedAt: new Date('2024-01-01T10:00:00Z'),
        properties: {},
      };

      const memberAfter = {
        ...memberBefore,
        status: OfficeRndMemberStatus.FORMER,
        modifiedAt: new Date('2024-01-01T12:00:00Z'),
      };

      const result = handleMemberStatusChangedLogic(
        memberBefore,
        memberAfter,
        mockLogger
      );

      expect(result).toBe('remove');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Member status changed from active/drop-in, removing from WhatsApp',
        {
          memberId: 'integration-test-member-id',
          memberName: 'Former Test User',
          memberEmail: 'former@test.com',
          previousStatus: OfficeRndMemberStatus.ACTIVE,
          newStatus: OfficeRndMemberStatus.FORMER,
        }
      );
    });

    it('should handle status transition from DROP_IN to NOT_APPROVED', () => {
      const memberBefore = {
        _id: 'integration-test-member-id',
        name: 'Not Approved Test User',
        email: 'notapproved@test.com',
        location: 'Not Approved Test Location',
        company: 'Not Approved Test Company',
        status: OfficeRndMemberStatus.DROP_IN,
        startDate: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01T10:00:00Z'),
        modifiedAt: new Date('2024-01-01T10:00:00Z'),
        properties: {},
      };

      const memberAfter = {
        ...memberBefore,
        status: OfficeRndMemberStatus.NOT_APPROVED,
        modifiedAt: new Date('2024-01-01T13:00:00Z'),
      };

      const result = handleMemberStatusChangedLogic(
        memberBefore,
        memberAfter,
        mockLogger
      );

      expect(result).toBe('remove');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Member status changed from active/drop-in, removing from WhatsApp',
        {
          memberId: 'integration-test-member-id',
          memberName: 'Not Approved Test User',
          memberEmail: 'notapproved@test.com',
          previousStatus: OfficeRndMemberStatus.DROP_IN,
          newStatus: OfficeRndMemberStatus.NOT_APPROVED,
        }
      );
    });

    it('should not log for status changes between non-active/drop-in statuses', () => {
      const memberBefore = {
        _id: 'integration-test-member-id',
        name: 'Non Active Test User',
        email: 'nonactive@test.com',
        location: 'Non Active Test Location',
        company: 'Non Active Test Company',
        status: OfficeRndMemberStatus.PENDING,
        startDate: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01T10:00:00Z'),
        modifiedAt: new Date('2024-01-01T10:00:00Z'),
        properties: {},
      };

      const memberAfter = {
        ...memberBefore,
        status: OfficeRndMemberStatus.LEAD,
        modifiedAt: new Date('2024-01-01T14:00:00Z'),
      };

      const result = handleMemberStatusChangedLogic(
        memberBefore,
        memberAfter,
        mockLogger
      );

      expect(result).toBe(null);
      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle errors in member creation logic', () => {
      const memberData = {
        _id: 'error-test-member-id',
        name: 'Error Test User',
        email: 'error@test.com',
        location: 'Error Test Location',
        company: 'Error Test Company',
        status: OfficeRndMemberStatus.ACTIVE,
        startDate: new Date(),
        createdAt: new Date(),
        modifiedAt: new Date(),
        properties: {},
      };

      // Mock an error in the logger
      const testError = new Error('Integration test error');
      mockLogger.info.mockImplementation(() => {
        throw testError;
      });

      expect(() => {
        handleMemberCreatedLogic(memberData, mockLogger);
      }).toThrow('Integration test error');
    });

    it('should handle errors in member status change logic', () => {
      const memberBefore = {
        _id: 'error-test-member-id',
        name: 'Error Test User',
        email: 'error@test.com',
        location: 'Error Test Location',
        company: 'Error Test Company',
        status: OfficeRndMemberStatus.PENDING,
        startDate: new Date(),
        createdAt: new Date(),
        modifiedAt: new Date(),
        properties: {},
      };

      const memberAfter = {
        ...memberBefore,
        status: OfficeRndMemberStatus.ACTIVE,
      };

      // Mock an error in the logger
      const testError = new Error('Integration test error');
      mockLogger.info.mockImplementation(() => {
        throw testError;
      });

      expect(() => {
        handleMemberStatusChangedLogic(memberBefore, memberAfter, mockLogger);
      }).toThrow('Integration test error');
    });
  });
});
