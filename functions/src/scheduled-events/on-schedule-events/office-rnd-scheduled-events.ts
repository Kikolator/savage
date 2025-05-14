import { onSchedule } from 'firebase-functions/scheduler';
import {
  AddScheduledEvent,
  InitializeScheduledEvents,
  ScheduledV2Function,
} from '../initialize-scheduled-events';
import { mainConfig } from '../../core/config/main-config';
import { officeRndConfig } from '../../core/config/office-rnd-config';
import { firebaseSecrets } from '../../core/config/firebase-secrets';
import OfficeRndService from '../../core/services/office-rnd-service';
import { FirestoreService } from '../../core/services/firestore-service';
import { logger } from 'firebase-functions';
import { isDevelopment } from '../../core/utils/environment';


export class OfficeRndScheduledEvents implements InitializeScheduledEvents {
  initialize(add: AddScheduledEvent): void {
    add(this.tokenGeneration);
  }

  private readonly tokenGeneration: ScheduledV2Function = {
    name: 'tokenGeneration',
    handler: onSchedule(
      {
        region: mainConfig.cloudFunctionsLocation,
        secrets: [firebaseSecrets.officeRndSecretKey],
        schedule: 'every 45 minutes',
      }, async () => {
        try {
          logger.info('OfficeRndScheduledEvents.tokenGeneration()- Getting and saving OAuth2.0 token');
          const officeRndService = new OfficeRndService({
            firestoreService: FirestoreService.getInstance(),
          });
          await officeRndService
            .getAndSaveToken(firebaseSecrets.officeRndSecretKey.value());
        } catch (error) {
          logger.error('OfficeRndScheduledEvents.tokenGeneration()- Error getting and saving token', error);
          // add error to firestore if not in debug mode
          if (!isDevelopment()) {
            if (error instanceof Error) {
              const firestoreService = FirestoreService.getInstance();
              await firestoreService.createDocument({
                collection: 'errors',
                data: {
                  name: 'OfficeRndScheduledEvents.tokenGeneration',
                  error: error.message,
                  timestamp: new Date(),
                },
              });
              return;
            }
          } else {
            logger.debug('OfficeRndScheduledEvents.tokenGeneration()- In development mode, the error will not be logged in Firestore');
          }
        }
      }
    ),
  };
}
