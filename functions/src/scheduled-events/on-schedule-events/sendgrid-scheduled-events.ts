import { onSchedule } from 'firebase-functions/v2/scheduler';
import {
  AddScheduledEvent,
  InitializeScheduledEvents,
  ScheduledV2Function,
} from '../initialize-scheduled-events';
import { logger } from 'firebase-functions';
import { SendgridService } from '../../core/services/sendgrid-service';
import { FirestoreService } from '../../core/services/firestore-service';
import { firebaseSecrets } from '../../core/config/firebase-secrets';
import { isDevelopment } from '../../core/utils/environment';
import { mainConfig } from '../../core/config/main-config';

export class SendgridScheduledEvents implements InitializeScheduledEvents {
  initialize(add: AddScheduledEvent): void {
    add(this.updateSendgrid);
  }


  // Calls the Sendgrid API getting the latest custom fields,
  // and updates the Firestore collection
  private readonly updateSendgrid: ScheduledV2Function = {
    name: 'updateSendgrid',
    handler: onSchedule(
      {
        region: mainConfig.cloudFunctionsLocation,
        secrets: [firebaseSecrets.sendgridApiKey],
        schedule: 'every 24 hours',
      }, async () => {
        try {
          logger.info('SendgridScheduledEvents.updateSendgrid()- Updating custom fields');
          // init new services
          const sendgridService = SendgridService.getInstance(
            firebaseSecrets.sendgridApiKey.value()
          );
          const firestoreService = FirestoreService.getInstance();
          // get the latest custom fields
          const customFields = await sendgridService.getCustomFields();
          // get the latest lists
          const lists = await sendgridService.getLists();
          // set the firestore sendgrid_data.meta document
          // with merge true, so only the provided fields will be updated
          if (!isDevelopment()) {
            await firestoreService.setDocument({
              collection: 'sendgrid_data',
              documentId: 'meta',
              data: {
                customFields: customFields,
                lists: lists,
              },
              merge: true,
            });
          } else {
            logger.debug('SendgridScheduledEvents.updateSendgrid()- In development mode, the custom fields and lists will not be updated in Firestore');
          }
          return;
        } catch (error) {
          logger.error('SendgridScheduledEvents.updateSendgrid()- Error updating custom fields', error);
          // add error to firestore if not in debug mode
          if (!isDevelopment()) {
            if (error instanceof Error) {
              const firestoreService = FirestoreService.getInstance();
              await firestoreService.createDocument({
                collection: 'errors',
                data: {
                  name: 'SendgridScheduledEvents.updateSendgrid',
                  error: error.message,
                  timestamp: new Date(),
                },
              });
              return;
            }
          } else {
            logger.debug('SendgridScheduledEvents.updateSendgrid()- In development mode, the error will not be logged in Firestore');
          }
        }
      }),
  };
}
