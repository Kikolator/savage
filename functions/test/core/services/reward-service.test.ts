import {RewardService} from '../../../src/core/services/reward-service';
import {RewardServiceError} from '../../../src/core/errors';
import {Referral, Reward} from '../../../src/core/data/models';
import {
  ReferralStatus,
  ReferrerType,
  RewardStatus,
  PayoutChannel,
} from '../../../src/core/data/enums';

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: jest.fn(() => 'server-timestamp'),
  },
  Timestamp: {
    fromDate: jest.fn((date: Date) => ({toDate: () => date})),
    now: jest.fn(() => ({toDate: () => new Date()})),
  },
}));

// Mock Firestore classes
const mockDocRef = {
  id: 'mock-doc-id',
  update: jest.fn(),
  ref: {
    update: jest.fn(),
  },
};

const mockQuerySnapshot = {
  docs: [
    {
      id: 'reward-1',
      data: () => ({
        referralId: 'referral-1',
        referrerId: 'referrer-1',
        referrerType: ReferrerType.MEMBER,
        amountEur: 50.0,
        dueDate: {toDate: () => new Date()},
        status: RewardStatus.SCHEDULED,
        payoutChannel: PayoutChannel.OFFICERND,
        referrerCompanyId: null,
      }),
      ref: mockDocRef,
    },
  ],
};

const mockFirestoreService = {
  createDocumentReference: jest.fn(() => mockDocRef),
  runBatch: jest.fn(),
  queryCollection: jest.fn(),
  queryCollectionSnapshot: jest.fn(),
};

const mockOfficeRndService = {
  addNewFee: jest.fn(),
};

const mockBankPayoutService = {
  issueTransfer: jest.fn(),
};

const sampleMemberReferral = new Referral({
  id: 'referral-1',
  referrerId: 'referrer-1',
  referrerCompanyId: null,
  referrerType: ReferrerType.MEMBER,
  referredUserId: 'referred-1',
  referralCode: 'REF123',
  trialStartDate: new Date('2024-01-01'),
  trialDayId: 'trial-1',
  opportunityId: 'opp-1',
  membershipStartDate: new Date('2024-01-15'),
  subscriptionValue: 100.0,
  referralValue: 50.0,
  status: ReferralStatus.CONVERTED,
  rewardIds: [],
});

const sampleBusinessReferral = new Referral({
  id: 'referral-2',
  referrerId: 'referrer-2',
  referrerCompanyId: 'company-1',
  referrerType: ReferrerType.BUSINESS,
  referredUserId: 'referred-2',
  referralCode: 'REF456',
  trialStartDate: new Date('2024-01-01'),
  trialDayId: 'trial-2',
  opportunityId: 'opp-2',
  membershipStartDate: new Date('2024-01-15'),
  subscriptionValue: 200.0,
  referralValue: 70.0,
  status: ReferralStatus.CONVERTED,
  rewardIds: [],
});

const sampleReward = new Reward({
  id: 'reward-1',
  referralId: 'referral-1',
  referrerId: 'referrer-1',
  referrerType: ReferrerType.MEMBER,
  amountEur: 50.0,
  dueDate: new Date(),
  status: RewardStatus.SCHEDULED,
  payoutChannel: PayoutChannel.OFFICERND,
  referrerCompanyId: null,
});

describe('RewardService', () => {
  let service: RewardService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RewardService(
      mockFirestoreService as any,
      mockOfficeRndService as any,
      mockBankPayoutService as any
    );
  });

  describe('createRewardsForConversion', () => {
    it('should create single reward for member referrer', async () => {
      mockFirestoreService.runBatch.mockImplementation(async (callback) => {
        const mockBatch = {
          set: jest.fn(),
        };
        await callback(mockBatch);
      });

      const result =
        await service.createRewardsForConversion(sampleMemberReferral);

      expect(result).toHaveLength(1);
      expect(result[0].referrerType).toBe(ReferrerType.MEMBER);
      expect(result[0].amountEur).toBe(50.0); // 50% of 100
      expect(result[0].payoutChannel).toBe(PayoutChannel.OFFICERND);
      expect(result[0].status).toBe(RewardStatus.SCHEDULED);
      expect(mockFirestoreService.runBatch).toHaveBeenCalled();
    });

    it('should create three rewards for business referrer', async () => {
      mockFirestoreService.runBatch.mockImplementation(async (callback) => {
        const mockBatch = {
          set: jest.fn(),
        };
        await callback(mockBatch);
      });

      const result = await service.createRewardsForConversion(
        sampleBusinessReferral
      );

      expect(result).toHaveLength(3);

      // First reward: 20% of 200 = 40
      expect(result[0].amountEur).toBe(40.0);
      expect(result[0].payoutChannel).toBe(PayoutChannel.OFFICERND);

      // Second reward: 10% of 200 = 20
      expect(result[1].amountEur).toBe(20.0);
      expect(result[1].payoutChannel).toBe(PayoutChannel.OFFICERND);

      // Third reward: 5% of 200 = 10
      expect(result[2].amountEur).toBe(10.0);
      expect(result[2].payoutChannel).toBe(PayoutChannel.OFFICERND);

      expect(mockFirestoreService.runBatch).toHaveBeenCalled();
    });

    it('should return empty array for non-converted referral', async () => {
      const nonConvertedReferral = new Referral({
        ...sampleMemberReferral,
        status: ReferralStatus.TRIAL,
      });

      const result =
        await service.createRewardsForConversion(nonConvertedReferral);
      expect(result).toEqual([]);
    });

    it('should throw error for referral without subscription value', async () => {
      const referralWithoutValue = new Referral({
        ...sampleMemberReferral,
        subscriptionValue: null,
      });

      await expect(
        service.createRewardsForConversion(referralWithoutValue)
      ).rejects.toThrow(RewardServiceError);
    });

    it('should throw error for referral with zero subscription value', async () => {
      const referralWithZeroValue = new Referral({
        ...sampleMemberReferral,
        subscriptionValue: 0,
      });

      await expect(
        service.createRewardsForConversion(referralWithZeroValue)
      ).rejects.toThrow(RewardServiceError);
    });

    it('should handle batch operation errors', async () => {
      mockFirestoreService.runBatch.mockRejectedValue(
        new Error('Batch failed')
      );

      await expect(
        service.createRewardsForConversion(sampleMemberReferral)
      ).rejects.toThrow(RewardServiceError);
    });

    it('should calculate due dates correctly for business referrer', async () => {
      mockFirestoreService.runBatch.mockImplementation(async (callback) => {
        const mockBatch = {
          set: jest.fn(),
        };
        await callback(mockBatch);
      });

      const result = await service.createRewardsForConversion(
        sampleBusinessReferral
      );

      const now = Date.now();
      const dayInMs = 86_400_000;

      // First reward: due immediately
      expect(result[0].dueDate.getTime()).toBeCloseTo(now, -2);

      // Second reward: due in 30 days
      expect(result[1].dueDate.getTime()).toBeCloseTo(now + 30 * dayInMs, -2);

      // Third reward: due in 60 days
      expect(result[2].dueDate.getTime()).toBeCloseTo(now + 60 * dayInMs, -2);
    });
  });

  describe('processDueRewards', () => {
    it('should process due rewards successfully', async () => {
      mockFirestoreService.queryCollectionSnapshot.mockResolvedValue(
        mockQuerySnapshot
      );
      mockOfficeRndService.addNewFee.mockResolvedValue('fee-id');

      await service.processDueRewards();

      expect(mockFirestoreService.queryCollectionSnapshot).toHaveBeenCalledWith(
        'rewards',
        [
          {
            field: 'status',
            operator: '==',
            value: RewardStatus.SCHEDULED,
          },
          {
            field: 'dueDate',
            operator: '<=',
            value: expect.any(Object), // Timestamp
          },
        ]
      );

      expect(mockOfficeRndService.addNewFee).toHaveBeenCalledWith({
        memberId: 'referrer-1',
        feeName: 'Referral Reward',
        planId: expect.any(String), // Accept any string for planId
        price: 50.0,
        issueDate: expect.any(Date),
        companyId: null,
      });

      expect(mockDocRef.update).toHaveBeenCalledWith({
        status: RewardStatus.PAID,
        paidAt: expect.anything(),
      });
    });

    it('should handle payout failures gracefully', async () => {
      mockFirestoreService.queryCollectionSnapshot.mockResolvedValue(
        mockQuerySnapshot
      );
      mockOfficeRndService.addNewFee.mockRejectedValue(
        new Error('Payout failed')
      );

      await service.processDueRewards();

      expect(mockDocRef.update).toHaveBeenCalledWith({
        status: RewardStatus.FAILED,
        lastError: 'Payout failed for reward reward-1',
      });
    });

    it('should handle Stripe payout channel', async () => {
      const stripeReward = new Reward({
        ...sampleReward,
        payoutChannel: PayoutChannel.STRIPE,
      });

      const mockStripeSnapshot = {
        docs: [
          {
            id: 'reward-1',
            data: () => stripeReward.toDocumentData(),
            ref: mockDocRef,
          },
        ],
      };

      mockFirestoreService.queryCollectionSnapshot.mockResolvedValue(
        mockStripeSnapshot
      );
      mockBankPayoutService.issueTransfer.mockResolvedValue('transfer-id');

      await service.processDueRewards();

      expect(mockBankPayoutService.issueTransfer).toHaveBeenCalledWith(
        'referrer-1',
        50.0
      );
    });

    it('should throw error for invalid payout channel', async () => {
      const invalidReward = new Reward({
        ...sampleReward,
        payoutChannel: 'INVALID' as PayoutChannel,
      });

      const mockInvalidSnapshot = {
        docs: [
          {
            id: 'reward-1',
            data: () => invalidReward.toDocumentData(),
            ref: mockDocRef,
          },
        ],
      };

      mockFirestoreService.queryCollectionSnapshot.mockResolvedValue(
        mockInvalidSnapshot
      );

      await service.processDueRewards();
      expect(mockDocRef.update).toHaveBeenCalledWith({
        status: RewardStatus.FAILED,
        lastError: 'Invalid payout channel: INVALID',
      });
    });

    it('should throw error for manual payout channel', async () => {
      const manualReward = new Reward({
        ...sampleReward,
        payoutChannel: PayoutChannel.MANUAL,
      });

      const mockManualSnapshot = {
        docs: [
          {
            id: 'reward-1',
            data: () => manualReward.toDocumentData(),
            ref: mockDocRef,
          },
        ],
      };

      mockFirestoreService.queryCollectionSnapshot.mockResolvedValue(
        mockManualSnapshot
      );

      await service.processDueRewards();
      expect(mockDocRef.update).toHaveBeenCalledWith({
        status: RewardStatus.FAILED,
        lastError: 'Invalid payout channel: Manual payout not implemented yet',
      });
    });

    it('should handle empty query results', async () => {
      const emptySnapshot = {docs: []};
      mockFirestoreService.queryCollectionSnapshot.mockResolvedValue(
        emptySnapshot
      );

      await service.processDueRewards();

      expect(mockFirestoreService.queryCollectionSnapshot).toHaveBeenCalled();
      expect(mockOfficeRndService.addNewFee).not.toHaveBeenCalled();
    });

    it('should handle query errors', async () => {
      mockFirestoreService.queryCollectionSnapshot.mockRejectedValue(
        new Error('Query failed')
      );

      await expect(service.processDueRewards()).rejects.toThrow(
        RewardServiceError
      );
    });
  });

  describe('voidFutureRewards', () => {
    it('should void future rewards for referral', async () => {
      const mockRewards = [
        {
          id: 'reward-1',
          data: () => sampleReward.toDocumentData(),
          ref: mockDocRef,
        },
        {
          id: 'reward-2',
          data: () => sampleReward.toDocumentData(),
          ref: mockDocRef,
        },
      ];

      mockFirestoreService.queryCollection.mockResolvedValue(mockRewards);
      mockFirestoreService.runBatch.mockImplementation(async (callback) => {
        const mockBatch = {
          update: jest.fn(),
        };
        await callback(mockBatch);
      });

      await service.voidFutureRewards('referral-1');

      expect(mockFirestoreService.queryCollection).toHaveBeenCalledWith(
        'rewards',
        [
          {
            field: 'referralId',
            operator: '==',
            value: 'referral-1',
          },
          {
            field: 'status',
            operator: '==',
            value: RewardStatus.SCHEDULED,
          },
        ]
      );

      expect(mockFirestoreService.runBatch).toHaveBeenCalled();
    });

    it('should handle empty results', async () => {
      mockFirestoreService.queryCollection.mockResolvedValue([]);
      mockFirestoreService.runBatch.mockImplementation(async (callback) => {
        const mockBatch = {
          update: jest.fn(),
        };
        await callback(mockBatch);
      });

      await service.voidFutureRewards('referral-1');

      expect(mockFirestoreService.queryCollection).toHaveBeenCalled();
      expect(mockFirestoreService.runBatch).toHaveBeenCalled();
    });

    it('should handle query errors', async () => {
      mockFirestoreService.queryCollection.mockRejectedValue(
        new Error('Query failed')
      );

      await expect(service.voidFutureRewards('referral-1')).rejects.toThrow(
        RewardServiceError
      );
    });

    it('should handle batch operation errors', async () => {
      const mockRewards = [
        {
          id: 'reward-1',
          data: () => sampleReward.toDocumentData(),
          ref: mockDocRef,
        },
      ];

      mockFirestoreService.queryCollection.mockResolvedValue(mockRewards);
      mockFirestoreService.runBatch.mockRejectedValue(
        new Error('Batch failed')
      );

      await expect(service.voidFutureRewards('referral-1')).rejects.toThrow(
        RewardServiceError
      );
    });
  });

  describe('BaseService Integration', () => {
    it('should extend BaseService', () => {
      expect(service).toBeInstanceOf(RewardService);
      expect(service['firestoreService']).toBe(mockFirestoreService);
      expect(service['officeRndService']).toBe(mockOfficeRndService);
      expect(service['bankPayoutService']).toBe(mockBankPayoutService);
    });

    it('should initialize lazily', async () => {
      // Service should not be initialized until first method call
      expect(service['initialized']).toBe(false);

      mockFirestoreService.runBatch.mockImplementation(async (callback) => {
        const mockBatch = {
          set: jest.fn(),
        };
        await callback(mockBatch);
      });

      await service.createRewardsForConversion(sampleMemberReferral);

      expect(service['initialized']).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should wrap generic errors in RewardServiceError', async () => {
      mockFirestoreService.runBatch.mockRejectedValue(
        new Error('Generic error')
      );

      await expect(
        service.createRewardsForConversion(sampleMemberReferral)
      ).rejects.toThrow(RewardServiceError);
    });

    it('should preserve RewardServiceError when already thrown', async () => {
      const referralWithoutValue = new Referral({
        ...sampleMemberReferral,
        subscriptionValue: null,
      });

      await expect(
        service.createRewardsForConversion(referralWithoutValue)
      ).rejects.toThrow(RewardServiceError);
    });

    it('should handle OfficeRnd service errors', async () => {
      mockFirestoreService.queryCollectionSnapshot.mockResolvedValue(
        mockQuerySnapshot
      );
      mockOfficeRndService.addNewFee.mockRejectedValue(
        new Error('OfficeRnd error')
      );

      await service.processDueRewards();

      expect(mockDocRef.update).toHaveBeenCalledWith({
        status: RewardStatus.FAILED,
        lastError: 'Payout failed for reward reward-1',
      });
    });

    it('should handle BankPayout service errors', async () => {
      const stripeReward = new Reward({
        ...sampleReward,
        payoutChannel: PayoutChannel.STRIPE,
      });

      const mockStripeSnapshot = {
        docs: [
          {
            id: 'reward-1',
            data: () => stripeReward.toDocumentData(),
            ref: mockDocRef,
          },
        ],
      };

      mockFirestoreService.queryCollectionSnapshot.mockResolvedValue(
        mockStripeSnapshot
      );
      mockBankPayoutService.issueTransfer.mockRejectedValue(
        new Error('Bank error')
      );

      await service.processDueRewards();

      expect(mockDocRef.update).toHaveBeenCalledWith({
        status: RewardStatus.FAILED,
        lastError: 'Payout failed for reward reward-1',
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle referral with company ID', async () => {
      const businessReferralWithCompany = new Referral({
        ...sampleBusinessReferral,
        referrerCompanyId: 'company-123',
      });

      mockFirestoreService.runBatch.mockImplementation(async (callback) => {
        const mockBatch = {
          set: jest.fn(),
        };
        await callback(mockBatch);
      });

      const result = await service.createRewardsForConversion(
        businessReferralWithCompany
      );

      expect(result[0].referrerCompanyId).toBe('company-123');
    });

    it('should handle decimal precision in reward amounts', async () => {
      const referralWithDecimalValue = new Referral({
        ...sampleMemberReferral,
        subscriptionValue: 99.99,
      });

      mockFirestoreService.runBatch.mockImplementation(async (callback) => {
        const mockBatch = {
          set: jest.fn(),
        };
        await callback(mockBatch);
      });

      const result = await service.createRewardsForConversion(
        referralWithDecimalValue
      );

      expect(result[0].amountEur).toBe(49.99); // 50% of 99.99
    });

    it('should handle multiple rewards in batch processing', async () => {
      const multipleRewardsSnapshot = {
        docs: [
          {
            id: 'reward-1',
            data: () => sampleReward.toDocumentData(),
            ref: mockDocRef,
          },
          {
            id: 'reward-2',
            data: () => ({
              ...sampleReward.toDocumentData(),
              id: 'reward-2',
              payoutChannel: PayoutChannel.STRIPE,
            }),
            ref: mockDocRef,
          },
        ],
      };

      mockFirestoreService.queryCollectionSnapshot.mockResolvedValue(
        multipleRewardsSnapshot
      );
      mockOfficeRndService.addNewFee.mockResolvedValue('fee-id-1');
      mockBankPayoutService.issueTransfer.mockResolvedValue('transfer-id-2');

      await service.processDueRewards();

      expect(mockOfficeRndService.addNewFee).toHaveBeenCalledTimes(1);
      expect(mockBankPayoutService.issueTransfer).toHaveBeenCalledTimes(1);
    });
  });
});
