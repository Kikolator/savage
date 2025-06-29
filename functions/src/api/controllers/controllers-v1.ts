import {BankPayoutService} from '../../core/services/bank-payout-service';
import {FirestoreService} from '../../core/services/firestore-service';
import GoogleCalService from '../../core/services/google-cal-service';
import OfficeRndService from '../../core/services/office-rnd-service';
import {ReferralService} from '../../core/services/referral-service';
import {RewardService} from '../../core/services/reward-service';
import {SendgridService} from '../../core/services/sendgrid-service';
import {TrialdayService} from '../../core/services/trialday-service';

import TestController from './test-controllers/test-controller';
import TypeformController from './typeform-controller/typeform-controller';

import {Controller} from '.';

export const getControllersV1 = (): Array<Controller> => [
  new TestController(),
  new TypeformController({
    trialdayService: new TrialdayService({
      firestoreService: FirestoreService.getInstance(),
      officeService: new OfficeRndService({
        firestoreService: FirestoreService.getInstance(),
      }),
      sendgridService: SendgridService.getInstance(),
      calendarService: new GoogleCalService(),
      referralService: new ReferralService({
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
      }),
    }),
  }),
];
