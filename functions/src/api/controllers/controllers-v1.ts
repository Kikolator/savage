import {FirestoreService} from '../../core/services/firestore-service';
import {SendgridService} from '../../core/services/sendgrid-service';
import {TrialdayService} from '../../core/services/trialday-service';
import {EmailConfirmationService} from '../../core/services/email-confirmation-service';
import OfficeRndService from '../../core/services/office-rnd-service';

import TestController from './test-controllers/test-controller';
import TypeformController from './typeform-controller/typeform-controller';
import {ConfirmEmailController} from './confirm-email-controller/confirm-email-controller';
import OfficeRndController from './office-rnd-controller/office-rnd-controller';

import {Controller} from '.';

export const getControllersV1 = (): Array<Controller> => [
  new TestController(),
  new TypeformController({
    trialdayService: new TrialdayService({
      firestoreService: FirestoreService.getInstance(),
      // officeService: new OfficeRndService({
      //   firestoreService: FirestoreService.getInstance(),
      // }),
      sendgridService: SendgridService.getInstance(),
      // calendarService: new GoogleCalService(),
      // referralService: new ReferralService({
      //   firestoreService: FirestoreService.getInstance(),
      //   officeRndService: new OfficeRndService({
      //     firestoreService: FirestoreService.getInstance(),
      //   }),
      //   rewardService: new RewardService(
      //     FirestoreService.getInstance(),
      //     new OfficeRndService({
      //       firestoreService: FirestoreService.getInstance(),
      //     }),
      //     new BankPayoutService()
      //   ),
      // }),
      emailConfirmationService: new EmailConfirmationService({
        firestoreService: FirestoreService.getInstance(),
        sendgridService: SendgridService.getInstance(),
      }),
      officeRndService: new OfficeRndService({
        firestoreService: FirestoreService.getInstance(),
      }),
    }),
  }),
  new ConfirmEmailController(
    new EmailConfirmationService({
      firestoreService: FirestoreService.getInstance(),
      sendgridService: SendgridService.getInstance(),
    }),
    new TrialdayService({
      firestoreService: FirestoreService.getInstance(),
      sendgridService: SendgridService.getInstance(),
      emailConfirmationService: new EmailConfirmationService({
        firestoreService: FirestoreService.getInstance(),
        sendgridService: SendgridService.getInstance(),
      }),
      officeRndService: new OfficeRndService({
        firestoreService: FirestoreService.getInstance(),
      }),
    })
  ),
  new OfficeRndController(
    new OfficeRndService({
      firestoreService: FirestoreService.getInstance(),
    }),
    FirestoreService.getInstance(),
    SendgridService.getInstance()
  ),
];
