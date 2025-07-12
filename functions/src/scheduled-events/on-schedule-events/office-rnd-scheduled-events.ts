import {onSchedule} from 'firebase-functions/v2/scheduler';
import {logger} from 'firebase-functions/v2';

import {STATIC_CONFIG, SECRET_REFERENCES, getConfig} from '../../core/config';
import {FirestoreService} from '../../core/services';
import OfficeRndService from '../../core/services/office-rnd-service';
import {ServiceResolver} from '../../core/services/di';
import {isDevelopment} from '../../core/utils/environment';
import {OfficeRndOpportunity} from '../../core/data/models';
import {
  InitializeScheduledEvents,
  AddScheduledEvent,
  ScheduledV2Function,
} from '../initialize-scheduled-events';
import {TrialdayStatus} from '../../core/data/enums';
import {OfficeRndScheduledEventError} from '../../core/errors';

export class OfficeRndScheduledEvents implements InitializeScheduledEvents {
  initialize(add: AddScheduledEvent): void {
    add(this.tokenGeneration);
    add(this.dataBackup);
    add(this.trialdayFollowup);
  }

  private readonly tokenGeneration: ScheduledV2Function = {
    name: 'tokenGeneration',
    handler: onSchedule(
      {
        region: STATIC_CONFIG.region,
        secrets: [SECRET_REFERENCES.officeRndSecretKey],
        schedule: 'every 45 minutes',
        timeZone: STATIC_CONFIG.timezone,
      },
      async () => {
        try {
          logger.info(
            'OfficeRndScheduledEvents.tokenGeneration()- Getting and saving OAuth2.0 token'
          );
          const officeRndService = ServiceResolver.getOfficeRndService();
          await officeRndService._getAndSaveToken(
            (await getConfig()).runtime.officeRnd.secretKey
          );
        } catch (error) {
          logger.error(
            'OfficeRndScheduledEvents.tokenGeneration()- Error getting and saving token',
            error
          );

          // Create specific error for this scheduled event
          const scheduledError = new OfficeRndScheduledEventError(
            'Failed to get and save OAuth2.0 token',
            'tokenGeneration',
            {
              originalError:
                error instanceof Error ? error.message : 'Unknown error',
            }
          );

          // Log to Firestore if not in development mode
          if (!isDevelopment()) {
            try {
              const firestoreService = FirestoreService.getInstance();
              await firestoreService.createDocument({
                collection: 'errors',
                data: scheduledError.toFirestoreError(),
              });
            } catch (loggingError) {
              logger.error(
                'OfficeRndScheduledEvents.tokenGeneration()- Failed to log error to Firestore',
                {
                  originalError:
                    error instanceof Error ? error.message : 'Unknown error',
                  loggingError:
                    loggingError instanceof Error
                      ? loggingError.message
                      : 'Unknown error',
                }
              );
              // Don't let logging errors break the main error flow
            }
          } else {
            logger.debug(
              'OfficeRndScheduledEvents.tokenGeneration()- In development mode, the error will not be logged in Firestore'
            );
          }

          // Re-throw the specific error for proper error handling
          throw scheduledError;
        }
      }
    ),
  };

  private readonly dataBackup: ScheduledV2Function = {
    name: 'dataBackup',
    handler: onSchedule(
      {
        region: STATIC_CONFIG.region,
        secrets: [SECRET_REFERENCES.officeRndSecretKey],
        schedule: 'every 24 hours',
        timeZone: STATIC_CONFIG.timezone,
      },
      async () => {
        try {
          logger.info(
            'OfficeRndScheduledEvents.dataBackup()- Starting daily data backup and validation'
          );

          const officeRndService = ServiceResolver.getOfficeRndService();

          // Get data from both sources for comparison
          const [firestoreMembers, apiMembers] = await Promise.all([
            officeRndService.getAllMembers(),
            officeRndService.getAllMembersFromAPI(),
          ]);

          const [firestoreOpportunities, apiOpportunities] = await Promise.all([
            officeRndService.getOpportunities({}),
            officeRndService.getOpportunitiesFromAPI({}),
          ]);

          const [firestoreCompanies, apiCompanies] = await Promise.all([
            officeRndService.getAllCompanies(),
            officeRndService.getAllCompaniesFromAPI(),
          ]);

          // Compare data and identify missing records
          const missingMembers = this.findMissingRecords(
            firestoreMembers,
            apiMembers,
            '_id'
          );

          const missingOpportunities = this.findMissingRecords(
            firestoreOpportunities,
            apiOpportunities,
            '_id'
          );

          const missingCompanies = this.findMissingRecords(
            firestoreCompanies,
            apiCompanies,
            '_id'
          );

          // Log backup statistics
          logger.info(
            'OfficeRndScheduledEvents.dataBackup()- Backup statistics',
            {
              firestoreMembers: firestoreMembers.length,
              apiMembers: apiMembers.length,
              missingMembers: missingMembers.length,
              firestoreOpportunities: firestoreOpportunities.length,
              apiOpportunities: apiOpportunities.length,
              missingOpportunities: missingOpportunities.length,
              firestoreCompanies: firestoreCompanies.length,
              apiCompanies: apiCompanies.length,
              missingCompanies: missingCompanies.length,
            }
          );

          // If there are missing records, trigger a full sync
          if (
            missingMembers.length > 0 ||
            missingOpportunities.length > 0 ||
            missingCompanies.length > 0
          ) {
            logger.warn(
              'OfficeRndScheduledEvents.dataBackup()- Missing records detected, triggering full sync',
              {
                missingMembers: missingMembers.length,
                missingOpportunities: missingOpportunities.length,
                missingCompanies: missingCompanies.length,
              }
            );

            // Trigger full sync using the existing initialization method
            await this.performFullSync(officeRndService);
          } else {
            logger.info(
              'OfficeRndScheduledEvents.dataBackup()- All data is in sync'
            );
          }

          // Update backup metadata
          await this.updateBackupMetadata({
            lastBackup: new Date(),
            firestoreMembers: firestoreMembers.length,
            apiMembers: apiMembers.length,
            missingRecords:
              missingMembers.length +
              missingOpportunities.length +
              missingCompanies.length,
            status: 'completed',
          });
        } catch (error) {
          logger.error(
            'OfficeRndScheduledEvents.dataBackup()- Error during backup',
            error
          );

          // Create specific error for this scheduled event
          const scheduledError = new OfficeRndScheduledEventError(
            'Failed to perform data backup and validation',
            'dataBackup',
            {
              originalError:
                error instanceof Error ? error.message : 'Unknown error',
            }
          );

          // Log error to Firestore if not in development
          if (!isDevelopment()) {
            try {
              const firestoreService = FirestoreService.getInstance();
              await firestoreService.createDocument({
                collection: 'errors',
                data: scheduledError.toFirestoreError(),
              });
            } catch (loggingError) {
              logger.error(
                'OfficeRndScheduledEvents.dataBackup()- Failed to log error to Firestore',
                {
                  originalError:
                    error instanceof Error ? error.message : 'Unknown error',
                  loggingError:
                    loggingError instanceof Error
                      ? loggingError.message
                      : 'Unknown error',
                }
              );
              // Don't let logging errors break the main error flow
            }
          }

          // Update backup metadata with error
          try {
            await this.updateBackupMetadata({
              lastBackup: new Date(),
              status: 'failed',
              error: error instanceof Error ? error.message : 'unknown error',
            });
          } catch (metadataError) {
            logger.error(
              'OfficeRndScheduledEvents.dataBackup()- Failed to update backup metadata',
              {
                originalError:
                  error instanceof Error ? error.message : 'Unknown error',
                metadataError:
                  metadataError instanceof Error
                    ? metadataError.message
                    : 'Unknown error',
              }
            );
            // Don't let metadata errors break the main error flow
          }

          // Re-throw the specific error for proper error handling
          throw scheduledError;
        }
      }
    ),
  };

  private readonly trialdayFollowup: ScheduledV2Function = {
    name: 'trialdayFollowup',
    handler: onSchedule(
      {
        region: STATIC_CONFIG.region,
        secrets: [SECRET_REFERENCES.sendgridApiKey],
        schedule: 'every 6 hours',
        timeZone: STATIC_CONFIG.timezone,
      },
      async () => {
        try {
          logger.info(
            'OfficeRndScheduledEvents.trialdayFollowup()- Starting trial complete opportunity check'
          );

          const officeRndService = ServiceResolver.getOfficeRndService();

          // Get all opportunity statuses to find the trialComplete status
          const opportunityStatuses =
            await officeRndService.getOpportunityStatuses();
          const trialCompleteStatus = opportunityStatuses.find(
            (status) => status.description === 'trialComplete'
          );

          if (!trialCompleteStatus) {
            logger.warn(
              'OfficeRndScheduledEvents.trialdayFollowup()- trialComplete status not found in opportunity statuses'
            );
            return;
          }

          // Get all opportunities with trialComplete status
          const allOpportunities = await officeRndService.getOpportunities({});
          const trialCompleteOpportunities = allOpportunities.filter(
            (opportunity) => opportunity.status === trialCompleteStatus._id
          );

          logger.info(
            'OfficeRndScheduledEvents.trialdayFollowup()- Found trial complete opportunities',
            {
              totalOpportunities: allOpportunities.length,
              trialCompleteOpportunities: trialCompleteOpportunities.length,
            }
          );

          // Process each trial complete opportunity with metrics tracking
          let processedCount = 0;
          let errorCount = 0;

          for (const opportunity of trialCompleteOpportunities) {
            try {
              await this.processTrialComplete(opportunity);
              processedCount++;
            } catch (error) {
              errorCount++;
              logger.error(
                'OfficeRndScheduledEvents.trialdayFollowup()- Error processing individual opportunity',
                {
                  opportunityId: opportunity._id,
                  opportunityName: opportunity.name,
                  error: error instanceof Error ? error.message : 'unknown',
                }
              );
              // Continue processing other opportunities even if one fails
            }
          }

          logger.info(
            'OfficeRndScheduledEvents.trialdayFollowup()- Completed processing trial complete opportunities',
            {
              totalOpportunities: allOpportunities.length,
              trialCompleteOpportunities: trialCompleteOpportunities.length,
              processedCount,
              errorCount,
            }
          );
        } catch (error) {
          logger.error(
            'OfficeRndScheduledEvents.trialdayFollowup()- Error during processing',
            error
          );

          // Create specific error for this scheduled event
          const scheduledError = new OfficeRndScheduledEventError(
            'Failed to process trial complete opportunities',
            'trialdayFollowup',
            {
              originalError:
                error instanceof Error ? error.message : 'Unknown error',
            }
          );

          // Log error to Firestore if not in development
          if (!isDevelopment()) {
            try {
              const firestoreService = FirestoreService.getInstance();
              await firestoreService.createDocument({
                collection: 'errors',
                data: scheduledError.toFirestoreError(),
              });
            } catch (loggingError) {
              logger.error(
                'OfficeRndScheduledEvents.trialdayFollowup()- Failed to log error to Firestore',
                {
                  originalError:
                    error instanceof Error ? error.message : 'Unknown error',
                  loggingError:
                    loggingError instanceof Error
                      ? loggingError.message
                      : 'Unknown error',
                }
              );
              // Don't let logging errors break the main error flow
            }
          }

          // Re-throw the specific error for proper error handling
          throw scheduledError;
        }
      }
    ),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private findMissingRecords<T extends Record<string, any>>(
    firestoreRecords: T[],
    apiRecords: T[],
    idField: string
  ): T[] {
    const firestoreIds = new Set(
      firestoreRecords.map((record) => record[idField])
    );
    return apiRecords.filter((record) => !firestoreIds.has(record[idField]));
  }

  private async performFullSync(
    officeRndService: OfficeRndService
  ): Promise<void> {
    logger.info(
      'OfficeRndScheduledEvents.performFullSync()- Starting full sync'
    );

    try {
      // Get services from DI container
      const firestoreService = ServiceResolver.getFirestoreService();

      // Initialize members sync
      logger.info(
        'OfficeRndScheduledEvents.performFullSync()- Syncing members'
      );
      const members = await officeRndService.getAllMembersFromAPI();
      for (const member of members) {
        await firestoreService.setDocument({
          collection: OfficeRndService.membersCollection,
          documentId: member._id,
          data: member,
        });
      }

      // Initialize opportunities sync
      logger.info(
        'OfficeRndScheduledEvents.performFullSync()- Syncing opportunities'
      );
      const opportunities = await officeRndService.getOpportunitiesFromAPI({});
      for (const opportunity of opportunities) {
        await firestoreService.setDocument({
          collection: OfficeRndService.opportunitiesCollection,
          documentId: opportunity._id,
          data: opportunity,
        });
      }

      // Initialize companies sync
      logger.info(
        'OfficeRndScheduledEvents.performFullSync()- Syncing companies'
      );
      const companies = await officeRndService.getAllCompaniesFromAPI();
      for (const company of companies) {
        await firestoreService.setDocument({
          collection: OfficeRndService.companiesCollection,
          documentId: company._id,
          data: company,
        });
      }

      // Initialize opportunity statuses sync
      logger.info(
        'OfficeRndScheduledEvents.performFullSync()- Syncing opportunity statuses'
      );
      const opportunityStatuses =
        await officeRndService.getOpportunityStatusesFromAPI();
      for (const status of opportunityStatuses) {
        await firestoreService.setDocument({
          collection: OfficeRndService.opportunityStatusesCollection,
          documentId: status._id,
          data: status,
        });
      }

      logger.info(
        'OfficeRndScheduledEvents.performFullSync()- Full sync completed successfully'
      );
    } catch (error) {
      logger.error(
        'OfficeRndScheduledEvents.performFullSync()- Error during full sync',
        error
      );
      throw error;
    }
  }

  private async processTrialComplete(
    opportunity: OfficeRndOpportunity
  ): Promise<void> {
    logger.info(
      'OfficeRndScheduledEvents.processTrialComplete()- Processing trial complete',
      {
        opportunityId: opportunity._id,
        opportunityName: opportunity.name,
        memberId: opportunity.member,
      }
    );

    // Get services from DI container
    const trialdayService = ServiceResolver.getTrialdayService();

    // Validate opportunity has required fields
    if (!opportunity._id) {
      logger.warn(
        'OfficeRndScheduledEvents.processTrialComplete()- Skipping opportunity with undefined id',
        {
          opportunityName: opportunity.name,
          memberId: opportunity.member,
        }
      );
      return;
    }

    // Query trialdays for opportunity id
    const trialday = await trialdayService.getTrialdayByOpportunityId(
      opportunity._id
    );

    if (!trialday) {
      // Log the missing trialday for monitoring but don't throw error
      logger.warn(
        'OfficeRndScheduledEvents.processTrialComplete()- No trialday found for opportunity, skipping',
        {
          opportunityId: opportunity._id,
          opportunityName: opportunity.name,
          memberId: opportunity.member,
        }
      );

      // Log to Firestore for investigation (only in production)
      await this.logMissingTrialday(opportunity);

      return; // Skip this opportunity and continue with others
    }

    // Update trialday status to trialComplete
    await trialdayService.updateTrialdayStatus(
      trialday.id,
      TrialdayStatus.COMPLETED
    );

    logger.info(
      'OfficeRndScheduledEvents.processTrialComplete()- Successfully updated trialday status',
      {
        opportunityId: opportunity._id,
        trialdayId: trialday.id,
        newStatus: TrialdayStatus.COMPLETED,
      }
    );
  }

  /**
   * Logs missing trialday documents to Firestore for investigation
   * Only logs in production environment to avoid cluttering development logs
   */
  private async logMissingTrialday(
    opportunity: OfficeRndOpportunity
  ): Promise<void> {
    if (!isDevelopment()) {
      try {
        const firestoreService = FirestoreService.getInstance();
        await firestoreService.createDocument({
          collection: 'missing-trialdays',
          data: {
            opportunityId: opportunity._id,
            opportunityName: opportunity.name,
            memberId: opportunity.member,
            status: opportunity.status,
            createdAt: new Date(),
            processedAt: new Date(),
            reason: 'No trialday document found in Firestore',
            source: 'trialdayFollowup-scheduled-function',
          },
        });
      } catch (error) {
        // Don't let logging errors break the main function
        logger.error(
          'OfficeRndScheduledEvents.logMissingTrialday()- Failed to log missing trialday',
          {
            opportunityId: opportunity._id,
            error: error instanceof Error ? error.message : 'unknown',
          }
        );
        // Note: We don't throw here because this is a logging operation
        // and we don't want it to break the main processing flow
      }
    }
  }

  private async updateBackupMetadata(metadata: {
    lastBackup: Date;
    firestoreMembers?: number;
    apiMembers?: number;
    missingRecords?: number;
    status: 'completed' | 'failed';
    error?: string;
  }): Promise<void> {
    try {
      const firestoreService = FirestoreService.getInstance();
      await firestoreService.setDocument({
        collection: OfficeRndService.metadataCollection,
        documentId: 'backup-metadata',
        merge: true,
        data: {
          ...metadata,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error(
        'OfficeRndScheduledEvents.updateBackupMetadata()- Failed to update backup metadata',
        {
          metadata,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      );
      // Note: We don't throw here because this is a metadata update operation
      // and we don't want it to break the main processing flow
    }
  }
}
