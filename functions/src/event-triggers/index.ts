import {EmailConfirmationService} from '../core/services/email-confirmation-service';
import {FirestoreService} from '../core/services/firestore-service';
import OfficeRndService from '../core/services/office-rnd-service';
import {SendgridService} from '../core/services/sendgrid-service';
import {TrialdayService} from '../core/services/trialday-service';
import {ReferralService} from '../core/services/referral-service';
import {RewardService} from '../core/services/reward-service';
import {BankPayoutService} from '../core/services/bank-payout-service';

import {TrialdayEvents} from './by-document/trialday-events';
import {OfficeRndMemberEvents} from './by-document/office-rnd-member-events';
import {InitializeEventTriggers} from './initialize-event-triggers';

const eventTriggerList: Array<InitializeEventTriggers> = [
  new TrialdayEvents(
    new TrialdayService({
      sendgridService: SendgridService.getInstance(),
      firestoreService: FirestoreService.getInstance(),
      emailConfirmationService: new EmailConfirmationService({
        firestoreService: FirestoreService.getInstance(),
        sendgridService: SendgridService.getInstance(),
      }),
      officeRndService: new OfficeRndService({
        firestoreService: FirestoreService.getInstance(),
      }),
    }),
    new ReferralService({
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
    new OfficeRndService({
      firestoreService: FirestoreService.getInstance(),
    })
  ),
  new OfficeRndMemberEvents(),
];

export function eventTriggers(): {[key: string]: unknown} {
  const res: {[key: string]: unknown} = {};
  for (const v2 of eventTriggerList) {
    v2.initialize((params) => {
      res[params.name] = params.handler;
    });
  }
  return res;
}
