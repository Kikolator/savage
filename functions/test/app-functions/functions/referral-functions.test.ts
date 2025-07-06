import {jest, describe, it, expect, beforeEach} from '@jest/globals';
import {HttpsError} from 'firebase-functions/v2/https';

import {ReferralFunctions} from '../../../src/app-functions/functions/referral-functions';
import {ServiceResolver} from '../../../src/core/services/di';
import {ReferrerType} from '../../../src/core/data/enums';
import {AppError, ErrorCode} from '../../../src/core/errors/app-error';
import {createMockCallableRequest} from '../../utils/test-helpers';

// Mock the ServiceResolver
jest.mock('../../../src/core/services/di');

describe('ReferralFunctions', () => {
  let referralFunctions: ReferralFunctions;
  let mockReferralService: any;
  let mockAddFunction: jest.Mock;

  beforeEach(() => {
    referralFunctions = new ReferralFunctions();

    // Mock referral service
    mockReferralService = {
      createReferralCode: jest.fn(),
    };

    // Mock ServiceResolver
    (ServiceResolver.getReferralService as jest.Mock).mockReturnValue(
      mockReferralService
    );

    // Mock add function
    mockAddFunction = jest.fn();
  });

  describe('initialize', () => {
    it('should register createReferralCode function', () => {
      referralFunctions.initialize(mockAddFunction);

      expect(mockAddFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'createReferralCode',
          handler: expect.any(Object),
        })
      );
    });
  });

  describe('createReferralCode', () => {
    let handler: any;

    beforeEach(() => {
      referralFunctions.initialize(mockAddFunction);
      handler = mockAddFunction.mock.calls[0][0].handler;
    });

    it('should create referral code successfully', async () => {
      const mockReferralCode = {
        id: 'ref-123',
        code: 'SAVAGE123',
        referrerId: 'member-123',
        referrerCompanyId: 'company-123',
        referrerType: ReferrerType.MEMBER,
      };

      mockReferralService.createReferralCode.mockResolvedValue(
        mockReferralCode
      );

      const request = createMockCallableRequest({
        memberId: 'member-123',
        companyId: 'company-123',
      });

      const result = await handler(request);

      expect(mockReferralService.createReferralCode).toHaveBeenCalledWith({
        referrerId: 'member-123',
        referrerCompanyId: 'company-123',
        referrerType: ReferrerType.MEMBER,
      });
      expect(result).toEqual(mockReferralCode);
    });

    it('should handle REFERRAL_CODE_ALREADY_EXISTS error', async () => {
      const appError = new AppError(
        'Referral code already exists',
        ErrorCode.REFERRAL_CODE_ALREADY_EXISTS,
        409
      );

      mockReferralService.createReferralCode.mockRejectedValue(appError);

      const request = createMockCallableRequest({
        memberId: 'member-123',
        companyId: 'company-123',
      });

      await expect(handler(request)).rejects.toThrow(HttpsError);
      await expect(handler(request)).rejects.toMatchObject({
        code: 'already-exists',
        message:
          'Referral code already exists for the user, so you cannot create a new one.',
      });
    });

    it('should handle REFERRAL_CODE_NO_PERMISSION error', async () => {
      const appError = new AppError(
        'No permission',
        ErrorCode.REFERRAL_CODE_NO_PERMISSION,
        403
      );

      mockReferralService.createReferralCode.mockRejectedValue(appError);

      const request = createMockCallableRequest({
        memberId: 'member-123',
        companyId: 'company-123',
      });

      await expect(handler(request)).rejects.toThrow(HttpsError);
      await expect(handler(request)).rejects.toMatchObject({
        code: 'permission-denied',
        message: 'User does not have permission to create a referral code.',
      });
    });

    it('should handle other AppError types', async () => {
      const appError = new AppError(
        'Some other error',
        ErrorCode.UNKNOWN_ERROR,
        500
      );

      mockReferralService.createReferralCode.mockRejectedValue(appError);

      const request = createMockCallableRequest({
        memberId: 'member-123',
        companyId: 'company-123',
      });

      await expect(handler(request)).rejects.toThrow(HttpsError);
      await expect(handler(request)).rejects.toMatchObject({
        code: 'unknown',
        message: 'Error creating referral code',
      });
    });

    it('should handle generic errors', async () => {
      const genericError = new Error('Generic error');

      mockReferralService.createReferralCode.mockRejectedValue(genericError);

      const request = createMockCallableRequest({
        memberId: 'member-123',
        companyId: 'company-123',
      });

      await expect(handler(request)).rejects.toThrow(HttpsError);
      await expect(handler(request)).rejects.toMatchObject({
        code: 'unknown',
        message: 'Error creating referral code',
      });
    });

    it('should handle missing data gracefully', async () => {
      const request = createMockCallableRequest({});

      await expect(handler(request)).rejects.toThrow();
    });
  });
});
