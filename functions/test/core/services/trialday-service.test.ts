import {TrialdayService} from '../../../src/core/services/trialday-service';
import {TrialdayServiceError} from '../../../src/core/errors';
import {TrialdayStatus} from '../../../src/core/data/enums';

// Mock the config module
jest.mock('../../../src/core/config', () => ({
  getConfig: jest.fn(() => ({
    runtime: {
      officeRnd: {
        defaultLocationId: 'loc-1',
        clientId: 'test-client',
        grantType: 'client_credentials',
        scopes: 'test-scope',
        secretKey: 'test-secret',
        apiV2url: 'https://api.test.com',
        orgSlug: 'test-org',
      },
      sendgrid: {
        templates: {
          trialdayConfirmation: 'template-1',
          trialdayFollowUp: 'template-2',
        },
      },
    },
    static: {
      urls: {
        website: 'https://test.com',
      },
    },
  })),
}));

// Mock the Trialday class used in the service
jest.mock('../../../src/core/data/models', () => {
  const actual = jest.requireActual('../../../src/core/data/models');
  return {
    ...actual,
    Trialday: Object.assign(
      jest.fn().mockImplementation((data) => ({
        ...data,
        toDocumentData: jest.fn(() => ({...data, toDocumentData: undefined})),
      })),
      {
        FIELDS: {
          EVENT_ID: 'eventId', // <-- Add this line
        },
      }
    ),
  };
});

const mockFirestoreService = {
  queryCollection: jest.fn(),
  createDocumentReference: jest.fn(),
  createDocument: jest.fn(),
  updateDocument: jest.fn(),
  getDocument: jest.fn(),
  setDocument: jest.fn(),
  getCollection: jest.fn(),
};
const mockSendgridService = {
  mailSend: jest.fn(),
  apiKey: 'test-key',
  client: {},
  mail: {},
  initialize: jest.fn(),
};
const mockEmailConfirmationService = {
  createEmailConfirmation: jest.fn(),
};
const mockOfficeRndService = {
  getMembersByEmail: jest.fn(),
  createMember: jest.fn(),
  getOpportunityStatuses: jest.fn(),
  createOpportunity: jest.fn(),
  getMember: jest.fn(),
  updateMember: jest.fn(),
  getAllMembers: jest.fn(),
  getAllCompanies: jest.fn(),
  getLocations: jest.fn(),
  getOpportunities: jest.fn(),
  updateOpportunity: jest.fn(),
  addOverPayment: jest.fn(),
  addNewFee: jest.fn(),
};

const baseDeps = () => ({
  firestoreService: mockFirestoreService,
  sendgridService: mockSendgridService,
  emailConfirmationService: mockEmailConfirmationService,
  officeRndService: mockOfficeRndService,
});

const sampleFormData = {
  eventId: 'evt-123',
  email: 'test@example.com',
  phoneNumber: '123456789',
  firstName: 'John',
  lastName: 'Doe',
  preferredDate: '2024-07-01',
  preferredTime: '10:00',
  reason: 'Just visiting',
  interest: ['Coworking'],
  legal: true,
  referralCode: undefined,
  timezone: undefined,
  formId: 'form-1',
  submittedAt: new Date().toISOString(),
};

describe('TrialdayService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    TrialdayService.reset();
  });

  it('should implement singleton pattern', () => {
    const instance1 = TrialdayService.getInstance(baseDeps() as any);
    const instance2 = TrialdayService.getInstance(baseDeps() as any);
    expect(instance1).toBe(instance2);
    TrialdayService.reset();
    const instance3 = TrialdayService.getInstance(baseDeps() as any);
    expect(instance3).not.toBe(instance1);
  });

  describe('handleTrialdayRequest', () => {
    it('should create a new trialday and send confirmation if not duplicate', async () => {
      mockFirestoreService.queryCollection.mockResolvedValueOnce([]); // not duplicate
      mockFirestoreService.createDocumentReference.mockReturnValue({
        id: 'trialday-1',
      });
      mockFirestoreService.createDocument.mockResolvedValueOnce(undefined);
      mockEmailConfirmationService.createEmailConfirmation.mockResolvedValueOnce(
        undefined
      );
      mockFirestoreService.updateDocument.mockResolvedValueOnce(undefined);

      const service = TrialdayService.getInstance(baseDeps() as any);
      try {
        await service.handleTrialdayRequest(sampleFormData);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('handleTrialdayRequest error:', e);
        throw e;
      }
      expect(mockFirestoreService.queryCollection).toHaveBeenCalled();
      expect(mockFirestoreService.createDocument).toHaveBeenCalled();
      expect(
        mockEmailConfirmationService.createEmailConfirmation
      ).toHaveBeenCalled();
      expect(mockFirestoreService.updateDocument).toHaveBeenCalled();
    });

    it('should not create a new trialday if duplicate eventId', async () => {
      mockFirestoreService.queryCollection.mockResolvedValueOnce([{}]); // duplicate
      const service = TrialdayService.getInstance(baseDeps() as any);
      try {
        await service.handleTrialdayRequest(sampleFormData);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('handleTrialdayRequest error:', e);
        throw e;
      }
      expect(mockFirestoreService.createDocument).not.toHaveBeenCalled();
    });

    it('should throw TrialdayServiceError on dependency error', async () => {
      mockFirestoreService.queryCollection.mockRejectedValueOnce(
        new Error('db fail')
      );
      const service = TrialdayService.getInstance(baseDeps() as any);
      await expect(
        service.handleTrialdayRequest(sampleFormData)
      ).rejects.toThrow(TrialdayServiceError);
    });
  });

  describe('addToOfficeRnd', () => {
    const trialday = {
      id: 'trialday-1',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      phone: '123456789',
      referralCode: undefined,
      trialDateTime: new Date(),
      interestedIn: ['Coworking'],
      reason: 'Just visiting',
    };
    it('should use existing member and create opportunity', async () => {
      mockOfficeRndService.getMembersByEmail.mockResolvedValueOnce([
        {_id: 'member-1'},
      ]);
      mockOfficeRndService.getOpportunityStatuses.mockResolvedValueOnce([
        {description: 'trialRequest', _id: 'status-1', probability: 100},
      ]);
      mockOfficeRndService.createOpportunity.mockResolvedValueOnce({
        opportunity: 'op-1',
      });
      const service = TrialdayService.getInstance(baseDeps() as any);
      const result = await service.addToOfficeRnd(trialday as any);
      expect(result.member._id).toBe('member-1');
      expect(result.opportunity).toBeDefined();
    });
    it('should create member if not found', async () => {
      mockOfficeRndService.getMembersByEmail.mockResolvedValueOnce([]);
      mockOfficeRndService.createMember.mockResolvedValueOnce({
        _id: 'member-2',
      });
      mockOfficeRndService.getOpportunityStatuses.mockResolvedValueOnce([
        {description: 'trialRequest', _id: 'status-2', probability: 100},
      ]);
      mockOfficeRndService.createOpportunity.mockResolvedValueOnce({
        opportunity: 'op-2',
      });
      const service = TrialdayService.getInstance(baseDeps() as any);
      const result = await service.addToOfficeRnd(trialday as any);
      expect(result.member._id).toBe('member-2');
      expect(result.opportunity).toBeDefined();
    });
    it('should throw TrialdayServiceError if status not found', async () => {
      mockOfficeRndService.getMembersByEmail.mockResolvedValueOnce([
        {_id: 'member-1'},
      ]);
      mockOfficeRndService.getOpportunityStatuses.mockResolvedValueOnce([]);
      const service = TrialdayService.getInstance(baseDeps() as any);
      await expect(service.addToOfficeRnd(trialday as any)).rejects.toThrow(
        TrialdayServiceError
      );
    });
    it('should throw TrialdayServiceError on dependency error', async () => {
      mockOfficeRndService.getMembersByEmail.mockRejectedValueOnce(
        new Error('fail')
      );
      const service = TrialdayService.getInstance(baseDeps() as any);
      await expect(service.addToOfficeRnd(trialday as any)).rejects.toThrow(
        TrialdayServiceError
      );
    });
  });

  describe('error propagation', () => {
    it('should wrap errors in TrialdayServiceError for updateTrialdayStatus', async () => {
      mockFirestoreService.updateDocument.mockRejectedValueOnce(
        new Error('fail')
      );
      const service = TrialdayService.getInstance(baseDeps() as any);
      await expect(
        service.updateTrialdayStatus('id', TrialdayStatus.REQUESTED)
      ).rejects.toThrow(TrialdayServiceError);
    });
  });

  // Add more tests for other methods as needed, following the above patterns.
});
