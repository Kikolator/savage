import {jest, describe, it, expect, beforeEach, afterEach} from '@jest/globals';
import {logger} from 'firebase-functions/v2';
import {onDocumentUpdated} from 'firebase-functions/v2/firestore';

import {TrialdayEvents} from '../../../src/event-triggers/by-document/trialday-events';
import {TrialdayService} from '../../../src/core/services/trialday-service';
import {ReferralService} from '../../../src/core/services/referral-service';
import OfficeRndService from '../../../src/core/services/office-rnd-service';
import {
  TrialdayStatus,
  OfficeRndMemberStatus,
} from '../../../src/core/data/enums';
import {TrialdayEventError} from '../../../src/core/errors';
import {STATIC_CONFIG, SECRET_REFERENCES} from '../../../src/core/config';

// Mock Firebase Functions v2
jest.mock('firebase-functions/v2/firestore', () => ({
  onDocumentUpdated: jest.fn((options, handler) => {
    // Return a CloudFunction-like object
    return {
      __endpoint: {},
      run: handler,
    };
  }),
}));

jest.mock('firebase-functions/v2', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  getApp: jest.fn(),
  getFirestore: jest.fn(),
  FieldValue: {
    serverTimestamp: jest.fn(() => 'mock-timestamp'),
  },
}));

// Mock Timestamp
jest.mock('firebase-admin/firestore', () => ({
  Timestamp: {
    fromDate: jest.fn((date) => ({
      toDate: jest.fn(() => date),
    })),
  },
}));

// Mock the config
jest.mock('../../../src/core/config', () => ({
  STATIC_CONFIG: {
    region: 'us-central1',
  },
  SECRET_REFERENCES: {
    sendgridApiKey: 'sendgrid-api-key',
  },
}));

// Mock services
jest.mock('../../../src/core/services/trialday-service');
jest.mock('../../../src/core/services/referral-service');
jest.mock('../../../src/core/services/office-rnd-service');

describe('TrialdayEvents', () => {
  let trialdayEvents: TrialdayEvents;
  let mockTrialdayService: jest.Mocked<TrialdayService>;
  let mockReferralService: jest.Mocked<ReferralService>;
  let mockOfficeRndService: jest.Mocked<OfficeRndService>;
  let mockOnDocumentUpdated: jest.MockedFunction<typeof onDocumentUpdated>;
  let mockLogger: jest.Mocked<typeof logger>;

  beforeEach(() => {
    mockTrialdayService = {
      sendConfirmationEmail: jest.fn(),
      addToOfficeRnd: jest.fn(),
      addOpportunityAndMemberIdsToTrialday: jest.fn(),
      confirm: jest.fn(),
      sendFollowUpEmail: jest.fn(),
      trialDaysCollection: 'trialDays',
    } as any;

    mockReferralService = {
      createReferral: jest.fn(),
    } as any;

    mockOfficeRndService = {
      updateMember: jest.fn(),
    } as any;

    trialdayEvents = new TrialdayEvents(
      mockTrialdayService,
      mockReferralService,
      mockOfficeRndService
    );

    // Force type assertion to silence linter error for CloudFunction mock
    mockOnDocumentUpdated = onDocumentUpdated as unknown as any;
    mockLogger = logger as jest.Mocked<typeof logger>;

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should register the onChanged event handler', () => {
      const mockAdd = jest.fn();

      trialdayEvents.initialize(mockAdd);

      expect(mockAdd).toHaveBeenCalledTimes(1);
      expect((mockAdd.mock.calls[0][0] as any).name).toBe('onTrialdayChanged');
    });
  });

  describe('onChanged', () => {
    let mockHandler: jest.Mock;
    let mockEvent: any;

    beforeEach(() => {
      mockHandler = jest.fn();
      // @ts-expect-error: Jest mock does not match CloudFunction type signature
      mockOnDocumentUpdated.mockImplementation((options, handler) => {
        mockHandler = handler as jest.Mock;
        return {
          __endpoint: {},
          run: handler,
        };
      });

      // Create the event trigger to set up the handler
      const mockAdd = jest.fn((eventTrigger: any) => {
        if (eventTrigger.name === 'onTrialdayChanged') {
          // Extract the actual handler from the CloudFunction
          mockHandler = eventTrigger.handler.run || eventTrigger.handler;
        }
      });
      trialdayEvents.initialize(mockAdd);

      // Mock event structure
      mockEvent = {
        params: {
          trialdayId: 'test-trialday-id',
        },
        data: {
          before: {
            data: jest.fn(),
          },
          after: {
            data: jest.fn(),
          },
        },
      };
    });

    it('should handle status change to EMAIL_CONFIRMED', async () => {
      const trialdayBefore = {
        id: 'test-trialday-id',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        phone: '+1234567890',
        status: TrialdayStatus.PENDING_EMAIL_CONFIRMATION,
        trialDateTime: {
          toDate: () => new Date('2024-01-01T10:00:00Z'),
        },
        reason: 'Test reason',
        interestedIn: ['coworking'],
        termsAccepted: true,
        eventId: 'test-event-id',
        referralCode: 'TEST123',
      };

      const trialdayAfter = {
        ...trialdayBefore,
        status: TrialdayStatus.EMAIL_CONFIRMED,
      };

      const mockMember = {
        _id: 'test-member-id',
        name: 'Test User',
        email: 'test@example.com',
        company: 'Test Company',
        location: 'Test Location',
        status: OfficeRndMemberStatus.ACTIVE,
        startDate: new Date(),
        createdAt: new Date(),
        modifiedAt: new Date(),
        properties: {},
        toDocumentData: jest.fn(() => ({})),
        toJson: jest.fn(() => ({})),
      };

      const mockOpportunity = {
        _id: 'test-opportunity-id',
        name: 'Test Opportunity',
        member: mockMember._id,
      };

      mockEvent.data.before.data.mockReturnValue(trialdayBefore);
      mockEvent.data.after.data.mockReturnValue(trialdayAfter);

      mockTrialdayService.addToOfficeRnd.mockResolvedValue({
        member: mockMember,
        opportunity: mockOpportunity,
      });

      await mockHandler(mockEvent);

      expect(mockLogger.info).toHaveBeenCalledWith('trialday status changed', {
        trialdayId: 'test-trialday-id',
        trialdayBeforeStatus: TrialdayStatus.PENDING_EMAIL_CONFIRMATION,
        trialdayAfterStatus: TrialdayStatus.EMAIL_CONFIRMED,
      });

      expect(mockTrialdayService.sendConfirmationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-trialday-id',
          email: 'test@example.com',
          status: TrialdayStatus.EMAIL_CONFIRMED,
        })
      );
      expect(mockTrialdayService.addToOfficeRnd).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-trialday-id',
          email: 'test@example.com',
          status: TrialdayStatus.EMAIL_CONFIRMED,
        })
      );
      expect(
        mockTrialdayService.addOpportunityAndMemberIdsToTrialday
      ).toHaveBeenCalledWith(
        'test-trialday-id',
        'test-member-id',
        'test-opportunity-id'
      );
      expect(mockReferralService.createReferral).toHaveBeenCalledWith({
        referralCode: 'TEST123',
        referredUserId: 'test-member-id',
        referrerCompanyId: 'Test Company',
        isTrialday: true,
        trialdayStartDate: expect.any(Date),
        trialDayId: 'test-trialday-id',
        opportunityId: 'test-opportunity-id',
      });
      expect(mockTrialdayService.confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-trialday-id',
          email: 'test@example.com',
          status: TrialdayStatus.EMAIL_CONFIRMED,
        })
      );
    });

    it('should handle status change to EMAIL_CONFIRMED without referral code', async () => {
      const trialdayBefore = {
        id: 'test-trialday-id',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        phone: '+1234567890',
        status: TrialdayStatus.PENDING_EMAIL_CONFIRMATION,
        trialDateTime: {
          toDate: () => new Date('2024-01-01T10:00:00Z'),
        },
        reason: 'Test reason',
        interestedIn: ['coworking'],
        termsAccepted: true,
        eventId: 'test-event-id',
        referralCode: null,
      };

      const trialdayAfter = {
        ...trialdayBefore,
        status: TrialdayStatus.EMAIL_CONFIRMED,
      };

      const mockMember = {
        _id: 'test-member-id',
        name: 'Test User',
        email: 'test@example.com',
        company: 'Test Company',
        location: 'Test Location',
        status: OfficeRndMemberStatus.ACTIVE,
        startDate: new Date(),
        createdAt: new Date(),
        modifiedAt: new Date(),
        properties: {},
        toDocumentData: jest.fn(() => ({})),
        toJson: jest.fn(() => ({})),
      };

      const mockOpportunity = {
        _id: 'test-opportunity-id',
        name: 'Test Opportunity',
        member: mockMember._id,
      };

      mockEvent.data.before.data.mockReturnValue(trialdayBefore);
      mockEvent.data.after.data.mockReturnValue(trialdayAfter);

      mockTrialdayService.addToOfficeRnd.mockResolvedValue({
        member: mockMember,
        opportunity: mockOpportunity,
      });

      await mockHandler(mockEvent);

      expect(mockTrialdayService.sendConfirmationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-trialday-id',
          email: 'test@example.com',
          status: TrialdayStatus.EMAIL_CONFIRMED,
        })
      );
      expect(mockTrialdayService.addToOfficeRnd).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-trialday-id',
          email: 'test@example.com',
          status: TrialdayStatus.EMAIL_CONFIRMED,
        })
      );
      expect(
        mockTrialdayService.addOpportunityAndMemberIdsToTrialday
      ).toHaveBeenCalledWith(
        'test-trialday-id',
        'test-member-id',
        'test-opportunity-id'
      );
      expect(mockReferralService.createReferral).not.toHaveBeenCalled();
      expect(mockTrialdayService.confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-trialday-id',
          email: 'test@example.com',
          status: TrialdayStatus.EMAIL_CONFIRMED,
        })
      );
    });

    it('should handle status change to COMPLETED', async () => {
      const trialdayBefore = {
        id: 'test-trialday-id',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        phone: '+1234567890',
        status: TrialdayStatus.EMAIL_CONFIRMED,
        trialDateTime: {
          toDate: () => new Date('2024-01-01T10:00:00Z'),
        },
        reason: 'Test reason',
        interestedIn: ['coworking'],
        termsAccepted: true,
        eventId: 'test-event-id',
        memberId: 'test-member-id',
      };

      const trialdayAfter = {
        ...trialdayBefore,
        status: TrialdayStatus.COMPLETED,
      };

      mockEvent.data.before.data.mockReturnValue(trialdayBefore);
      mockEvent.data.after.data.mockReturnValue(trialdayAfter);

      await mockHandler(mockEvent);

      expect(mockLogger.info).toHaveBeenCalledWith('trialday status changed', {
        trialdayId: 'test-trialday-id',
        trialdayBeforeStatus: TrialdayStatus.EMAIL_CONFIRMED,
        trialdayAfterStatus: TrialdayStatus.COMPLETED,
      });

      expect(mockOfficeRndService.updateMember).toHaveBeenCalledWith(
        'test-member-id',
        {
          trialdayCompleted: true,
        }
      );
      expect(mockTrialdayService.sendFollowUpEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-trialday-id',
          email: 'test@example.com',
          status: TrialdayStatus.COMPLETED,
        })
      );
    });

    it('should handle status change to COMPLETED without memberId', async () => {
      const trialdayBefore = {
        id: 'test-trialday-id',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        phone: '+1234567890',
        status: TrialdayStatus.EMAIL_CONFIRMED,
        trialDateTime: {
          toDate: () => new Date('2024-01-01T10:00:00Z'),
        },
        reason: 'Test reason',
        interestedIn: ['coworking'],
        termsAccepted: true,
        eventId: 'test-event-id',
        memberId: null,
      };

      const trialdayAfter = {
        ...trialdayBefore,
        status: TrialdayStatus.COMPLETED,
      };

      mockEvent.data.before.data.mockReturnValue(trialdayBefore);
      mockEvent.data.after.data.mockReturnValue(trialdayAfter);

      await mockHandler(mockEvent);

      expect(mockOfficeRndService.updateMember).not.toHaveBeenCalled();
      expect(mockTrialdayService.sendFollowUpEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-trialday-id',
          email: 'test@example.com',
          status: TrialdayStatus.COMPLETED,
        })
      );
    });

    it('should handle status change to CANCELLED_BY_OFFICE', async () => {
      const trialdayBefore = {
        id: 'test-trialday-id',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        phone: '+1234567890',
        status: TrialdayStatus.EMAIL_CONFIRMED,
        trialDateTime: {
          toDate: () => new Date('2024-01-01T10:00:00Z'),
        },
        reason: 'Test reason',
        interestedIn: ['coworking'],
        termsAccepted: true,
        eventId: 'test-event-id',
      };

      const trialdayAfter = {
        ...trialdayBefore,
        status: TrialdayStatus.CANCELLED_BY_OFFICE,
      };

      mockEvent.data.before.data.mockReturnValue(trialdayBefore);
      mockEvent.data.after.data.mockReturnValue(trialdayAfter);

      await mockHandler(mockEvent);

      expect(mockLogger.info).toHaveBeenCalledWith('trialday status changed', {
        trialdayId: 'test-trialday-id',
        trialdayBeforeStatus: TrialdayStatus.EMAIL_CONFIRMED,
        trialdayAfterStatus: TrialdayStatus.CANCELLED_BY_OFFICE,
      });

      // TODO: Add assertions for cancellation email when implemented
    });

    it('should handle status change to CANCELLED_BY_USER', async () => {
      const trialdayBefore = {
        id: 'test-trialday-id',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        phone: '+1234567890',
        status: TrialdayStatus.EMAIL_CONFIRMED,
        trialDateTime: {
          toDate: () => new Date('2024-01-01T10:00:00Z'),
        },
        reason: 'Test reason',
        interestedIn: ['coworking'],
        termsAccepted: true,
        eventId: 'test-event-id',
      };

      const trialdayAfter = {
        ...trialdayBefore,
        status: TrialdayStatus.CANCELLED_BY_USER,
      };

      mockEvent.data.before.data.mockReturnValue(trialdayBefore);
      mockEvent.data.after.data.mockReturnValue(trialdayAfter);

      await mockHandler(mockEvent);

      expect(mockLogger.info).toHaveBeenCalledWith('trialday status changed', {
        trialdayId: 'test-trialday-id',
        trialdayBeforeStatus: TrialdayStatus.EMAIL_CONFIRMED,
        trialdayAfterStatus: TrialdayStatus.CANCELLED_BY_USER,
      });

      // TODO: Add assertions for cancellation email when implemented
    });

    it('should not process when status has not changed', async () => {
      const trialdayBefore = {
        id: 'test-trialday-id',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        phone: '+1234567890',
        status: TrialdayStatus.EMAIL_CONFIRMED,
        trialDateTime: {
          toDate: () => new Date('2024-01-01T10:00:00Z'),
        },
        reason: 'Test reason',
        interestedIn: ['coworking'],
        termsAccepted: true,
        eventId: 'test-event-id',
      };

      const trialdayAfter = {
        ...trialdayBefore,
        // Only other fields changed, status remains the same
      };

      mockEvent.data.before.data.mockReturnValue(trialdayBefore);
      mockEvent.data.after.data.mockReturnValue(trialdayAfter);

      await mockHandler(mockEvent);

      expect(mockLogger.info).not.toHaveBeenCalled();
      expect(mockTrialdayService.sendConfirmationEmail).not.toHaveBeenCalled();
      expect(mockTrialdayService.addToOfficeRnd).not.toHaveBeenCalled();
    });

    it('should handle missing before data gracefully', async () => {
      const trialdayAfter = {
        id: 'test-trialday-id',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        phone: '+1234567890',
        status: TrialdayStatus.EMAIL_CONFIRMED,
        trialDateTime: {
          toDate: () => new Date('2024-01-01T10:00:00Z'),
        },
        reason: 'Test reason',
        interestedIn: ['coworking'],
        termsAccepted: true,
        eventId: 'test-event-id',
      };

      mockEvent.data.before.data.mockReturnValue(null);
      mockEvent.data.after.data.mockReturnValue(trialdayAfter);

      await mockHandler(mockEvent);

      expect(mockLogger.info).not.toHaveBeenCalled();
      expect(mockTrialdayService.sendConfirmationEmail).not.toHaveBeenCalled();
    });

    it('should handle missing after data gracefully', async () => {
      const trialdayBefore = {
        id: 'test-trialday-id',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        phone: '+1234567890',
        status: TrialdayStatus.EMAIL_CONFIRMED,
        trialDateTime: {
          toDate: () => new Date('2024-01-01T10:00:00Z'),
        },
        reason: 'Test reason',
        interestedIn: ['coworking'],
        termsAccepted: true,
        eventId: 'test-event-id',
      };

      mockEvent.data.before.data.mockReturnValue(trialdayBefore);
      mockEvent.data.after.data.mockReturnValue(null);

      await mockHandler(mockEvent);

      expect(mockLogger.info).not.toHaveBeenCalled();
      expect(mockTrialdayService.sendConfirmationEmail).not.toHaveBeenCalled();
    });

    it('should handle errors and throw TrialdayEventError', async () => {
      const trialdayBefore = {
        id: 'test-trialday-id',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        phone: '+1234567890',
        status: TrialdayStatus.PENDING_EMAIL_CONFIRMATION,
        trialDateTime: {
          toDate: () => new Date('2024-01-01T10:00:00Z'),
        },
        reason: 'Test reason',
        interestedIn: ['coworking'],
        termsAccepted: true,
        eventId: 'test-event-id',
      };

      const trialdayAfter = {
        ...trialdayBefore,
        status: TrialdayStatus.EMAIL_CONFIRMED,
      };

      mockEvent.data.before.data.mockReturnValue(trialdayBefore);
      mockEvent.data.after.data.mockReturnValue(trialdayAfter);

      // Mock an error in the service
      const testError = new Error('Test error');
      mockTrialdayService.sendConfirmationEmail.mockRejectedValue(testError);

      await expect(mockHandler(mockEvent)).rejects.toThrow(TrialdayEventError);
    });

    it('should re-throw AppError instances without wrapping', async () => {
      const trialdayBefore = {
        id: 'test-trialday-id',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        phone: '+1234567890',
        status: TrialdayStatus.PENDING_EMAIL_CONFIRMATION,
        trialDateTime: {
          toDate: () => new Date('2024-01-01T10:00:00Z'),
        },
        reason: 'Test reason',
        interestedIn: ['coworking'],
        termsAccepted: true,
        eventId: 'test-event-id',
      };

      const trialdayAfter = {
        ...trialdayBefore,
        status: TrialdayStatus.EMAIL_CONFIRMED,
      };

      mockEvent.data.before.data.mockReturnValue(trialdayBefore);
      mockEvent.data.after.data.mockReturnValue(trialdayAfter);

      const appError = new TrialdayEventError(
        'Test AppError',
        8001,
        'testMethod'
      );

      mockTrialdayService.sendConfirmationEmail.mockRejectedValue(appError);

      await expect(mockHandler(mockEvent)).rejects.toThrow(appError);
    });
  });

  describe('Firebase Function Configuration', () => {
    it('should configure onDocumentUpdated with correct options', () => {
      // Reset the mock to clear previous calls
      mockOnDocumentUpdated.mockClear();

      // Create a new instance to ensure fresh initialization
      const newTrialdayEvents = new TrialdayEvents(
        mockTrialdayService,
        mockReferralService,
        mockOfficeRndService
      );

      const mockAdd = jest.fn((eventTrigger: any) => {
        // This will trigger the onDocumentUpdated call
        if (eventTrigger.name === 'onTrialdayChanged') {
          eventTrigger.handler;
        }
      });

      newTrialdayEvents.initialize(mockAdd);

      expect(mockOnDocumentUpdated).toHaveBeenCalledWith(
        {
          document: `${TrialdayService.trialDaysCollection}/{trialdayId}`,
          region: STATIC_CONFIG.region,
          secrets: [SECRET_REFERENCES.sendgridApiKey],
        },
        expect.any(Function)
      );
    });
  });
});
