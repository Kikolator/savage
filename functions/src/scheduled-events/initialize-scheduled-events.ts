import { ScheduleFunction } from "firebase-functions/v2/scheduler";


export type ScheduledV2Function = {
    name: string;
    handler: ScheduleFunction;
}

export type AddScheduledEvent = (params: ScheduledV2Function) => void;

export interface InitializeScheduledEvents {
    initialize(add: AddScheduledEvent): void;
}