import {onSchedule} from 'firebase-functions/v2/scheduler';
import {logger} from 'firebase-functions';

import {
  AddScheduledEvent,
  InitializeScheduledEvents,
  ScheduledV2Function,
} from '../initialize-scheduled-events';
import {SendgridService} from '../../core/services/sendgrid-service';
import {FirestoreService} from '../../core/services/firestore-service';
import {firebaseSecrets} from '../../core/config/firebase-secrets';
import {isDevelopment} from '../../core/utils/environment';
import {mainConfig} from '../../core/config/main-config';
import {SetDoc} from '../../core/data/models';

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
        schedule: 'every 1 hours',
      },
      async () => {
        try {
          logger.info(
            'SendgridScheduledEvents.updateSendgrid()- Updating custom fields'
          );
          // init new services
          const sendgridService = SendgridService.getInstance();
          const firestoreService = FirestoreService.getInstance();
          // get the latest custom fields from SendGrid API
          const customFields = await sendgridService.getCustomFieldsFromAPI();
          // get the latest lists from SendGrid API
          const lists = await sendgridService.getListsFromAPI();
          // set the firestore sendgrid_data.meta document
          // with merge true, so only the provided fields will be updated
          const fieldData: Array<SetDoc> = customFields.map((field) => ({
            collection: 'sendgrid',
            documentId: `metadata/customFields/${field.id}`,
            data: field,
            merge: true,
          }));
          const listData: Array<SetDoc> = lists.map((list) => ({
            collection: 'sendgrid',
            documentId: `metadata/lists/${list.id}`,
            data: list,
            merge: true,
          }));
          const data: Array<SetDoc> = [...fieldData, ...listData];
          await firestoreService.setDocuments(data);
          return;
        } catch (error) {
          logger.error(
            'SendgridScheduledEvents.updateSendgrid()- Error updating custom fields',
            error
          );
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
            logger.debug(
              'SendgridScheduledEvents.updateSendgrid()- In development mode, the error will not be logged in Firestore'
            );
          }
        }
      }
    ),
  };
}
