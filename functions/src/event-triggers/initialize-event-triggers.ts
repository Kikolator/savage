import {CloudFunction} from 'firebase-functions/v2';

export type EventTriggerV2Function = {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: CloudFunction<never>;
};

export type AddEventTrigger = (params: EventTriggerV2Function) => void;

export interface InitializeEventTriggers {
  initialize(add: AddEventTrigger): void;
}
