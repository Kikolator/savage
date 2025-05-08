import { Controller } from '.';
import TestController from './test-controllers/test-controller';
import TypeformController from './typeform-controller/typeform-controller';

export const getControllersV1 = () :Array<Controller> => [
  new TestController(),
  new TypeformController(),
];
