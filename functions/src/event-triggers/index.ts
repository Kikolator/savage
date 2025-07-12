import {ServiceResolver} from '../core/services/di';

import {TrialdayEvents} from './by-document/trialday-events';
import {OfficeRndMemberEvents} from './by-document/office-rnd-member-events';
import {InitializeEventTriggers} from './initialize-event-triggers';

// Lazy initialization of event triggers - will be called after container is initialized
let eventTriggersInitialized = false;
const eventTriggersResult: {[key: string]: unknown} = {};

const initializeEventTriggers = () => {
  if (!eventTriggersInitialized) {
    const eventTriggerList: Array<InitializeEventTriggers> = [
      new TrialdayEvents(
        ServiceResolver.getTrialdayService(),
        ServiceResolver.getReferralService(),
        ServiceResolver.getOfficeRndService()
      ),
      new OfficeRndMemberEvents(),
    ];

    for (const v2 of eventTriggerList) {
      v2.initialize((params) => {
        eventTriggersResult[params.name] = params.handler;
      });
    }
    eventTriggersInitialized = true;
  }
  return eventTriggersResult;
};

export {initializeEventTriggers};
