import OfficeRndService from '../../../src/core/services/office-rnd-service';
import {FirestoreService} from '../../../src/core/services/firestore-service';
import {OfficeRnDServiceError} from '../../../src/core/errors/services/office-rnd-service-error';
import {
  FirestoreServiceError,
  FirestoreErrorCode,
} from '../../../src/core/errors';
import {OfficeRndMemberStatus} from '../../../src/core/data/enums/office-rnd/office-rnd-member-status';
import {
  OfficeRndMember,
  OfficeRndCompany,
  OfficeRndOpportunity,
  OfficeRndOpportunityStatus,
  OfficeRndTokenResponse,
} from '../../../src/core/data/models';

// Mock config
jest.mock('../../../src/core/config', () => ({
  getConfig: jest.fn(() => ({
    runtime: {
      officeRnd: {
        apiV2url: 'https://api.officernd.com/v2',
        orgSlug: 'test-org',
        secretKey: 'test-secret',
        clientId: 'test-client-id',
        grantType: 'client_credentials',
        scopes: 'test-scope',
        defaultLocationId: 'loc-1',
        defaultReferralPlanId: 'plan-1',
      },
    },
  })),
}));

// Mock environment
jest.mock('../../../src/core/utils/environment', () => ({
  isDevelopment: jest.fn(() => false),
}));

const mockFirestoreService = {
  getDocument: jest.fn(),
  setDocument: jest.fn(),
  getCollection: jest.fn(),
  queryCollection: jest.fn(),
};

const baseDeps = () => ({
  firestoreService: mockFirestoreService,
});

describe('OfficeRndService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    OfficeRndService.reset();
  });

  describe('Singleton Pattern', () => {
    it('should implement singleton pattern', () => {
      const instance1 = OfficeRndService.getInstance(baseDeps() as any);
      const instance2 = OfficeRndService.getInstance(baseDeps() as any);
      expect(instance1).toBe(instance2);
      OfficeRndService.reset();
      const instance3 = OfficeRndService.getInstance(baseDeps() as any);
      expect(instance3).not.toBe(instance1);
    });
  });

  describe('Token Initialization', () => {
    it('should initialize token from Firestore', async () => {
      const token: OfficeRndTokenResponse = {
        access_token: 'token',
        expires_in: 3600,
        token_type: 'Bearer',
        updated_at: {_seconds: Math.floor(Date.now() / 1000), _nanoseconds: 0},
        scope: 'test-scope',
      };
      mockFirestoreService.getDocument.mockResolvedValueOnce(token);
      const service = OfficeRndService.getInstance(baseDeps() as any);
      await service['initializeToken']();
      expect(mockFirestoreService.getDocument).toHaveBeenCalledWith(
        'officeRndMetadata',
        'token'
      );
    });

    it('should refresh token if expired', async () => {
      const expiredToken: OfficeRndTokenResponse = {
        access_token: 'expired',
        expires_in: 1,
        token_type: 'Bearer',
        updated_at: {
          _seconds: Math.floor(Date.now() / 1000) - 4000,
          _nanoseconds: 0,
        },
        scope: 'test-scope',
      };
      mockFirestoreService.getDocument.mockResolvedValueOnce(expiredToken);
      mockFirestoreService.setDocument.mockResolvedValueOnce(undefined);
      // Mock fetch for token refresh
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        json: async () => ({
          access_token: 'new-token',
          expires_in: 3600,
          token_type: 'Bearer',
          updated_at: {
            _seconds: Math.floor(Date.now() / 1000),
            _nanoseconds: 0,
          },
          scope: 'test-scope',
        }),
      }) as any;
      const service = OfficeRndService.getInstance(baseDeps() as any);
      await service['initializeToken']();
      expect(global.fetch).toHaveBeenCalled();
      expect(mockFirestoreService.setDocument).toHaveBeenCalled();
    });

    it('should handle Firestore document not found and recover', async () => {
      const validToken: OfficeRndTokenResponse = {
        access_token: 'new-token',
        expires_in: 3600,
        token_type: 'Bearer',
        updated_at: {_seconds: Math.floor(Date.now() / 1000), _nanoseconds: 0},
        scope: 'test-scope',
      };
      mockFirestoreService.getDocument
        .mockRejectedValueOnce(
          new FirestoreServiceError(
            'Not found',
            FirestoreErrorCode.DOCUMENT_NOT_FOUND
          )
        )
        .mockResolvedValueOnce(validToken);
      mockFirestoreService.setDocument.mockResolvedValueOnce(undefined);
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        json: async () => validToken,
      }) as any;
      const service = OfficeRndService.getInstance(baseDeps() as any);
      await service['initializeToken']();
      expect(global.fetch).toHaveBeenCalled();
      expect(mockFirestoreService.setDocument).toHaveBeenCalled();
    });
  });

  describe('getMember', () => {
    it('should fetch member from API', async () => {
      const token: OfficeRndTokenResponse = {
        access_token: 'token',
        expires_in: 3600,
        token_type: 'Bearer',
        updated_at: {_seconds: Math.floor(Date.now() / 1000), _nanoseconds: 0},
        scope: 'test-scope',
      };
      mockFirestoreService.getDocument.mockResolvedValue(token);
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        json: async () => ({_id: 'member-1', name: 'Test Member'}),
      }) as any;
      const service = OfficeRndService.getInstance(baseDeps() as any);
      const member = await service.getMember('member-1');
      expect(member._id).toBe('member-1');
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should throw error if API returns non-200', async () => {
      const token: OfficeRndTokenResponse = {
        access_token: 'token',
        expires_in: 3600,
        token_type: 'Bearer',
        updated_at: {_seconds: Math.floor(Date.now() / 1000), _nanoseconds: 0},
        scope: 'test-scope',
      };
      mockFirestoreService.getDocument.mockResolvedValue(token);
      global.fetch = jest.fn().mockResolvedValue({
        status: 404,
        json: async () => ({error: 'Not found'}),
      }) as any;
      const service = OfficeRndService.getInstance(baseDeps() as any);
      await expect(service.getMember('member-1')).rejects.toThrow(
        OfficeRnDServiceError
      );
    });
  });

  describe('getAllMembers', () => {
    it('should fetch all members from Firestore', async () => {
      mockFirestoreService.getCollection.mockResolvedValueOnce([
        {_id: 'member-1', name: 'Test Member'},
      ]);
      const service = OfficeRndService.getInstance(baseDeps() as any);
      const members = await service.getAllMembers();
      expect(members).toHaveLength(1);
      expect(members[0]._id).toBe('member-1');
    });

    it('should return empty array if collection is empty', async () => {
      mockFirestoreService.getCollection.mockRejectedValueOnce(
        new FirestoreServiceError('Empty', FirestoreErrorCode.COLLECTION_EMPTY)
      );
      const service = OfficeRndService.getInstance(baseDeps() as any);
      const members = await service.getAllMembers();
      expect(members).toEqual([]);
    });
  });

  describe('updateMember', () => {
    it('should update member via API', async () => {
      const token: OfficeRndTokenResponse = {
        access_token: 'token',
        expires_in: 3600,
        token_type: 'Bearer',
        updated_at: {_seconds: Math.floor(Date.now() / 1000), _nanoseconds: 0},
        scope: 'test-scope',
      };
      mockFirestoreService.getDocument.mockResolvedValue(token);
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        json: async () => ({_id: 'member-1', name: 'Test Member'}),
      }) as any;
      const service = OfficeRndService.getInstance(baseDeps() as any);
      await service.updateMember('member-1', {});
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should skip API call in development mode', async () => {
      const env = jest.requireMock('../../../src/core/utils/environment');
      env.isDevelopment.mockReturnValueOnce(true);
      const service = OfficeRndService.getInstance(baseDeps() as any);
      await service.updateMember('member-1', {});
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should wrap unknown errors in OfficeRnDServiceError', async () => {
      mockFirestoreService.getDocument.mockImplementation(() => {
        throw new Error('fail');
      });
      const service = OfficeRndService.getInstance(baseDeps() as any);
      await expect(service.getMember('member-1')).rejects.toThrow(
        OfficeRnDServiceError
      );
    });
  });
});
