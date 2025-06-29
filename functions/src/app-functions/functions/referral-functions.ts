import {logger} from 'firebase-functions/v2';
import {HttpsError, onCall} from 'firebase-functions/v2/https';

import {
  AddCallableFunction,
  CallableV2Function,
  InitializeCallableFunctions,
} from '../initialize-callable-functions';
import {mainConfig} from '../../core/config/main-config';
import {CreateReferralCodeCallData} from '../../core/data/models/referral-code/create-referral-code-call-data';
import {FirestoreService} from '../../core/services/firestore-service';
import OfficeRndService from '../../core/services/office-rnd-service';
import {RewardService} from '../../core/services/reward-service';
import {ReferralService} from '../../core/services/referral-service';
import {BankPayoutService} from '../../core/services/bank-payout-service';
import {ReferrerType} from '../../core/data/enums';
import {AppError, ErrorCode} from '../../core/errors/app-error';

export class ReferralFunctions implements InitializeCallableFunctions {
  initialize(add: AddCallableFunction): void {
    add(this.createReferralCode);
  }

  private readonly createReferralCode: CallableV2Function = {
    name: 'createReferralCode',
    handler: onCall(
      {
        region: mainConfig.cloudFunctionsLocation,
        // TODO update cors settings for production.
        cors: ['http://localhost:*', 'https://localhost:*'],
      },
      async (request) => {
        try {
          logger.debug('creating referral code');
          // 1. Check data is valid.
          const data = request.data as CreateReferralCodeCallData;

          // 2. Create referral code.
          const referralService = new ReferralService({
            firestoreService: FirestoreService.getInstance(),
            officeRndService: new OfficeRndService({
              firestoreService: FirestoreService.getInstance(),
            }),
            rewardService: new RewardService(
              FirestoreService.getInstance(),
              new OfficeRndService({
                firestoreService: FirestoreService.getInstance(),
              }),
              new BankPayoutService()
            ),
          });
          const referralCode = await referralService.createReferralCode({
            referrerId: data.memberId,
            referrerCompanyId: data.companyId,
            referrerType: ReferrerType.MEMBER,
          });
          // 3. Return referral code.
          return referralCode;
        } catch (error) {
          logger.error('Error creating referral code', error);
          if (error instanceof AppError) {
            if (error.code === ErrorCode.REFERRAL_CODE_ALREADY_EXISTS) {
              throw new HttpsError(
                'already-exists',
                'Referral code already exists ' +
                  'for the user, so you cannot create a new one.'
              );
            } else if (error.code === ErrorCode.REFERRAL_CODE_NO_PERMISSION) {
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
