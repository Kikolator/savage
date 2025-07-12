import {onSchedule} from 'firebase-functions/v2/scheduler';
import {logger} from 'firebase-functions/v2';

import {STATIC_CONFIG} from '../../core/config';
import {
  AddScheduledEvent,
  InitializeScheduledEvents,
  ScheduledV2Function,
} from '../initialize-scheduled-events';
import {isDevelopment} from '../../core/utils/environment';
import {FirestoreService} from '../../core/services';
import {ServiceResolver} from '../../core/services/di';
import {RewardScheduledEventError} from '../../core/errors';

export class RewardScheduledEvents implements InitializeScheduledEvents {
  initialize(add: AddScheduledEvent): void {
    add(this.processDueRewards);
  }

  private readonly processDueRewards: ScheduledV2Function = {
    name: 'processDueRewards',
    handler: onSchedule(
      {
        region: STATIC_CONFIG.region,
        schedule: 'every day',
        timeZone: STATIC_CONFIG.timezone,
      },
      async () => {
        try {
          // Get services from DI container
          const rewardsService = ServiceResolver.getRewardService();

          await rewardsService.processDueRewards();
          return;
        } catch (error) {
          logger.error(
            'RewardScheduledEvents.processDueRewards()- Error processing due rewards',
            error
          );

          // Create specific error for this scheduled event
          const scheduledError = new RewardScheduledEventError(
            'Failed to process due rewards',
            'processDueRewards',
            {
              originalError:
                error instanceof Error ? error.message : 'Unknown error',
            }
          );

          // Log to Firestore if not in development mode
          if (!isDevelopment()) {
            const firestoreService = FirestoreService.getInstance();
            await firestoreService.createDocument({
              collection: 'errors',
              data: scheduledError.toFirestoreError(),
            });
          } else {
            logger.debug(
              'RewardScheduledEvents.processDueRewards()- In development mode, ' +
                'the error will not be logged in Firestore'
            );
          }

          // Re-throw the specific error for proper error handling
          throw scheduledError;
        }
      }
    ),
  };
}
