import {logger} from 'firebase-functions/v2';
import {HttpsError, onCall} from 'firebase-functions/v2/https';

import {
  AddCallableFunction,
  CallableV2Function,
  InitializeCallableFunctions,
} from '../initialize-callable-functions';
import {STATIC_CONFIG} from '../../core/config';
import {CreateReferralCodeCallData} from '../../core/data/models/referral-code/create-referral-code-call-data';
import {ServiceResolver} from '../../core/services/di';
import {ReferrerType} from '../../core/data/enums';
import {AppError} from '../../core/errors/app-error';
import {
  ReferralServiceError,
  ReferralServiceErrorCode,
} from '../../core/errors/services/referral-service-error';

export class ReferralFunctions implements InitializeCallableFunctions {
  initialize(add: AddCallableFunction): void {
    add(this.createReferralCode);
  }

  private readonly createReferralCode: CallableV2Function = {
    name: 'createReferralCode',
    handler: onCall(
      {
        region: STATIC_CONFIG.region,
        // TODO update cors settings for production.
        cors: [
          'http://localhost:*',
          'https://localhost:*',
          'https://*.savage-coworking.com*',
        ],
      },
      async (request) => {
        try {
          logger.debug('creating referral code');
          // 1. Check data is valid.
          const data = request.data as CreateReferralCodeCallData;

          // 2. Create referral code.
          const referralService = ServiceResolver.getReferralService();
          const referralCode = await referralService.createReferralCode({
            referrerId: data.memberId,
            referrerCompanyId: data.companyId,
            referrerType: ReferrerType.MEMBER,
          });
          // 3. Return referral code.
          return referralCode;
        } catch (error) {
          logger.error('Error creating referral code', error);
          if (error instanceof ReferralServiceError) {
            if (error.serviceCode === ReferralServiceErrorCode.ALREADY_EXISTS) {
              throw new HttpsError(
                'already-exists',
                'Referral code already exists ' +
                  'for the user, so you cannot create a new one.'
              );
            } else if (
              error.serviceCode === ReferralServiceErrorCode.NO_PERMISSION
            ) {
              throw new HttpsError(
                'permission-denied',
                'User does not have permission to create a referral code.'
              );
            } else {
              throw new HttpsError(
                'unknown',
                'Error creating referral code',
                `Error creating referral code: ${error.message} //` +
                  ` Code: ${error.code}`
              );
            }
          } else if (error instanceof AppError) {
            throw new HttpsError(
              'unknown',
              'Error creating referral code',
              `Error creating referral code: ${error.message}`
            );
          } else {
            throw new HttpsError(
              'unknown',
              'Error creating referral code',
              error
            );
          }
        }
      }
    ),
  };
}
