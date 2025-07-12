import {logger} from 'firebase-functions/v2';

import {OfficeRndScheduledEvents} from '../../../src/scheduled-events/on-schedule-events/office-rnd-scheduled-events';
import {FirestoreService} from '../../../src/core/services/firestore-service';
import {ServiceResolver} from '../../../src/core/services/di';
import * as environment from '../../../src/core/utils/environment';
import {OfficeRndScheduledEventError} from '../../../src/core/errors';
import {
  OfficeRndOpportunity,
  OfficeRndOpportunityStatus,
  OfficeRndMember,
  OfficeRndCompany,
} from '../../../src/core/data/models';
import {TrialdayStatus} from '../../../src/core/data/enums';
import * as config from '../../../src/core/config';

jest.mock('../../../src/core/services/firestore-service');
jest.mock('../../../src/core/services/di');
jest.mock('../../../src/core/utils/environment');
jest.mock('../../../src/core/config');

// Define proper types for mocks
interface MockFirestoreService {
  createDocument: jest.Mock;
  setDocument: jest.Mock;
  getInstance: jest.Mock;
}

interface MockOfficeRndService {
  _getAndSaveToken: jest.Mock;
  getAllMembers: jest.Mock;
  getAllMembersFromAPI: jest.Mock;
  getOpportunities: jest.Mock;
  getOpportunitiesFromAPI: jest.Mock;
  getAllCompanies: jest.Mock;
  getAllCompaniesFromAPI: jest.Mock;
  getOpportunityStatuses: jest.Mock;
  getOpportunityStatusesFromAPI: jest.Mock;
}

interface MockTrialdayService {
  getTrialdayByOpportunityId: jest.Mock;
  updateTrialdayStatus: jest.Mock;
}

const mockFirestoreService: MockFirestoreService = {
  createDocument: jest.fn(),
  setDocument: jest.fn(),
  getInstance: jest.fn(),
};

const mockOfficeRndService: MockOfficeRndService = {
  _getAndSaveToken: jest.fn(),
  getAllMembers: jest.fn(),
  getAllMembersFromAPI: jest.fn(),
  getOpportunities: jest.fn(),
  getOpportunitiesFromAPI: jest.fn(),
  getAllCompanies: jest.fn(),
  getAllCompaniesFromAPI: jest.fn(),
  getOpportunityStatuses: jest.fn(),
  getOpportunityStatusesFromAPI: jest.fn(),
};

const mockTrialdayService: MockTrialdayService = {
  getTrialdayByOpportunityId: jest.fn(),
  updateTrialdayStatus: jest.fn(),
};

// Sample data for testing
const sampleMembers: OfficeRndMember[] = [
  {
    _id: 'member1',
    name: 'John Doe',
    email: 'john@example.com',
    location: 'location1',
    company: 'company1',
    status: 'active' as any,
    startDate: new Date(),
    createdAt: new Date(),
    modifiedAt: new Date(),
    properties: {},
    toDocumentData: () => ({}),
    toJson: () => ({}),
  },
  {
    _id: 'member2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    location: 'location1',
    company: 'company2',
    status: 'active' as any,
    startDate: new Date(),
    createdAt: new Date(),
    modifiedAt: new Date(),
    properties: {},
    toDocumentData: () => ({}),
    toJson: () => ({}),
  },
];

const sampleOpportunities: OfficeRndOpportunity[] = [
  {
    _id: 'opp1',
    name: 'Trial Day - John Doe',
    member: 'member1',
    status: 'status1',
    probability: 0.8,
    startDate: new Date(),
    dealSize: 1000,
    membersCount: 1,
    resources: [],
    requestedPlans: [],
    createdAt: '2024-01-01',
    createdBy: 'system',
    modifiedAt: '2024-01-01',
    modifiedBy: 'system',
  },
  {
    _id: 'opp2',
    name: 'Trial Day - Jane Smith',
    member: 'member2',
    status: 'status2',
    probability: 0.9,
    startDate: new Date(),
    dealSize: 1500,
    membersCount: 2,
    resources: [],
    requestedPlans: [],
    createdAt: '2024-01-02',
    createdBy: 'system',
    modifiedAt: '2024-01-02',
    modifiedBy: 'system',
  },
];

const sampleCompanies: OfficeRndCompany[] = [
  {
    _id: 'company1',
    startDate: new Date(),
    location: 'location1',
    name: 'Tech Corp',
    description: 'Technology company',
    email: 'contact@techcorp.com',
    status: 'active',
    billingDetails: {},
    createdAt: new Date(),
    createdBy: 'system',
    modifiedAt: new Date(),
    modifiedBy: 'system',
  },
  {
    _id: 'company2',
    startDate: new Date(),
    location: 'location1',
    name: 'Design Studio',
    description: 'Design agency',
    email: 'hello@designstudio.com',
    status: 'active',
    billingDetails: {},
    createdAt: new Date(),
    createdBy: 'system',
    modifiedAt: new Date(),
    modifiedBy: 'system',
  },
];

const sampleOpportunityStatuses: OfficeRndOpportunityStatus[] = [
  {
    _id: 'status1',
    description: 'trialRequest',
    probability: 0.5,
    isSystem: true,
  },
  {
    _id: 'status2',
    description: 'trialComplete',
    probability: 0.9,
    isSystem: true,
  },
  {
    _id: 'status3',
    description: 'member',
    probability: 1.0,
    isSystem: true,
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  (FirestoreService.getInstance as jest.Mock).mockReturnValue(
    mockFirestoreService
  );
  (ServiceResolver.getOfficeRndService as jest.Mock).mockReturnValue(
    mockOfficeRndService
  );
  (ServiceResolver.getTrialdayService as jest.Mock).mockReturnValue(
    mockTrialdayService
  );
  (ServiceResolver.getFirestoreService as jest.Mock).mockReturnValue(
    mockFirestoreService
  );
  (environment.isDevelopment as jest.Mock).mockReturnValue(false);
  (config.getConfig as jest.Mock).mockReturnValue({
    runtime: {
      officeRnd: {
        secretKey: 'test-secret-key',
      },
    },
  });

  // Reset mock implementations to success by default
  mockFirestoreService.createDocument.mockResolvedValue(undefined);
  mockFirestoreService.setDocument.mockResolvedValue(undefined);
  mockOfficeRndService._getAndSaveToken.mockResolvedValue(undefined);
  mockOfficeRndService.getAllMembers.mockResolvedValue(sampleMembers);
  mockOfficeRndService.getAllMembersFromAPI.mockResolvedValue(sampleMembers);
  mockOfficeRndService.getOpportunities.mockResolvedValue(sampleOpportunities);
  mockOfficeRndService.getOpportunitiesFromAPI.mockResolvedValue(
    sampleOpportunities
  );
  mockOfficeRndService.getAllCompanies.mockResolvedValue(sampleCompanies);
  mockOfficeRndService.getAllCompaniesFromAPI.mockResolvedValue(
    sampleCompanies
  );
  mockOfficeRndService.getOpportunityStatuses.mockResolvedValue(
    sampleOpportunityStatuses
  );
  mockOfficeRndService.getOpportunityStatusesFromAPI.mockResolvedValue(
    sampleOpportunityStatuses
  );
  mockTrialdayService.getTrialdayByOpportunityId.mockResolvedValue({
    id: 'trialday1',
    status: TrialdayStatus.REQUESTED,
  });
  mockTrialdayService.updateTrialdayStatus.mockResolvedValue(undefined);
});

describe('OfficeRndScheduledEvents', () => {
  const events = new OfficeRndScheduledEvents();
  const add = jest.fn();

  it('should register all three scheduled events', () => {
    events.initialize(add);
    expect(add).toHaveBeenCalledTimes(3);
    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({name: 'tokenGeneration'})
    );
    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({name: 'dataBackup'})
    );
    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({name: 'trialdayFollowup'})
    );
  });

  describe('tokenGeneration scheduled handler', () => {
    const handler = (
      events as unknown as {
        tokenGeneration: {handler: () => Promise<void>};
      }
    ).tokenGeneration.handler;

    describe('Success scenarios', () => {
      it('should get and save OAuth2.0 token successfully', async () => {
        mockOfficeRndService._getAndSaveToken.mockResolvedValue(undefined);

        await handler();

        expect(ServiceResolver.getOfficeRndService).toHaveBeenCalled();
        expect(config.getConfig).toHaveBeenCalled();
        expect(mockOfficeRndService._getAndSaveToken).toHaveBeenCalledWith(
          'test-secret-key'
        );
        expect(logger.info).toHaveBeenCalledWith(
          'OfficeRndScheduledEvents.tokenGeneration()- Getting and saving OAuth2.0 token'
        );
      });
    });

    describe('Error handling scenarios', () => {
      it('should handle token generation errors in production mode', async () => {
        const tokenError = new Error('Token generation failed');
        mockOfficeRndService._getAndSaveToken.mockRejectedValue(tokenError);
        (environment.isDevelopment as jest.Mock).mockReturnValue(false);

        await expect(handler()).rejects.toThrow(OfficeRndScheduledEventError);

        expect(logger.error).toHaveBeenCalledWith(
          'OfficeRndScheduledEvents.tokenGeneration()- Error getting and saving token',
          tokenError
        );
        expect(mockFirestoreService.createDocument).toHaveBeenCalledWith({
          collection: 'errors',
          data: expect.objectContaining({
            name: 'OfficeRndScheduledEventError',
            message: 'Failed to generate OAuth2.0 token',
            functionName: 'tokenGeneration',
            localErrorCode: 11001,
            code: 11001,
            details: expect.objectContaining({
              functionName: 'tokenGeneration',
              localErrorCode: 11001,
              originalError: 'Token generation failed',
              scheduledEvent: true,
            }),
            timestamp: expect.any(String),
          }),
        });
      });

      it('should handle token generation errors in development mode', async () => {
        const tokenError = new Error('Token generation failed');
        mockOfficeRndService._getAndSaveToken.mockRejectedValue(tokenError);
        (environment.isDevelopment as jest.Mock).mockReturnValue(true);

        await expect(handler()).rejects.toThrow(OfficeRndScheduledEventError);

        expect(logger.error).toHaveBeenCalledWith(
          'OfficeRndScheduledEvents.tokenGeneration()- Error getting and saving token',
          tokenError
        );
        expect(logger.debug).toHaveBeenCalledWith(
          'OfficeRndScheduledEvents.tokenGeneration()- In development mode, the error will not be logged in Firestore'
        );
        expect(mockFirestoreService.createDocument).not.toHaveBeenCalled();
      });

      it('should handle non-Error objects', async () => {
        const nonError = 'String error';
        mockOfficeRndService._getAndSaveToken.mockRejectedValue(nonError);
        (environment.isDevelopment as jest.Mock).mockReturnValue(false);

        await expect(handler()).rejects.toThrow(OfficeRndScheduledEventError);

        expect(mockFirestoreService.createDocument).toHaveBeenCalledWith({
          collection: 'errors',
          data: expect.objectContaining({
            details: expect.objectContaining({
              originalError: 'Unknown error',
              localErrorCode: expect.any(Number),
            }),
          }),
        });
      });
    });
  });

  describe('dataBackup scheduled handler', () => {
    const handler = (
      events as unknown as {
        dataBackup: {handler: () => Promise<void>};
      }
    ).dataBackup.handler;

    describe('Success scenarios', () => {
      it('should perform data backup and validation successfully', async () => {
        await handler();

        // Verify all API calls were made
        expect(mockOfficeRndService.getAllMembers).toHaveBeenCalled();
        expect(mockOfficeRndService.getAllMembersFromAPI).toHaveBeenCalled();
        expect(mockOfficeRndService.getOpportunities).toHaveBeenCalledWith({});
        expect(
          mockOfficeRndService.getOpportunitiesFromAPI
        ).toHaveBeenCalledWith({});
        expect(mockOfficeRndService.getAllCompanies).toHaveBeenCalled();
        expect(mockOfficeRndService.getAllCompaniesFromAPI).toHaveBeenCalled();

        // Verify backup metadata was updated
        expect(mockFirestoreService.setDocument).toHaveBeenCalledWith({
          collection: 'officeRndMetadata',
          documentId: 'backup-metadata',
          merge: true,
          data: expect.objectContaining({
            lastBackup: expect.any(Date),
            firestoreMembers: 2,
            apiMembers: 2,
            missingRecords: 0,
            status: 'completed',
            updatedAt: expect.any(Date),
          }),
        });

        expect(logger.info).toHaveBeenCalledWith(
          'OfficeRndScheduledEvents.dataBackup()- Starting daily data backup and validation'
        );
        expect(logger.info).toHaveBeenCalledWith(
          'OfficeRndScheduledEvents.dataBackup()- All data is in sync'
        );
      });

      it('should trigger full sync when missing records are detected', async () => {
        // Simulate missing records
        const apiMembers = [
          ...sampleMembers,
          {
            _id: 'member3',
            name: 'Bob Wilson',
            email: 'bob@example.com',
            location: 'location1',
            company: 'company3',
            status: 'active' as any,
            startDate: new Date(),
            createdAt: new Date(),
            modifiedAt: new Date(),
            properties: {},
            toDocumentData: () => ({}),
            toJson: () => ({}),
          },
        ];

        mockOfficeRndService.getAllMembersFromAPI.mockResolvedValue(apiMembers);

        await handler();

        // Verify full sync was triggered
        expect(mockFirestoreService.setDocument).toHaveBeenCalledWith({
          collection: 'officeRndMembers',
          documentId: 'member1',
          data: sampleMembers[0],
        });
        expect(mockFirestoreService.setDocument).toHaveBeenCalledWith({
          collection: 'officeRndMembers',
          documentId: 'member2',
          data: sampleMembers[1],
        });
        expect(mockFirestoreService.setDocument).toHaveBeenCalledWith({
          collection: 'officeRndMembers',
          documentId: 'member3',
          data: apiMembers[2],
        });

        expect(logger.warn).toHaveBeenCalledWith(
          'OfficeRndScheduledEvents.dataBackup()- Missing records detected, triggering full sync',
          expect.objectContaining({
            missingMembers: 1,
            missingOpportunities: 0,
            missingCompanies: 0,
          })
        );
      });

      it('should handle empty data sets', async () => {
        mockOfficeRndService.getAllMembers.mockResolvedValue([]);
        mockOfficeRndService.getAllMembersFromAPI.mockResolvedValue([]);
        mockOfficeRndService.getOpportunities.mockResolvedValue([]);
        mockOfficeRndService.getOpportunitiesFromAPI.mockResolvedValue([]);
        mockOfficeRndService.getAllCompanies.mockResolvedValue([]);
        mockOfficeRndService.getAllCompaniesFromAPI.mockResolvedValue([]);

        await handler();

        expect(logger.info).toHaveBeenCalledWith(
          'OfficeRndScheduledEvents.dataBackup()- All data is in sync'
        );
        expect(mockFirestoreService.setDocument).toHaveBeenCalledWith({
          collection: 'officeRndMetadata',
          documentId: 'backup-metadata',
          merge: true,
          data: expect.objectContaining({
            missingRecords: 0,
            status: 'completed',
          }),
        });
      });
    });

    describe('Error handling scenarios', () => {
      it('should handle backup errors in production mode', async () => {
        const backupError = new Error('Backup failed');
        mockOfficeRndService.getAllMembers.mockRejectedValue(backupError);
        (environment.isDevelopment as jest.Mock).mockReturnValue(false);

        await expect(handler()).rejects.toThrow(OfficeRndScheduledEventError);

        expect(logger.error).toHaveBeenCalledWith(
          'OfficeRndScheduledEvents.dataBackup()- Error during backup',
          backupError
        );
        expect(mockFirestoreService.createDocument).toHaveBeenCalledWith({
          collection: 'errors',
          data: expect.objectContaining({
            name: 'OfficeRndScheduledEventError',
            message: 'Failed to perform data backup and validation',
            functionName: 'dataBackup',
          }),
        });
        expect(mockFirestoreService.setDocument).toHaveBeenCalledWith({
          collection: 'officeRndMetadata',
          documentId: 'backup-metadata',
          merge: true,
          data: expect.objectContaining({
            status: 'failed',
            error: 'Backup failed',
          }),
        });
      });

      it('should handle Firestore error logging failures', async () => {
        const backupError = new Error('Backup failed');
        const firestoreError = new Error('Firestore error');
        mockOfficeRndService.getAllMembers.mockRejectedValue(backupError);
        mockFirestoreService.createDocument.mockRejectedValue(firestoreError);
        (environment.isDevelopment as jest.Mock).mockReturnValue(false);

        await expect(handler()).rejects.toThrow(OfficeRndScheduledEventError);

        expect(logger.error).toHaveBeenCalledWith(
          'OfficeRndScheduledEvents.dataBackup()- Error during backup',
          backupError
        );
        expect(mockFirestoreService.createDocument).toHaveBeenCalled();
      });
    });

    describe('Data comparison scenarios', () => {
      it('should correctly identify missing records', async () => {
        // Firestore has fewer records than API
        const firestoreMembers = [sampleMembers[0]];
        const apiMembers = sampleMembers;

        mockOfficeRndService.getAllMembers.mockResolvedValue(firestoreMembers);
        mockOfficeRndService.getAllMembersFromAPI.mockResolvedValue(apiMembers);

        await handler();

        expect(logger.warn).toHaveBeenCalledWith(
          'OfficeRndScheduledEvents.dataBackup()- Missing records detected, triggering full sync',
          expect.objectContaining({
            missingMembers: 1,
          })
        );
      });

      it('should handle different data structures', async () => {
        // Test with different field names or structures
        const firestoreMembers = sampleMembers.map((m) => ({...m, _id: m._id}));
        const apiMembers = sampleMembers.map((m) => ({
          ...m,
          id: m._id,
          _id: undefined,
        }));

        mockOfficeRndService.getAllMembers.mockResolvedValue(firestoreMembers);
        mockOfficeRndService.getAllMembersFromAPI.mockResolvedValue(apiMembers);

        await handler();

        // Should still work and identify missing records
        expect(logger.warn).toHaveBeenCalledWith(
          'OfficeRndScheduledEvents.dataBackup()- Missing records detected, triggering full sync',
          expect.any(Object)
        );
      });
    });
  });

  describe('trialdayFollowup scheduled handler', () => {
    const handler = (
      events as unknown as {
        trialdayFollowup: {handler: () => Promise<void>};
      }
    ).trialdayFollowup.handler;

    describe('Success scenarios', () => {
      it('should process trial complete opportunities successfully', async () => {
        // Set up trial complete opportunities
        const trialCompleteOpportunities = sampleOpportunities.filter(
          (opp) => opp.status === 'status2' // trialComplete status
        );

        await handler();

        expect(mockOfficeRndService.getOpportunityStatuses).toHaveBeenCalled();
        expect(mockOfficeRndService.getOpportunities).toHaveBeenCalledWith({});
        expect(
          mockTrialdayService.getTrialdayByOpportunityId
        ).toHaveBeenCalledWith('opp2');
        expect(mockTrialdayService.updateTrialdayStatus).toHaveBeenCalledWith(
          'trialday1',
          TrialdayStatus.COMPLETED
        );

        expect(logger.info).toHaveBeenCalledWith(
          'OfficeRndScheduledEvents.trialdayFollowup()- Starting trial complete opportunity check'
        );
        expect(logger.info).toHaveBeenCalledWith(
          'OfficeRndScheduledEvents.trialdayFollowup()- Completed processing trial complete opportunities',
          expect.objectContaining({
            totalOpportunities: 2,
            trialCompleteOpportunities: 1,
            processedCount: 1,
            errorCount: 0,
          })
        );
      });

      it('should handle missing trialComplete status gracefully', async () => {
        const statusesWithoutTrialComplete = sampleOpportunityStatuses.filter(
          (status) => status.description !== 'trialComplete'
        );
        mockOfficeRndService.getOpportunityStatuses.mockResolvedValue(
          statusesWithoutTrialComplete
        );

        await handler();

        expect(logger.warn).toHaveBeenCalledWith(
          'OfficeRndScheduledEvents.trialdayFollowup()- trialComplete status not found in opportunity statuses'
        );
        expect(
          mockTrialdayService.getTrialdayByOpportunityId
        ).not.toHaveBeenCalled();
      });

      it('should handle missing trialday documents gracefully', async () => {
        // Set up opportunity without corresponding trialday
        const opportunityWithoutTrialday = {
          ...sampleOpportunities[0],
          status: 'status2', // trialComplete status
        };
        mockOfficeRndService.getOpportunities.mockResolvedValue([
          opportunityWithoutTrialday,
        ]);
        mockTrialdayService.getTrialdayByOpportunityId.mockResolvedValue(null);

        await handler();

        expect(logger.warn).toHaveBeenCalledWith(
          'OfficeRndScheduledEvents.processTrialComplete()- No trialday found for opportunity, skipping',
          expect.objectContaining({
            opportunityId: 'opp1',
            opportunityName: 'Trial Day - John Doe',
            memberId: 'member1',
          })
        );
        expect(mockFirestoreService.createDocument).toHaveBeenCalledWith({
          collection: 'missing-trialdays',
          data: expect.objectContaining({
            opportunityId: 'opp1',
            opportunityName: 'Trial Day - John Doe',
            memberId: 'member1',
            reason: 'No trialday document found in Firestore',
            source: 'trialdayFollowup-scheduled-function',
          }),
        });
      });

      it('should continue processing when individual opportunities fail', async () => {
        const opportunities = [
          {...sampleOpportunities[0], status: 'status2'}, // trialComplete
          {...sampleOpportunities[1], status: 'status2'}, // trialComplete
        ];
        mockOfficeRndService.getOpportunities.mockResolvedValue(opportunities);

        // First opportunity succeeds, second fails
        mockTrialdayService.getTrialdayByOpportunityId
          .mockResolvedValueOnce({
            id: 'trialday1',
            status: TrialdayStatus.REQUESTED,
          })
          .mockRejectedValueOnce(new Error('Trialday service error'));

        await handler();

        expect(logger.error).toHaveBeenCalledWith(
          'OfficeRndScheduledEvents.trialdayFollowup()- Error processing individual opportunity',
          expect.objectContaining({
            opportunityId: 'opp2',
            opportunityName: 'Trial Day - Jane Smith',
            error: 'Trialday service error',
          })
        );
        expect(logger.info).toHaveBeenCalledWith(
          'OfficeRndScheduledEvents.trialdayFollowup()- Completed processing trial complete opportunities',
          expect.objectContaining({
            processedCount: 1,
            errorCount: 1,
          })
        );
      });
    });

    describe('Error handling scenarios', () => {
      it('should handle processing errors in production mode', async () => {
        const processingError = new Error('Processing failed');
        mockOfficeRndService.getOpportunityStatuses.mockRejectedValue(
          processingError
        );
        (environment.isDevelopment as jest.Mock).mockReturnValue(false);

        await expect(handler()).rejects.toThrow(OfficeRndScheduledEventError);

        expect(logger.error).toHaveBeenCalledWith(
          'OfficeRndScheduledEvents.trialdayFollowup()- Error during processing',
          processingError
        );
        expect(mockFirestoreService.createDocument).toHaveBeenCalledWith({
          collection: 'errors',
          data: expect.objectContaining({
            name: 'OfficeRndScheduledEventError',
            message: 'Failed to process trial complete opportunities',
            functionName: 'trialdayFollowup',
          }),
        });
      });

      it('should handle processing errors in development mode', async () => {
        const processingError = new Error('Processing failed');
        mockOfficeRndService.getOpportunityStatuses.mockRejectedValue(
          processingError
        );
        (environment.isDevelopment as jest.Mock).mockReturnValue(true);

        await expect(handler()).rejects.toThrow(OfficeRndScheduledEventError);

        expect(logger.error).toHaveBeenCalledWith(
          'OfficeRndScheduledEvents.trialdayFollowup()- Error during processing',
          processingError
        );
        expect(mockFirestoreService.createDocument).not.toHaveBeenCalled();
      });

      it('should handle missing trialday logging failures', async () => {
        const opportunityWithoutTrialday = {
          ...sampleOpportunities[0],
          status: 'status2', // trialComplete status
        };
        mockOfficeRndService.getOpportunities.mockResolvedValue([
          opportunityWithoutTrialday,
        ]);
        mockTrialdayService.getTrialdayByOpportunityId.mockResolvedValue(null);
        mockFirestoreService.createDocument.mockRejectedValue(
          new Error('Firestore error')
        );

        await handler();

        expect(logger.error).toHaveBeenCalledWith(
          'OfficeRndScheduledEvents.logMissingTrialday()- Failed to log missing trialday',
          expect.objectContaining({
            opportunityId: 'opp1',
            error: 'Firestore error',
          })
        );
      });
    });

    describe('Edge cases', () => {
      it('should handle opportunities with undefined IDs', async () => {
        const opportunityWithUndefinedId = {
          ...sampleOpportunities[0],
          _id: undefined,
          status: 'status2', // trialComplete status
        };
        mockOfficeRndService.getOpportunities.mockResolvedValue([
          opportunityWithUndefinedId,
        ]);

        await handler();

        expect(logger.warn).toHaveBeenCalledWith(
          'OfficeRndScheduledEvents.processTrialComplete()- Skipping opportunity with undefined id',
          expect.objectContaining({
            opportunityName: 'Trial Day - John Doe',
            memberId: 'member1',
          })
        );
        expect(
          mockTrialdayService.getTrialdayByOpportunityId
        ).not.toHaveBeenCalled();
      });

      it('should not log missing trialdays in development mode', async () => {
        const opportunityWithoutTrialday = {
          ...sampleOpportunities[0],
          status: 'status2', // trialComplete status
        };
        mockOfficeRndService.getOpportunities.mockResolvedValue([
          opportunityWithoutTrialday,
        ]);
        mockTrialdayService.getTrialdayByOpportunityId.mockResolvedValue(null);
        (environment.isDevelopment as jest.Mock).mockReturnValue(true);

        await handler();

        expect(mockFirestoreService.createDocument).not.toHaveBeenCalledWith({
          collection: 'missing-trialdays',
          data: expect.any(Object),
        });
      });
    });
  });

  describe('Helper methods', () => {
    describe('findMissingRecords', () => {
      it('should correctly identify missing records', () => {
        const firestoreRecords = [
          {_id: '1', name: 'Item 1'},
          {_id: '2', name: 'Item 2'},
        ];
        const apiRecords = [
          {_id: '1', name: 'Item 1'},
          {_id: '2', name: 'Item 2'},
          {_id: '3', name: 'Item 3'},
        ];

        const missingRecords = (events as any).findMissingRecords(
          firestoreRecords,
          apiRecords,
          '_id'
        );

        expect(missingRecords).toHaveLength(1);
        expect(missingRecords[0]._id).toBe('3');
      });

      it('should handle empty arrays', () => {
        const missingRecords = (events as any).findMissingRecords(
          [],
          [],
          '_id'
        );
        expect(missingRecords).toHaveLength(0);
      });

      it('should handle different ID field names', () => {
        const firestoreRecords = [{id: '1', name: 'Item 1'}];
        const apiRecords = [
          {id: '1', name: 'Item 1'},
          {id: '2', name: 'Item 2'},
        ];

        const missingRecords = (events as any).findMissingRecords(
          firestoreRecords,
          apiRecords,
          'id'
        );

        expect(missingRecords).toHaveLength(1);
        expect(missingRecords[0].id).toBe('2');
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should handle ServiceResolver failures gracefully', async () => {
      (ServiceResolver.getOfficeRndService as jest.Mock).mockImplementation(
        () => {
          throw new Error('ServiceResolver failed');
        }
      );

      const handler = (
        events as unknown as {
          tokenGeneration: {handler: () => Promise<void>};
        }
      ).tokenGeneration.handler;

      await expect(handler()).rejects.toThrow(OfficeRndScheduledEventError);

      expect(logger.error).toHaveBeenCalledWith(
        'OfficeRndScheduledEvents.tokenGeneration()- Error getting and saving token',
        expect.any(Error)
      );
    });

    it('should handle config failures gracefully', async () => {
      (config.getConfig as jest.Mock).mockImplementation(() => {
        throw new Error('Config failed');
      });

      const handler = (
        events as unknown as {
          tokenGeneration: {handler: () => Promise<void>};
        }
      ).tokenGeneration.handler;

      await expect(handler()).rejects.toThrow(OfficeRndScheduledEventError);
    });
  });

  describe('Performance and monitoring', () => {
    it('should log comprehensive metrics for data backup', async () => {
      const dataBackupHandler = (
        events as unknown as {dataBackup: {handler: () => Promise<void>}}
      ).dataBackup.handler;
      await dataBackupHandler();

      expect(logger.info).toHaveBeenCalledWith(
        'OfficeRndScheduledEvents.dataBackup()- Backup statistics',
        expect.objectContaining({
          firestoreMembers: 2,
          apiMembers: 2,
          missingMembers: 0,
          firestoreOpportunities: 2,
          apiOpportunities: 2,
          missingOpportunities: 0,
          firestoreCompanies: 2,
          apiCompanies: 2,
          missingCompanies: 0,
        })
      );
    });

    it('should log processing metrics for trialday followup', async () => {
      const trialdayFollowupHandler = (
        events as unknown as {trialdayFollowup: {handler: () => Promise<void>}}
      ).trialdayFollowup.handler;
      await trialdayFollowupHandler();

      expect(logger.info).toHaveBeenCalledWith(
        'OfficeRndScheduledEvents.trialdayFollowup()- Found trial complete opportunities',
        expect.objectContaining({
          totalOpportunities: 2,
          trialCompleteOpportunities: 1,
        })
      );
    });
  });
});
