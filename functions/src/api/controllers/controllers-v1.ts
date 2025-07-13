import {ServiceResolver} from '../../core/services/di';

import TestController from './test-controllers/test-controller';
import TypeformController from './typeform-controller/typeform-controller';
import {ConfirmEmailController} from './confirm-email-controller/confirm-email-controller';
import OfficeRndController from './office-rnd-controller/office-rnd-controller';

import {Controller} from '.';

export const getControllersV1 = (): Array<Controller> => [
  new TestController(),
  new TypeformController({
    trialdayService: ServiceResolver.getTrialdayService(),
  }),
  new ConfirmEmailController(
    ServiceResolver.getEmailConfirmationService(),
    ServiceResolver.getTrialdayService()
  ),
  new OfficeRndController(
    ServiceResolver.getOfficeRndService(),
    ServiceResolver.getFirestoreService(),
    ServiceResolver.getSendgridService()
  ),
];
