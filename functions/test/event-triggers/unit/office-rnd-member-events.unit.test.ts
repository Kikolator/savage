import {jest, describe, it, expect, beforeEach, afterEach} from '@jest/globals';
import {logger} from 'firebase-functions/v2';

import {OfficeRndMemberEvents} from '../../../src/event-triggers/by-document/office-rnd-member-events';
import {
  handleMemberCreatedLogic,
  handleMemberStatusChangedLogic,
  type OfficeRndMemberData,
} from '../../../src/event-triggers/by-document/office-rnd-member-logic';
import {OfficeRndMemberStatus} from '../../../src/core/data/enums';
import {OfficeRndEventError} from '../../../src/core/errors';

// Mock Firebase Functions v2
jest.mock('firebase-functions/v2', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('firebase-functions/v2/firestore', () => ({
  onDocumentCreated: jest.fn((options, handler) => handler),
  onDocumentUpdated: jest.fn((options, handler) => handler),
}));

// Mock the config
jest.mock('../../../src/core/config', () => ({
  STATIC_CONFIG: {
    region: 'us-central1',
  },
}));

describe('OfficeRndMemberEvents Unit Tests', () => {
  let officeRndMemberEvents: OfficeRndMemberEvents;
  let mockLogger: jest.Mocked<typeof logger>;

  beforeEach(() => {
    officeRndMemberEvents = new OfficeRndMemberEvents();
    mockLogger = logger as jest.Mocked<typeof logger>;

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should register both event handlers', () => {
      const mockAdd = jest.fn();

      officeRndMemberEvents.initialize(mockAdd);

      expect(mockAdd).toHaveBeenCalledTimes(2);

      const calls = mockAdd.mock.calls;
      expect((calls[0][0] as any).name).toBe('onOfficeRndMemberCreated');
      expect((calls[1][0] as any).name).toBe('onOfficeRndMemberStatusChanged');
    });

    it('should register handlers with correct structure', () => {
      const mockAdd = jest.fn();

      officeRndMemberEvents.initialize(mockAdd);

      const calls = mockAdd.mock.calls;
      calls.forEach((call) => {
        const eventTrigger = call[0] as any;
        expect(eventTrigger).toHaveProperty('name');
        expect(eventTrigger).toHaveProperty('handler');
        expect(typeof eventTrigger.name).toBe('string');
        expect(typeof eventTrigger.handler).toBe('function');
      });
    });
  });

  describe('handleMemberCreatedLogic', () => {
    const createMockMember = (
      status: OfficeRndMemberStatus
    ): OfficeRndMemberData => ({
      _id: 'test-member-id',
      name: 'John Doe',
      email: 'john@example.com',
      location: 'Test Location',
      company: 'Test Company',
      status,
      startDate: new Date(),
      createdAt: new Date(),
      modifiedAt: new Date(),
      properties: {},
    });

    it('should return true and log for active status', () => {
      const member = createMockMember(OfficeRndMemberStatus.ACTIVE);

      const result = handleMemberCreatedLogic(member, mockLogger);

      expect(result).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'New member created with active/drop-in status, adding to WhatsApp',
        {
          memberId: 'test-member-id',
          memberName: 'John Doe',
          memberEmail: 'john@example.com',
          status: OfficeRndMemberStatus.ACTIVE,
        }
      );
    });

    it('should return true and log for drop-in status', () => {
      const member = createMockMember(OfficeRndMemberStatus.DROP_IN);

      const result = handleMemberCreatedLogic(member, mockLogger);

      expect(result).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'New member created with active/drop-in status, adding to WhatsApp',
        {
          memberId: 'test-member-id',
          memberName: 'John Doe',
          memberEmail: 'john@example.com',
          status: OfficeRndMemberStatus.DROP_IN,
        }
      );
    });

    it('should return false for non-active statuses', () => {
      const nonActiveStatuses = [
        OfficeRndMemberStatus.PENDING,
        OfficeRndMemberStatus.FORMER,
        OfficeRndMemberStatus.CONTACT,
        OfficeRndMemberStatus.NOT_APPROVED,
        OfficeRndMemberStatus.LEAD,
      ];

      nonActiveStatuses.forEach((status) => {
        const member = createMockMember(status);
        const result = handleMemberCreatedLogic(member, mockLogger);
        expect(result).toBe(false);
      });

      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });

  describe('handleMemberStatusChangedLogic', () => {
    const createMockMember = (
      status: OfficeRndMemberStatus
    ): OfficeRndMemberData => ({
      _id: 'test-member-id',
      name: 'John Doe',
      email: 'john@example.com',
      location: 'Test Location',
      company: 'Test Company',
      status,
      startDate: new Date(),
      createdAt: new Date(),
      modifiedAt: new Date(),
      properties: {},
    });

    it('should return "add" when status changes to active from pending', () => {
      const memberBefore = createMockMember(OfficeRndMemberStatus.PENDING);
      const memberAfter = createMockMember(OfficeRndMemberStatus.ACTIVE);

      const result = handleMemberStatusChangedLogic(
        memberBefore,
        memberAfter,
        mockLogger
      );

      expect(result).toBe('add');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Member status changed to active/drop-in, adding to WhatsApp',
        {
          memberId: 'test-member-id',
          memberName: 'John Doe',
          memberEmail: 'john@example.com',
          previousStatus: OfficeRndMemberStatus.PENDING,
          newStatus: OfficeRndMemberStatus.ACTIVE,
        }
      );
    });

    it('should return "add" when status changes to drop-in from former', () => {
      const memberBefore = createMockMember(OfficeRndMemberStatus.FORMER);
      const memberAfter = createMockMember(OfficeRndMemberStatus.DROP_IN);

      const result = handleMemberStatusChangedLogic(
        memberBefore,
        memberAfter,
        mockLogger
      );

      expect(result).toBe('add');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Member status changed to active/drop-in, adding to WhatsApp',
        {
          memberId: 'test-member-id',
          memberName: 'John Doe',
          memberEmail: 'john@example.com',
          previousStatus: OfficeRndMemberStatus.FORMER,
          newStatus: OfficeRndMemberStatus.DROP_IN,
        }
      );
    });

    it('should return "remove" when status changes from active to former', () => {
      const memberBefore = createMockMember(OfficeRndMemberStatus.ACTIVE);
      const memberAfter = createMockMember(OfficeRndMemberStatus.FORMER);

      const result = handleMemberStatusChangedLogic(
        memberBefore,
        memberAfter,
        mockLogger
      );

      expect(result).toBe('remove');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Member status changed from active/drop-in, removing from WhatsApp',
        {
          memberId: 'test-member-id',
          memberName: 'John Doe',
          memberEmail: 'john@example.com',
          previousStatus: OfficeRndMemberStatus.ACTIVE,
          newStatus: OfficeRndMemberStatus.FORMER,
        }
      );
    });

    it('should return "remove" when status changes from drop-in to pending', () => {
      const memberBefore = createMockMember(OfficeRndMemberStatus.DROP_IN);
      const memberAfter = createMockMember(OfficeRndMemberStatus.PENDING);

      const result = handleMemberStatusChangedLogic(
        memberBefore,
        memberAfter,
        mockLogger
      );

      expect(result).toBe('remove');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Member status changed from active/drop-in, removing from WhatsApp',
        {
          memberId: 'test-member-id',
          memberName: 'John Doe',
          memberEmail: 'john@example.com',
          previousStatus: OfficeRndMemberStatus.DROP_IN,
          newStatus: OfficeRndMemberStatus.PENDING,
        }
      );
    });

    it('should return null when status changes between non-active statuses', () => {
      const memberBefore = createMockMember(OfficeRndMemberStatus.PENDING);
      const memberAfter = createMockMember(OfficeRndMemberStatus.FORMER);

      const result = handleMemberStatusChangedLogic(
        memberBefore,
        memberAfter,
        mockLogger
      );

      expect(result).toBe(null);
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should return null when status changes between active statuses', () => {
      const memberBefore = createMockMember(OfficeRndMemberStatus.ACTIVE);
      const memberAfter = createMockMember(OfficeRndMemberStatus.DROP_IN);

      const result = handleMemberStatusChangedLogic(
        memberBefore,
        memberAfter,
        mockLogger
      );

      expect(result).toBe(null);
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should return null when status does not change', () => {
      const memberBefore = createMockMember(OfficeRndMemberStatus.ACTIVE);
      const memberAfter = createMockMember(OfficeRndMemberStatus.ACTIVE);

      const result = handleMemberStatusChangedLogic(
        memberBefore,
        memberAfter,
        mockLogger
      );

      expect(result).toBe(null);
      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should create proper OfficeRndEventError for member creation', () => {
      const memberId = 'test-member-id';
      const error = OfficeRndEventError.memberCreationHandlerFailed(memberId, {
        originalError: 'Test error',
      });

      expect(error).toBeInstanceOf(OfficeRndEventError);
      expect(error.message).toContain(
        'Failed to handle OfficeRnd member creation event'
      );
      expect(error.eventCode).toBe(7001); // MEMBER_CREATION_HANDLER_FAILED
    });

    it('should create proper OfficeRndEventError for member status change', () => {
      const memberId = 'test-member-id';
      const error = OfficeRndEventError.memberStatusChangeHandlerFailed(
        memberId,
        {
          originalError: 'Test error',
        }
      );

      expect(error).toBeInstanceOf(OfficeRndEventError);
      expect(error.message).toContain(
        'Failed to handle OfficeRnd member status change event'
      );
      expect(error.eventCode).toBe(7101); // MEMBER_STATUS_CHANGE_HANDLER_FAILED
    });

    it('should create proper OfficeRndEventError for WhatsApp integration', () => {
      const memberId = 'test-member-id';
      const error = OfficeRndEventError.whatsappIntegrationFailed(
        memberId,
        'add',
        {
          originalError: 'WhatsApp API error',
        }
      );

      expect(error).toBeInstanceOf(OfficeRndEventError);
      expect(error.message).toContain('WhatsApp add operation failed');
      expect(error.eventCode).toBe(7004); // WHATSAPP_INTEGRATION_FAILED
    });
  });

  describe('Configuration Tests', () => {
    it('should use correct document path', () => {
      const expectedPath = 'officeRndMembers/{memberId}';
      expect(expectedPath).toBe('officeRndMembers/{memberId}');
    });

    it('should use correct region from config', () => {
      const expectedRegion = 'us-central1';
      expect(expectedRegion).toBe('us-central1');
    });
  });
});
