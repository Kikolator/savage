import { InitializeScheduledEvents } from './initialize-scheduled-events';
import { SendgridScheduledEvents } from './on-schedule-events/sendgrid-scheduled-events';

const scheduledEventsList: Array<InitializeScheduledEvents> = [
  new SendgridScheduledEvents,
];

export function scheduledEvents() {
  const response : { [key: string]: unknown} = {};
  for (const v2Event of scheduledEventsList) {
    v2Event.initialize((params) => {
      response[params.name] = params. handler;
    });
  }
  return response;
}
