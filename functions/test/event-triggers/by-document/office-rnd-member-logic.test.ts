import {jest, describe, it, expect, beforeEach} from '@jest/globals';

import {
  handleMemberCreatedLogic,
  handleMemberStatusChangedLogic,
  type OfficeRndMemberData,
} from '../../../src/event-triggers/by-document/office-rnd-member-logic';
import {OfficeRndMemberStatus} from '../../../src/core/data/enums';

// Mock the logger
jest.mock('firebase-functions/v2', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('OfficeRndMember Logic Tests', () => {
  const baseMember: OfficeRndMemberData = {
    _id: 'test-member-id',
    name: 'Test Member',
    email: 'test@example.com',
    location: 'Test Location',
    company: 'Test Company',
    status: OfficeRndMemberStatus.PENDING, // Default status, will be overridden in tests
    startDate: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01T10:00:00Z'),
    modifiedAt: new Date('2024-01-01T10:00:00Z'),
    properties: {},
  };

  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe('handleMemberCreatedLogic', () => {
    it('should log and return true for ACTIVE status', () => {
      const member = {...baseMember, status: OfficeRndMemberStatus.ACTIVE};
      const result = handleMemberCreatedLogic(member, mockLogger);

      expect(result).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'New member created with active/drop-in status, adding to WhatsApp',
        {
          memberId: 'test-member-id',
          memberName: 'Test Member',
          memberEmail: 'test@example.com',
          status: OfficeRndMemberStatus.ACTIVE,
        }
      );
    });

    it('should log and return true for DROP_IN status', () => {
      const member = {...baseMember, status: OfficeRndMemberStatus.DROP_IN};
      const result = handleMemberCreatedLogic(member, mockLogger);

      expect(result).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'New member created with active/drop-in status, adding to WhatsApp',
        {
          memberId: 'test-member-id',
          memberName: 'Test Member',
          memberEmail: 'test@example.com',
          status: OfficeRndMemberStatus.DROP_IN,
        }
      );
    });

    it('should return false and not log for PENDING status', () => {
      const member = {...baseMember, status: OfficeRndMemberStatus.PENDING};
      const result = handleMemberCreatedLogic(member, mockLogger);

      expect(result).toBe(false);
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should return false and not log for FORMER status', () => {
      const member = {...baseMember, status: OfficeRndMemberStatus.FORMER};
      const result = handleMemberCreatedLogic(member, mockLogger);

      expect(result).toBe(false);
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should return false and not log for CONTACT status', () => {
      const member = {...baseMember, status: OfficeRndMemberStatus.CONTACT};
      const result = handleMemberCreatedLogic(member, mockLogger);

      expect(result).toBe(false);
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should return false and not log for NOT_APPROVED status', () => {
      const member = {
        ...baseMember,
        status: OfficeRndMemberStatus.NOT_APPROVED,
      };
      const result = handleMemberCreatedLogic(member, mockLogger);

      expect(result).toBe(false);
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should return false and not log for LEAD status', () => {
      const member = {...baseMember, status: OfficeRndMemberStatus.LEAD};
      const result = handleMemberCreatedLogic(member, mockLogger);

      expect(result).toBe(false);
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should use default logger when not provided', () => {
      const member = {...baseMember, status: OfficeRndMemberStatus.ACTIVE};
      const result = handleMemberCreatedLogic(member);

      expect(result).toBe(true);
      // Note: We can't easily test the default logger without more complex mocking
    });
  });

  describe('handleMemberStatusChangedLogic', () => {
    it('should return "add" and log for status change from PENDING to ACTIVE', () => {
      const memberBefore = {
        ...baseMember,
        status: OfficeRndMemberStatus.PENDING,
      };
      const memberAfter = {...baseMember, status: OfficeRndMemberStatus.ACTIVE};

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
          memberName: 'Test Member',
          memberEmail: 'test@example.com',
          previousStatus: OfficeRndMemberStatus.PENDING,
          newStatus: OfficeRndMemberStatus.ACTIVE,
        }
      );
    });

    it('should return "add" and log for status change from LEAD to DROP_IN', () => {
      const memberBefore = {...baseMember, status: OfficeRndMemberStatus.LEAD};
      const memberAfter = {
        ...baseMember,
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
          memberName: 'Test Member',
          memberEmail: 'test@example.com',
          previousStatus: OfficeRndMemberStatus.LEAD,
          newStatus: OfficeRndMemberStatus.DROP_IN,
        }
      );
    });

    it('should return "remove" and log for status change from ACTIVE to FORMER', () => {
      const memberBefore = {
        ...baseMember,
        status: OfficeRndMemberStatus.ACTIVE,
      };
      const memberAfter = {...baseMember, status: OfficeRndMemberStatus.FORMER};

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
          memberName: 'Test Member',
          memberEmail: 'test@example.com',
          previousStatus: OfficeRndMemberStatus.ACTIVE,
          newStatus: OfficeRndMemberStatus.FORMER,
        }
      );
    });

    it('should return "remove" and log for status change from DROP_IN to NOT_APPROVED', () => {
      const memberBefore = {
        ...baseMember,
        status: OfficeRndMemberStatus.DROP_IN,
      };
      const memberAfter = {
        ...baseMember,
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
          memberName: 'Test Member',
          memberEmail: 'test@example.com',
          previousStatus: OfficeRndMemberStatus.DROP_IN,
          newStatus: OfficeRndMemberStatus.NOT_APPROVED,
        }
      );
    });

    it('should return null and not log for status change from PENDING to LEAD', () => {
      const memberBefore = {
        ...baseMember,
        status: OfficeRndMemberStatus.PENDING,
      };
      const memberAfter = {...baseMember, status: OfficeRndMemberStatus.LEAD};

      const result = handleMemberStatusChangedLogic(
        memberBefore,
        memberAfter,
        mockLogger
      );

      expect(result).toBeNull();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should return null and not log for status change from ACTIVE to DROP_IN', () => {
      const memberBefore = {
        ...baseMember,
        status: OfficeRndMemberStatus.ACTIVE,
      };
      const memberAfter = {
        ...baseMember,
        status: OfficeRndMemberStatus.DROP_IN,
      };

      const result = handleMemberStatusChangedLogic(
        memberBefore,
        memberAfter,
        mockLogger
      );

      expect(result).toBeNull();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should return null and not log for status change from DROP_IN to ACTIVE', () => {
      const memberBefore = {
        ...baseMember,
        status: OfficeRndMemberStatus.DROP_IN,
      };
      const memberAfter = {...baseMember, status: OfficeRndMemberStatus.ACTIVE};

      const result = handleMemberStatusChangedLogic(
        memberBefore,
        memberAfter,
        mockLogger
      );

      expect(result).toBeNull();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should return null and not log when status has not changed', () => {
      const memberBefore = {
        ...baseMember,
        status: OfficeRndMemberStatus.ACTIVE,
      };
      const memberAfter = {...baseMember, status: OfficeRndMemberStatus.ACTIVE};

      const result = handleMemberStatusChangedLogic(
        memberBefore,
        memberAfter,
        mockLogger
      );

      expect(result).toBeNull();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should return null and not log for status change from PENDING to PENDING (no change)', () => {
      const memberBefore = {
        ...baseMember,
        status: OfficeRndMemberStatus.PENDING,
      };
      const memberAfter = {
        ...baseMember,
        status: OfficeRndMemberStatus.PENDING,
      };

      const result = handleMemberStatusChangedLogic(
        memberBefore,
        memberAfter,
        mockLogger
      );

      expect(result).toBeNull();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should use default logger when not provided', () => {
      const memberBefore = {
        ...baseMember,
        status: OfficeRndMemberStatus.PENDING,
      };
      const memberAfter = {...baseMember, status: OfficeRndMemberStatus.ACTIVE};

      const result = handleMemberStatusChangedLogic(memberBefore, memberAfter);

      expect(result).toBe('add');
      // Note: We can't easily test the default logger without more complex mocking
    });

    it('should handle complex member data correctly', () => {
      const complexMemberBefore = {
        ...baseMember,
        status: OfficeRndMemberStatus.PENDING,
        properties: {
          phone: '+1234567890',
          notes: 'Test member with complex properties',
          preferences: {
            newsletter: true,
            marketing: false,
          },
        },
      };
      const complexMemberAfter = {
        ...complexMemberBefore,
        status: OfficeRndMemberStatus.ACTIVE,
        modifiedAt: new Date('2024-01-01T11:00:00Z'),
      };

      const result = handleMemberStatusChangedLogic(
        complexMemberBefore,
        complexMemberAfter,
        mockLogger
      );

      expect(result).toBe('add');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Member status changed to active/drop-in, adding to WhatsApp',
        {
          memberId: 'test-member-id',
          memberName: 'Test Member',
          memberEmail: 'test@example.com',
          previousStatus: OfficeRndMemberStatus.PENDING,
          newStatus: OfficeRndMemberStatus.ACTIVE,
        }
      );
    });
  });
});
