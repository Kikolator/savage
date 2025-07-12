import {onSchedule} from 'firebase-functions/v2/scheduler';
import {logger} from 'firebase-functions/v2';

import {
  AddScheduledEvent,
  InitializeScheduledEvents,
  ScheduledV2Function,
} from '../initialize-scheduled-events';
import {SendgridService, FirestoreService} from '../../core/services';
import {STATIC_CONFIG, SECRET_REFERENCES} from '../../core/config';
import {isDevelopment} from '../../core/utils/environment';
import {
  SendgridCustomField,
  SendgridList,
  SetDoc,
} from '../../core/data/models';
import {container} from '../../core/services/di';
import {SendgridScheduledEventError} from '../../core/errors';

// Validation result types
interface ValidationResult {
  isValid: boolean;
  invalidCount: number;
  totalCount: number;
  errors: string[];
}

// Type guards using existing interfaces from data models
// These are needed for runtime validation of API responses that might be malformed
function isCustomField(obj: unknown): obj is SendgridCustomField {
  if (obj === null || typeof obj !== 'object') {
    return false;
  }

  const field = obj as Record<string, unknown>;
  return (
    'id' in field &&
    'name' in field &&
    'type' in field &&
    typeof field.id === 'string' &&
    typeof field.name === 'string' &&
    typeof field.type === 'string'
  );
}

function isList(obj: unknown): obj is SendgridList {
  if (obj === null || typeof obj !== 'object') {
    return false;
  }

  const list = obj as Record<string, unknown>;
  return (
    'id' in list &&
    'name' in list &&
    'contactCount' in list &&
    typeof list.id === 'string' &&
    typeof list.name === 'string' &&
    typeof list.contactCount === 'number'
  );
}

// Generic validation function
function validateArrayItems<T>(
  items: T[],
  validator: (item: unknown) => boolean,
  itemType: string
): ValidationResult {
  const validItems = items.filter(
    (item) => item !== null && item !== undefined
  );

  const invalidItems = validItems.filter((item: unknown) => !validator(item));

  const errors: string[] = [];
  if (validItems.length !== items.length) {
    errors.push(
      `Found ${items.length - validItems.length} null/undefined items`
    );
  }

  if (invalidItems.length > 0) {
    errors.push(`Found ${invalidItems.length} invalid ${itemType} items`);
  }

  return {
    isValid: invalidItems.length === 0,
    invalidCount: invalidItems.length,
    totalCount: validItems.length,
    errors,
  };
}

export class SendgridScheduledEvents implements InitializeScheduledEvents {
  initialize(add: AddScheduledEvent): void {
    add(this.updateSendgrid);
  }

  // Calls the Sendgrid API getting the latest custom fields and lists,
  // and updates the Firestore collection with metadata
  private readonly updateSendgrid: ScheduledV2Function = {
    name: 'updateSendgrid',
    handler: onSchedule(
      {
        region: STATIC_CONFIG.region,
        secrets: [SECRET_REFERENCES.sendgridApiKey],
        schedule: 'every 1 hours',
      },
      async () => {
        // Declare variables outside try block for error handling
        let customFields: SendgridCustomField[] = [];
        let lists: SendgridList[] = [];
        const startTime: number = Date.now();
        const firestoreService: FirestoreService =
          FirestoreService.getInstance();

        try {
          logger.info(
            'SendgridScheduledEvents.updateSendgrid()- Starting SendGrid metadata sync'
          );

          // Initialize services
          const sendgridService = container.resolve(
            'sendgrid'
          ) as SendgridService;

          // Step 1: Fetch custom fields from SendGrid API
          const customFieldsStartTime = Date.now();
          logger.info(
            'SendgridScheduledEvents.updateSendgrid()- Fetching custom fields from SendGrid API'
          );
          customFields = (await sendgridService.getCustomFieldsFromAPI()) || [];

          // Validate custom fields response
          this.validateApiResponse(customFields, 'custom fields');

          if (!customFields || customFields.length === 0) {
            logger.warn(
              'SendgridScheduledEvents.updateSendgrid()- No custom fields returned from SendGrid API'
            );
          } else {
            logger.info(
              'SendgridScheduledEvents.updateSendgrid()- Successfully fetched custom fields',
              {count: customFields.length}
            );
          }

          this.logPerformanceMetrics(
            'customFieldsFetch',
            customFieldsStartTime,
            customFields.length
          );

          // Step 2: Fetch lists from SendGrid API
          const listsStartTime = Date.now();
          logger.info(
            'SendgridScheduledEvents.updateSendgrid()- Fetching lists from SendGrid API'
          );
          lists = (await sendgridService.getListsFromAPI()) || [];

          // Validate lists response
          this.validateApiResponse(lists, 'lists');

          if (!lists || lists.length === 0) {
            logger.warn(
              'SendgridScheduledEvents.updateSendgrid()- No lists returned from SendGrid API'
            );
          } else {
            logger.info(
              'SendgridScheduledEvents.updateSendgrid()- Successfully fetched lists',
              {count: lists.length}
            );
          }

          this.logPerformanceMetrics(
            'listsFetch',
            listsStartTime,
            lists.length
          );

          // Step 3: Prepare batch data with type safety
          const fieldData: Array<SetDoc> = customFields
            .filter(isCustomField)
            .map((field) => ({
              collection: 'sendgrid',
              documentId: `metadata/customFields/${field.id}`,
              data: {
                ...field,
                last_synced: new Date(),
              },
              merge: true,
            }));

          const listData: Array<SetDoc> = lists.filter(isList).map((list) => ({
            collection: 'sendgrid',
            documentId: `metadata/lists/${list.id}`,
            data: {
              ...list,
              last_synced: new Date(),
            },
            merge: true,
          }));

          const data: Array<SetDoc> = [...fieldData, ...listData];

          // Step 4: Execute batch operations with chunking for large datasets
          const MAX_BATCH_SIZE = 500; // Firestore batch limit is 500
          const totalDocuments = data.length;

          logger.info(
            'SendgridScheduledEvents.updateSendgrid()- Updating Firestore metadata',
            {
              customFieldsCount: customFields.length,
              listsCount: lists.length,
              totalDocuments,
              willChunk: totalDocuments > MAX_BATCH_SIZE,
            }
          );

          if (totalDocuments > MAX_BATCH_SIZE) {
            logger.warn(
              'SendgridScheduledEvents.updateSendgrid()- Large batch detected, processing in chunks',
              {totalItems: totalDocuments, maxBatchSize: MAX_BATCH_SIZE}
            );

            // Process in chunks
            for (let i = 0; i < totalDocuments; i += MAX_BATCH_SIZE) {
              const chunk = data.slice(i, i + MAX_BATCH_SIZE);
              logger.info(
                'SendgridScheduledEvents.updateSendgrid()- Processing batch chunk',
                {
                  chunkIndex: Math.floor(i / MAX_BATCH_SIZE) + 1,
                  chunkSize: chunk.length,
                }
              );

              await firestoreService.runBatch(async (batch) => {
                for (const docData of chunk) {
                  if (docData.documentId) {
                    firestoreService.addSetToBatch(
                      batch,
                      docData.collection,
                      docData.documentId,
                      docData.data,
                      docData.merge
                    );
                  }
                }
              });
            }
          } else {
            // Single batch operation
            await firestoreService.runBatch(async (batch) => {
              for (const docData of data) {
                if (docData.documentId) {
                  firestoreService.addSetToBatch(
                    batch,
                    docData.collection,
                    docData.documentId,
                    docData.data,
                    docData.merge
                  );
                }
              }
            });
          }

          // Step 6: Log success with metrics
          const duration = Date.now() - startTime;
          logger.info(
            'SendgridScheduledEvents.updateSendgrid()- Successfully completed metadata sync',
            {
              duration: `${duration}ms`,
              customFieldsCount: customFields.length,
              listsCount: lists.length,
              totalDocuments: data.length,
            }
          );

          // Step 7: Update sync metadata
          await this.updateSyncMetadata({
            lastSync: new Date(),
            customFieldsCount: customFields.length,
            listsCount: lists.length,
            duration,
            status: 'completed',
          });

          return;
        } catch (error) {
          const duration = startTime ? Date.now() - startTime : 0;

          // Determine error context based on what was completed
          let errorContext = 'Unknown error occurred';
          let errorStage = 'unknown';

          if (customFields.length > 0 && lists.length > 0) {
            errorContext = 'Error occurred during Firestore batch operation';
            errorStage = 'firestore_batch';
          } else if (customFields.length > 0 && lists.length === 0) {
            errorContext =
              'Error occurred while fetching lists from SendGrid API';
            errorStage = 'lists_api';
          } else if (customFields.length === 0 && lists.length > 0) {
            errorContext =
              'Error occurred while fetching custom fields from SendGrid API';
            errorStage = 'custom_fields_api';
          } else if (customFields.length === 0 && lists.length === 0) {
            // Both failed - check if we got past the first API call
            if (error instanceof Error && error.message.includes('lists')) {
              errorContext =
                'Error occurred while fetching lists from SendGrid API';
              errorStage = 'lists_api';
            } else {
              errorContext =
                'Error occurred while fetching custom fields from SendGrid API';
              errorStage = 'custom_fields_api';
            }
          }

          logger.error(
            'SendgridScheduledEvents.updateSendgrid()- Error during metadata sync',
            {
              error: error instanceof Error ? error.message : 'Unknown error',
              stage: errorStage,
              duration: `${duration}ms`,
              customFieldsCount: customFields?.length || 0,
              listsCount: lists?.length || 0,
            }
          );

          // Create specific error for this scheduled event
          const scheduledError = new SendgridScheduledEventError(
            errorContext,
            'updateSendgrid',
            {
              originalError:
                error instanceof Error ? error.message : 'Unknown error',
              errorStage,
              duration,
              customFieldsCount: customFields?.length || 0,
              listsCount: lists?.length || 0,
              stack: error instanceof Error ? error.stack : undefined,
            }
          );

          // Log to Firestore if not in development mode
          if (!isDevelopment()) {
            try {
              // Ensure firestoreService is available
              const errorFirestoreService = FirestoreService.getInstance();
              await errorFirestoreService.createDocument({
                collection: 'errors',
                data: scheduledError.toFirestoreError(),
              });
            } catch (firestoreError) {
              logger.error(
                'SendgridScheduledEvents.updateSendgrid()- Failed to log error to Firestore',
                {
                  firestoreError:
                    firestoreError instanceof Error
                      ? firestoreError.message
                      : 'Unknown error',
                }
              );
            }
          } else {
            logger.debug(
              'SendgridScheduledEvents.updateSendgrid()- In development mode, the error will not be logged in Firestore'
            );
          }

          // Update sync metadata with error information
          try {
            await this.updateSyncMetadata({
              lastSync: new Date(),
              customFieldsCount: customFields?.length || 0,
              listsCount: lists?.length || 0,
              duration,
              status: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          } catch (metadataError) {
            logger.error(
              'SendgridScheduledEvents.updateSendgrid()- Failed to update sync metadata after error',
              {
                metadataError:
                  metadataError instanceof Error
                    ? metadataError.message
                    : 'Unknown error',
              }
            );
          }

          // Re-throw the specific error for proper error handling
          throw scheduledError;
        }
      }
    ),
  };

  /**
   * Updates sync metadata for monitoring and debugging
   */
  private async updateSyncMetadata(metadata: {
    lastSync: Date;
    customFieldsCount: number;
    listsCount: number;
    duration: number;
    status: 'completed' | 'failed';
    error?: string;
  }): Promise<void> {
    try {
      const firestoreService = FirestoreService.getInstance();
      await firestoreService.setDocument({
        collection: 'sendgrid',
        documentId: 'metadata/sync-status',
        data: {
          ...metadata,
          updated_at: new Date(),
        },
        merge: true,
      });
    } catch (error) {
      // Don't let metadata update failures break the main function
      logger.warn(
        'SendgridScheduledEvents.updateSyncMetadata()- Failed to update sync metadata',
        {error: error instanceof Error ? error.message : 'Unknown error'}
      );
    }
  }

  /**
   * Validates API responses before processing
   */
  private validateApiResponse<T>(data: T[], dataType: string): void {
    if (!Array.isArray(data)) {
      throw new Error(
        `Invalid ${dataType} response: expected array, got ${typeof data}`
      );
    }

    let validationResult: ValidationResult;

    // Type-safe validation based on data type
    switch (dataType) {
      case 'custom fields': {
        validationResult = validateArrayItems(
          data,
          isCustomField,
          'custom fields'
        );
        break;
      }
      case 'lists': {
        validationResult = validateArrayItems(data, isList, 'lists');
        break;
      }
      default:
        logger.warn(
          'SendgridScheduledEvents.validateApiResponse()- Unknown data type for validation',
          {dataType}
        );
        return;
    }

    // Log validation results
    if (!validationResult.isValid) {
      logger.warn(
        'SendgridScheduledEvents.validateApiResponse()- Validation issues found',
        {
          dataType,
          invalidCount: validationResult.invalidCount,
          totalCount: validationResult.totalCount,
          errors: validationResult.errors,
        }
      );
    } else if (validationResult.totalCount !== data.length) {
      logger.warn(
        'SendgridScheduledEvents.validateApiResponse()- Found null/undefined items in response',
        {
          dataType,
          originalCount: data.length,
          validCount: validationResult.totalCount,
        }
      );
    }
  }

  /**
   * Logs performance metrics for monitoring
   */
  private logPerformanceMetrics(
    stage: string,
    startTime: number,
    dataCount?: number
  ): void {
    const duration = Date.now() - startTime;
    logger.info(`SendgridScheduledEvents.${stage}- Performance metrics`, {
      stage,
      duration: `${duration}ms`,
      dataCount,
      timestamp: new Date().toISOString(),
    });
  }
}
