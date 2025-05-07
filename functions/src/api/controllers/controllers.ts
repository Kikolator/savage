import { Controller } from '.';
import { TestController } from './test-controllers/test-controller';

export const getControllersV1 = () :Array<Controller> => [
  new TestController(),
];
