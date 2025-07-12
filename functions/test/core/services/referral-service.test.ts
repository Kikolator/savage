import {ReferralService} from '../../../src/core/services/referral-service';
import {
  ReferralServiceError,
  ReferralServiceErrorCode,
} from '../../../src/core/errors';
import {ReferralStatus, ReferrerType} from '../../../src/core/data/enums';
import {Referral, ReferralCode} from '../../../src/core/data/models';

// Mock dependencies
const mockFirestoreService = {
  createDocument: jest.fn(),
  runTransaction: jest.fn(),
  queryCollectionWithTransaction: jest.fn(),
  queryCollection: jest.fn(),
  getDocumentWithTransaction: jest.fn(),
  setDocumentWithTransaction: jest.fn(),
  updateDocumentWithTransaction: jest.fn(),
  updateDocument: jest.fn(),
  createDocumentReference: jest.fn(),
  getServerTimestamp: jest.fn(),
  increment: jest.fn(),
  arrayUnion: jest.fn(),
};

const mockOfficeRndService = {
  getMember: jest.fn(),
  updateMember: jest.fn(),
};

const mockRewardService = {
  createRewardsForConversion: jest.fn(),
};

// Mock logger
jest.mock('firebase-functions', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('ReferralService', () => {
  let referralService: ReferralService;

  beforeEach(() => {
    jest.clearAllMocks();
    referralService = new ReferralService({
      firestoreService: mockFirestoreService as any,
      officeRndService: mockOfficeRndService as any,
      rewardService: mockRewardService as any,
    });
  });

  describe('createReferralCode', () => {
    const createReferralCodeParams = {
      referrerId: 'test-referrer-id',
      referrerCompanyId: 'test-company-id',
      referrerType: ReferrerType.MEMBER,
    };

    const mockReferrer = {
      properties: {
        referralPermission: true,
        referralOwnCode: null,
      },
    };

    const mockReferralCode = new ReferralCode({
      documentId: 'test-referrer-id',
      code: 'ABC123',
      ownerId: 'test-referrer-id',
      companyId: 'test-company-id',
      ownerType: ReferrerType.MEMBER,
      totalReferred: 0,
      totalConverted: 0,
      totalRewardedEur: 0,
      referredUsers: [],
    });

    it('should create referral code successfully', async () => {
      mockOfficeRndService.getMember.mockResolvedValue(mockReferrer);
      mockFirestoreService.createDocument.mockResolvedValue(undefined);
      mockOfficeRndService.updateMember.mockResolvedValue(undefined);

      const result = await referralService.createReferralCode(
        createReferralCodeParams
      );

      expect(result).toBeInstanceOf(ReferralCode);
      expect(result.code).toMatch(/^[A-Z0-9]{6}$/);
      expect(result.ownerId).toBe(createReferralCodeParams.referrerId);
      expect(mockFirestoreService.createDocument).toHaveBeenCalled();
      expect(mockOfficeRndService.updateMember).toHaveBeenCalledWith(
        createReferralCodeParams.referrerId,
        {referralOwnCode: result.code}
      );
    });

    it('should throw error when referrer has no permission', async () => {
      const referrerWithoutPermission = {
        ...mockReferrer,
        properties: {referralPermission: false, referralOwnCode: null},
      };
      mockOfficeRndService.getMember.mockResolvedValue(
        referrerWithoutPermission
      );

      await expect(
        referralService.createReferralCode(createReferralCodeParams)
      ).rejects.toThrow(ReferralServiceError);
      await expect(
        referralService.createReferralCode(createReferralCodeParams)
      ).rejects.toMatchObject({
        serviceCode: ReferralServiceErrorCode.NO_PERMISSION,
        status: 400,
      });
    });

    it('should throw error when referrer already has a code', async () => {
      const referrerWithCode = {
        ...mockReferrer,
        properties: {referralPermission: true, referralOwnCode: 'EXISTING'},
      };
      mockOfficeRndService.getMember.mockResolvedValue(referrerWithCode);

      await expect(
        referralService.createReferralCode(createReferralCodeParams)
      ).rejects.toThrow(ReferralServiceError);
      await expect(
        referralService.createReferralCode(createReferralCodeParams)
      ).rejects.toMatchObject({
        serviceCode: ReferralServiceErrorCode.ALREADY_EXISTS,
        status: 400,
      });
    });

    it('should retry on code collision and eventually succeed', async () => {
      mockOfficeRndService.getMember.mockResolvedValue(mockReferrer);
      mockFirestoreService.createDocument
        .mockRejectedValueOnce(new Error('Document already exists'))
        .mockResolvedValueOnce(undefined);
      mockOfficeRndService.updateMember.mockResolvedValue(undefined);

      const result = await referralService.createReferralCode(
        createReferralCodeParams
      );

      expect(result).toBeInstanceOf(ReferralCode);
      expect(mockFirestoreService.createDocument).toHaveBeenCalledTimes(2);
    });

    it('should throw error after maximum attempts', async () => {
      mockOfficeRndService.getMember.mockResolvedValue(mockReferrer);
      mockFirestoreService.createDocument.mockRejectedValue(
        new Error('Document already exists')
      );

      await expect(
        referralService.createReferralCode(createReferralCodeParams)
      ).rejects.toThrow(ReferralServiceError);
      await expect(
        referralService.createReferralCode(createReferralCodeParams)
      ).rejects.toMatchObject({
        serviceCode: ReferralServiceErrorCode.UNIQUE_CODE_FAILED,
        status: 500,
      });
    });
  });

  describe('createReferral', () => {
    const createReferralParams = {
      referralCode: 'ABC123',
      referredUserId: 'test-referred-user',
      referrerCompanyId: 'test-company-id',
      isTrialday: false,
      membershipStartDate: new Date('2024-01-01'),
      subscriptionValue: 100,
      referralValue: 50,
    };

    const mockReferralCodeDoc = {
      id: 'test-referrer-id',
      data: () => ({
        code: 'ABC123',
        ownerId: 'test-referrer-id',
        companyId: 'test-company-id',
        ownerType: ReferrerType.MEMBER,
        totalReferred: 0,
        totalConverted: 0,
        totalRewardedEur: 0,
        referredUsers: [],
      }),
    };

    const mockReferralCodeSnapshot = {
      empty: false,
      docs: [mockReferralCodeDoc],
    };

    const mockReferralDocRef = {
      id: 'new-referral-id',
    };

    beforeEach(() => {
      mockFirestoreService.runTransaction.mockImplementation(
        async (callback) => {
          return await callback({
            // Mock transaction object
          });
        }
      );
      mockFirestoreService.queryCollectionWithTransaction.mockResolvedValue(
        mockReferralCodeSnapshot
      );
      mockFirestoreService.queryCollection.mockResolvedValue([]);
      mockFirestoreService.createDocumentReference.mockReturnValue(
        mockReferralDocRef
      );
      mockFirestoreService.getServerTimestamp.mockReturnValue(new Date());
      mockFirestoreService.increment.mockReturnValue('increment-1');
      mockFirestoreService.arrayUnion.mockReturnValue(
        'array-union-referred-user'
      );
      mockOfficeRndService.updateMember.mockResolvedValue(undefined);
    });

    it('should create membership referral successfully', async () => {
      const result = await referralService.createReferral(createReferralParams);

      expect(result).toBeInstanceOf(Referral);
      expect(result.referralCode).toBe('ABC123');
      expect(result.referredUserId).toBe(createReferralParams.referredUserId);
      expect(result.status).toBe(ReferralStatus.AWAITING_PAYMENT);
      expect(
        mockFirestoreService.setDocumentWithTransaction
      ).toHaveBeenCalled();
      expect(
        mockFirestoreService.updateDocumentWithTransaction
      ).toHaveBeenCalled();
      expect(mockOfficeRndService.updateMember).toHaveBeenCalledWith(
        createReferralParams.referredUserId,
        {referralCodeUsed: 'ABC123'}
      );
    });

    it('should create trial day referral successfully', async () => {
      const trialDayParams = {
        ...createReferralParams,
        isTrialday: true,
        trialdayStartDate: new Date('2024-01-01'),
        trialDayId: 'trial-day-id',
        opportunityId: 'opportunity-id',
        membershipStartDate: undefined,
        subscriptionValue: undefined,
        referralValue: undefined,
      };

      const result = await referralService.createReferral(trialDayParams);

      expect(result).toBeInstanceOf(Referral);
      expect(result.status).toBe(ReferralStatus.TRIAL);
      expect(result.trialDayId).toBe('trial-day-id');
      expect(result.opportunityId).toBe('opportunity-id');
    });

    it('should throw error when referral code not found', async () => {
      const emptySnapshot = {empty: true, docs: []};
      mockFirestoreService.queryCollectionWithTransaction.mockResolvedValue(
        emptySnapshot
      );

      await expect(
        referralService.createReferral(createReferralParams)
      ).rejects.toThrow(ReferralServiceError);
      await expect(
        referralService.createReferral(createReferralParams)
      ).rejects.toMatchObject({
        serviceCode: ReferralServiceErrorCode.REFERRAL_CODE_NOT_FOUND,
        status: 404,
      });
    });

    it('should throw error when user already referred with this code', async () => {
      const referralCodeWithUser = {
        ...mockReferralCodeDoc,
        data: () => ({
          ...mockReferralCodeDoc.data(),
          referredUsers: [createReferralParams.referredUserId],
        }),
      };
      const snapshotWithUser = {
        empty: false,
        docs: [referralCodeWithUser],
      };
      mockFirestoreService.queryCollectionWithTransaction.mockResolvedValue(
        snapshotWithUser
      );

      await expect(
        referralService.createReferral(createReferralParams)
      ).rejects.toThrow(ReferralServiceError);
      await expect(
        referralService.createReferral(createReferralParams)
      ).rejects.toMatchObject({
        serviceCode: ReferralServiceErrorCode.ALREADY_REFFERED,
        status: 400,
      });
    });

    it('should throw error when user tries to refer themselves', async () => {
      const referralCodeOwnedByUser = {
        ...mockReferralCodeDoc,
        data: () => ({
          ...mockReferralCodeDoc.data(),
          ownerId: createReferralParams.referredUserId,
        }),
      };
      const snapshotOwnedByUser = {
        empty: false,
        docs: [referralCodeOwnedByUser],
      };
      mockFirestoreService.queryCollectionWithTransaction.mockResolvedValue(
        snapshotOwnedByUser
      );

      await expect(
        referralService.createReferral(createReferralParams)
      ).rejects.toThrow(ReferralServiceError);
      await expect(
        referralService.createReferral(createReferralParams)
      ).rejects.toMatchObject({
        serviceCode: ReferralServiceErrorCode.SELF_REFERRAL,
        status: 400,
      });
    });

    it('should throw error when user already referred with another code', async () => {
      mockFirestoreService.queryCollection.mockResolvedValue([
        {referralCode: 'OTHER123'},
      ]);

      await expect(
        referralService.createReferral(createReferralParams)
      ).rejects.toThrow(ReferralServiceError);
      await expect(
        referralService.createReferral(createReferralParams)
      ).rejects.toMatchObject({
        serviceCode: ReferralServiceErrorCode.ALREADY_REFFERED_OTHER,
        status: 400,
        details: {referralCode: 'OTHER123'},
      });
    });

    it('should throw error for invalid trial day parameters', async () => {
      const invalidTrialParams = {
        ...createReferralParams,
        isTrialday: true,
        // Missing required trial day fields
      };

      await expect(
        referralService.createReferral(invalidTrialParams)
      ).rejects.toThrow(ReferralServiceError);
      await expect(
        referralService.createReferral(invalidTrialParams)
      ).rejects.toMatchObject({
        serviceCode: ReferralServiceErrorCode.INVALID_ARGUMENT,
        status: 400,
      });
    });

    it('should throw error for invalid membership parameters', async () => {
      const invalidMembershipParams = {
        ...createReferralParams,
        isTrialday: false,
        // Missing required membership fields
        membershipStartDate: undefined,
        subscriptionValue: undefined,
        referralValue: undefined,
      };

      await expect(
        referralService.createReferral(invalidMembershipParams)
      ).rejects.toThrow(ReferralServiceError);
      await expect(
        referralService.createReferral(invalidMembershipParams)
      ).rejects.toMatchObject({
        serviceCode: ReferralServiceErrorCode.INVALID_ARGUMENT,
        status: 400,
      });
    });
  });

  describe('confirmConversion', () => {
    const confirmConversionParams = {
      referralId: 'test-referral-id',
    };

    const mockReferralDoc = {
      exists: true,
      data: () => ({
        id: 'test-referral-id',
        referrerId: 'test-referrer-id',
        referredUserId: 'test-referred-user',
        referralCode: 'ABC123',
        status: ReferralStatus.AWAITING_PAYMENT,
        membershipStartDate: new Date('2024-01-01'),
        subscriptionValue: 100,
        referralValue: 50,
        rewardIds: [],
      }),
    };

    const mockRewards = [
      {id: 'reward-1', amount: 50},
      {id: 'reward-2', amount: 25},
    ];

    beforeEach(() => {
      mockFirestoreService.runTransaction.mockImplementation(
        async (callback) => {
          return await callback({
            // Mock transaction object
          });
        }
      );
      mockFirestoreService.getDocumentWithTransaction.mockResolvedValue(
        mockReferralDoc
      );
      mockRewardService.createRewardsForConversion.mockResolvedValue(
        mockRewards
      );
      mockFirestoreService.updateDocument.mockResolvedValue(undefined);
    });

    it('should confirm conversion successfully', async () => {
      const result = await referralService.confirmConversion(
        confirmConversionParams
      );

      expect(result).toBeInstanceOf(Referral);
      expect(result.status).toBe(ReferralStatus.CONVERTED);
      expect(
        mockFirestoreService.updateDocumentWithTransaction
      ).toHaveBeenCalledWith(
        expect.anything(),
        'referrals',
        confirmConversionParams.referralId,
        {status: ReferralStatus.CONVERTED}
      );
      expect(mockRewardService.createRewardsForConversion).toHaveBeenCalledWith(
        result
      );
      expect(mockFirestoreService.updateDocument).toHaveBeenCalledWith({
        collection: 'referrals',
        documentId: result.id,
        data: {rewardIds: ['reward-1', 'reward-2']},
      });
    });

    it('should throw error when referral not found', async () => {
      const nonExistentDoc = {exists: false};
      mockFirestoreService.getDocumentWithTransaction.mockResolvedValue(
        nonExistentDoc
      );

      await expect(
        referralService.confirmConversion(confirmConversionParams)
      ).rejects.toThrow(ReferralServiceError);
      await expect(
        referralService.confirmConversion(confirmConversionParams)
      ).rejects.toMatchObject({
        serviceCode: ReferralServiceErrorCode.UNKNOWN_ERROR,
        status: 500,
      });
    });

    it('should throw error when referral data is undefined', async () => {
      const docWithNoData = {exists: true, data: () => undefined};
      mockFirestoreService.getDocumentWithTransaction.mockResolvedValue(
        docWithNoData
      );

      await expect(
        referralService.confirmConversion(confirmConversionParams)
      ).rejects.toThrow(ReferralServiceError);
      await expect(
        referralService.confirmConversion(confirmConversionParams)
      ).rejects.toMatchObject({
        serviceCode: ReferralServiceErrorCode.DATA_UNDEFINED,
        status: 400,
      });
    });

    it('should throw error when referral not eligible for conversion', async () => {
      const alreadyConvertedDoc = {
        ...mockReferralDoc,
        data: () => ({
          ...mockReferralDoc.data(),
          status: ReferralStatus.CONVERTED,
        }),
      };
      mockFirestoreService.getDocumentWithTransaction.mockResolvedValue(
        alreadyConvertedDoc
      );

      await expect(
        referralService.confirmConversion(confirmConversionParams)
      ).rejects.toThrow(ReferralServiceError);
      await expect(
        referralService.confirmConversion(confirmConversionParams)
      ).rejects.toMatchObject({
        serviceCode: ReferralServiceErrorCode.NOT_ELIGIBLE_FOR_CONVERSION,
        status: 400,
        details: {currentStatus: ReferralStatus.CONVERTED},
      });
    });

    it('should handle case with no rewards created', async () => {
      mockRewardService.createRewardsForConversion.mockResolvedValue([]);

      const result = await referralService.confirmConversion(
        confirmConversionParams
      );

      expect(result).toBeInstanceOf(Referral);
      expect(result.status).toBe(ReferralStatus.CONVERTED);
      expect(mockFirestoreService.updateDocument).not.toHaveBeenCalled();
    });
  });

  describe('BaseService Integration', () => {
    it('should extend BaseService', () => {
      expect(referralService).toBeInstanceOf(ReferralService);
      expect(referralService).toHaveProperty('ensureInitialized');
      expect(referralService).toHaveProperty('logMethodEntry');
      expect(referralService).toHaveProperty('logMethodSuccess');
      expect(referralService).toHaveProperty('logMethodError');
    });

    it('should initialize lazily', async () => {
      // Mock successful initialization
      mockOfficeRndService.getMember.mockResolvedValue({
        properties: {referralPermission: true, referralOwnCode: null},
      });
      mockFirestoreService.createDocument.mockResolvedValue(undefined);
      mockOfficeRndService.updateMember.mockResolvedValue(undefined);

      const params = {
        referrerId: 'test-id',
        referrerCompanyId: 'test-company',
        referrerType: ReferrerType.MEMBER,
      };

      await referralService.createReferralCode(params);

      // Should have called ensureInitialized internally
      expect(mockOfficeRndService.getMember).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should wrap unknown errors in ReferralServiceError', async () => {
      mockOfficeRndService.getMember.mockRejectedValue(
        new Error('Network error')
      );

      const params = {
        referrerId: 'test-id',
        referrerCompanyId: 'test-company',
        referrerType: ReferrerType.MEMBER,
      };

      await expect(referralService.createReferralCode(params)).rejects.toThrow(
        ReferralServiceError
      );
      await expect(
        referralService.createReferralCode(params)
      ).rejects.toMatchObject({
        serviceCode: ReferralServiceErrorCode.UNKNOWN_ERROR,
        status: 500,
      });
    });

    it('should preserve ReferralServiceError when already thrown', async () => {
      mockOfficeRndService.getMember.mockResolvedValue({
        properties: {referralPermission: false, referralOwnCode: null},
      });

      const params = {
        referrerId: 'test-id',
        referrerCompanyId: 'test-company',
        referrerType: ReferrerType.MEMBER,
      };

      await expect(referralService.createReferralCode(params)).rejects.toThrow(
        ReferralServiceError
      );
      await expect(
        referralService.createReferralCode(params)
      ).rejects.toMatchObject({
        serviceCode: ReferralServiceErrorCode.NO_PERMISSION,
        status: 400,
      });
    });
  });
});
