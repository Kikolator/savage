import {jest, describe, it, expect, beforeEach, afterEach} from '@jest/globals';
import {logger} from 'firebase-functions/v2';

import {OfficeRndMemberEvents} from '../../../src/event-triggers/by-document/office-rnd-member-events';
import {OfficeRndMemberStatus} from '../../../src/core/data/enums';
import {
  handleMemberCreatedLogic,
  handleMemberStatusChangedLogic,
} from '../../../src/event-triggers/by-document/office-rnd-member-logic';
import {EventTriggerV2Function} from '../../../src/event-triggers/initialize-event-triggers';

// Mock the logger
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

describe('OfficeRndMemberEvents', () => {
  let officeRndMemberEvents: OfficeRndMemberEvents;

  beforeEach(() => {
    officeRndMemberEvents = new OfficeRndMemberEvents();

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
      expect((calls[0][0] as EventTriggerV2Function).name).toBe(
        'onOfficeRndMemberCreated'
      );
      expect((calls[1][0] as EventTriggerV2Function).name).toBe(
        'onOfficeRndMemberStatusChanged'
      );
    });
  });

  describe('Firebase Function Configuration', () => {
    it('should configure onDocumentCreated with correct options', () => {
      const mockAdd = jest.fn();
      officeRndMemberEvents.initialize(mockAdd);

      // Get the first handler (onMemberCreated)
      const onMemberCreatedHandler = mockAdd.mock
        .calls[0][0] as EventTriggerV2Function;

      // Verify the handler has the correct structure
      expect(onMemberCreatedHandler.name).toBe('onOfficeRndMemberCreated');
      expect(onMemberCreatedHandler.handler).toBeDefined();
    });

    it('should configure onDocumentUpdated with correct options', () => {
      const mockAdd = jest.fn();
      officeRndMemberEvents.initialize(mockAdd);

      // Get the second handler (onMemberStatusChanged)
      const onMemberStatusChangedHandler = mockAdd.mock
        .calls[1][0] as EventTriggerV2Function;

      // Verify the handler has the correct structure
      expect(onMemberStatusChangedHandler.name).toBe(
        'onOfficeRndMemberStatusChanged'
      );
      expect(onMemberStatusChangedHandler.handler).toBeDefined();
    });
  });
});

describe('OfficeRndMember Logic Functions', () => {
  let mockLogger: jest.Mocked<typeof logger>;

  beforeEach(() => {
    mockLogger = logger as jest.Mocked<typeof logger>;
    jest.clearAllMocks();
  });

  describe('handleMemberCreatedLogic', () => {
    it('should handle member creation with ACTIVE status', () => {
      const memberData = {
        _id: 'test-member-id',
        name: 'John Doe',
        email: 'john@example.com',
        location: 'Test Location',
        company: 'Test Company',
        status: OfficeRndMemberStatus.ACTIVE,
        startDate: new Date(),
        createdAt: new Date(),
        modifiedAt: new Date(),
        properties: {},
      };

      const result = handleMemberCreatedLogic(memberData, mockLogger);

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

    it('should handle member creation with DROP_IN status', () => {
      const memberData = {
        _id: 'test-member-id',
        name: 'Jane Smith',
        email: 'jane@example.com',
        location: 'Test Location',
        company: 'Test Company',
        status: OfficeRndMemberStatus.DROP_IN,
        startDate: new Date(),
        createdAt: new Date(),
        modifiedAt: new Date(),
        properties: {},
      };

      const result = handleMemberCreatedLogic(memberData, mockLogger);

      expect(result).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'New member created with active/drop-in status, adding to WhatsApp',
        {
          memberId: 'test-member-id',
          memberName: 'Jane Smith',
          memberEmail: 'jane@example.com',
          status: OfficeRndMemberStatus.DROP_IN,
        }
      );
    });

    it('should not log for non-active/drop-in statuses', () => {
      const memberData = {
        _id: 'test-member-id',
        name: 'Bob Wilson',
        email: 'bob@example.com',
        location: 'Test Location',
        company: 'Test Company',
        status: OfficeRndMemberStatus.PENDING,
        startDate: new Date(),
        createdAt: new Date(),
        modifiedAt: new Date(),
        properties: {},
      };

      const result = handleMemberCreatedLogic(memberData, mockLogger);

      expect(result).toBe(false);
      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });

  describe('handleMemberStatusChangedLogic', () => {
    it('should handle status change to ACTIVE', () => {
      const memberBefore = {
        _id: 'test-member-id',
        name: 'John Doe',
        email: 'john@example.com',
        location: 'Test Location',
        company: 'Test Company',
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

    it('should handle status change to DROP_IN', () => {
      const memberBefore = {
        _id: 'test-member-id',
        name: 'Jane Smith',
        email: 'jane@example.com',
        location: 'Test Location',
        company: 'Test Company',
        status: OfficeRndMemberStatus.LEAD,
        startDate: new Date(),
        createdAt: new Date(),
        modifiedAt: new Date(),
        properties: {},
      };

      const memberAfter = {
        ...memberBefore,
        status: OfficeRndMemberStatus.DROP_IN,
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
          memberId: 'test-member-id',
          memberName: 'Jane Smith',
          memberEmail: 'jane@example.com',
          previousStatus: OfficeRndMemberStatus.LEAD,
          newStatus: OfficeRndMemberStatus.DROP_IN,
        }
      );
    });

    it('should handle status change from ACTIVE to FORMER', () => {
      const memberBefore = {
        _id: 'test-member-id',
        name: 'Bob Wilson',
        email: 'bob@example.com',
        location: 'Test Location',
        company: 'Test Company',
        status: OfficeRndMemberStatus.ACTIVE,
        startDate: new Date(),
        createdAt: new Date(),
        modifiedAt: new Date(),
        properties: {},
      };

      const memberAfter = {
        ...memberBefore,
        status: OfficeRndMemberStatus.FORMER,
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
          memberId: 'test-member-id',
          memberName: 'Bob Wilson',
          memberEmail: 'bob@example.com',
          previousStatus: OfficeRndMemberStatus.ACTIVE,
          newStatus: OfficeRndMemberStatus.FORMER,
        }
      );
    });

    it('should handle status change from DROP_IN to NOT_APPROVED', () => {
      const memberBefore = {
        _id: 'test-member-id',
        name: 'Alice Johnson',
        email: 'alice@example.com',
        location: 'Test Location',
        company: 'Test Company',
        status: OfficeRndMemberStatus.DROP_IN,
        startDate: new Date(),
        createdAt: new Date(),
        modifiedAt: new Date(),
        properties: {},
      };

      const memberAfter = {
        ...memberBefore,
        status: OfficeRndMemberStatus.NOT_APPROVED,
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
          memberId: 'test-member-id',
          memberName: 'Alice Johnson',
          memberEmail: 'alice@example.com',
          previousStatus: OfficeRndMemberStatus.DROP_IN,
          newStatus: OfficeRndMemberStatus.NOT_APPROVED,
        }
      );
    });

    it('should not log for status changes between non-active/drop-in statuses', () => {
      const memberBefore = {
        _id: 'test-member-id',
        name: 'Charlie Brown',
        email: 'charlie@example.com',
        location: 'Test Location',
        company: 'Test Company',
        status: OfficeRndMemberStatus.PENDING,
        startDate: new Date(),
        createdAt: new Date(),
        modifiedAt: new Date(),
        properties: {},
      };

      const memberAfter = {
        ...memberBefore,
        status: OfficeRndMemberStatus.LEAD,
      };

      const result = handleMemberStatusChangedLogic(
        memberBefore,
        memberAfter,
        mockLogger
      );

      expect(result).toBe(null);
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should not log for status changes within active/drop-in statuses', () => {
      const memberBefore = {
        _id: 'test-member-id',
        name: 'David Wilson',
        email: 'david@example.com',
        location: 'Test Location',
        company: 'Test Company',
        status: OfficeRndMemberStatus.ACTIVE,
        startDate: new Date(),
        createdAt: new Date(),
        modifiedAt: new Date(),
        properties: {},
      };

      const memberAfter = {
        ...memberBefore,
        status: OfficeRndMemberStatus.DROP_IN,
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
});
