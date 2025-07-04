import {onSchedule} from 'firebase-functions/scheduler';
import {logger} from 'firebase-functions';

import {
  AddScheduledEvent,
  InitializeScheduledEvents,
  ScheduledV2Function,
} from '../initialize-scheduled-events';
import {mainConfig} from '../../core/config/main-config';
import {firebaseSecrets} from '../../core/config/firebase-secrets';
import {FirestoreService} from '../../core/services/firestore-service';
import {isDevelopment} from '../../core/utils/environment';
import {OfficeRndOpportunity} from '../../core/data/models';
import {TrialdayStatus} from '../../core/data/enums';
import {TrialdayService} from '../../core/services/trialday-service';
import {SendgridService} from '../../core/services/sendgrid-service';
import {EmailConfirmationService} from '../../core/services/email-confirmation-service';
import OfficeRndService from '../../core/services/office-rnd-service';

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
        region: mainConfig.cloudFunctionsLocation,
        secrets: [firebaseSecrets.officeRndSecretKey],
        schedule: 'every 45 minutes',
      },
      async () => {
        try {
          logger.info(
            'OfficeRndScheduledEvents.tokenGeneration()- Getting and saving OAuth2.0 token'
          );
          const officeRndService = new OfficeRndService({
            firestoreService: FirestoreService.getInstance(),
          });
          await officeRndService._getAndSaveToken(
            firebaseSecrets.officeRndSecretKey.value()
          );
        } catch (error) {
          logger.error(
            'OfficeRndScheduledEvents.tokenGeneration()- Error getting and saving token',
            error
          );
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
            logger.debug(
              'OfficeRndScheduledEvents.tokenGeneration()- In development mode, the error will not be logged in Firestore'
            );
          }
        }
      }
    ),
  };

  private readonly dataBackup: ScheduledV2Function = {
    name: 'dataBackup',
    handler: onSchedule(
      {
        region: mainConfig.cloudFunctionsLocation,
        secrets: [firebaseSecrets.officeRndSecretKey],
        schedule: 'every 24 hours',
        timeZone: 'UTC',
      },
      async () => {
        try {
          logger.info(
            'OfficeRndScheduledEvents.dataBackup()- Starting daily data backup and validation'
          );

          const officeRndService = new OfficeRndService({
            firestoreService: FirestoreService.getInstance(),
          });

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

          // Log error to Firestore if not in development
          if (!isDevelopment()) {
            if (error instanceof Error) {
              const firestoreService = FirestoreService.getInstance();
              await firestoreService.createDocument({
                collection: 'errors',
                data: {
                  name: 'OfficeRndScheduledEvents.dataBackup',
                  error: error.message,
                  timestamp: new Date(),
                },
              });
            }
          }

          // Update backup metadata with error
          await this.updateBackupMetadata({
            lastBackup: new Date(),
            status: 'failed',
            error: error instanceof Error ? error.message : 'unknown error',
          });
        }
      }
    ),
  };

  private readonly trialdayFollowup: ScheduledV2Function = {
    name: 'trialdayFollowup',
    handler: onSchedule(
      {
        region: mainConfig.cloudFunctionsLocation,
        secrets: [firebaseSecrets.sendgridApiKey],
        schedule: 'every 6 hours',
        timeZone: 'UTC',
      },
      async () => {
        try {
          logger.info(
            'OfficeRndScheduledEvents.trialdayFollowup()- Starting trial complete opportunity check'
          );

          const firestoreService = FirestoreService.getInstance();
          const officeRndService = new OfficeRndService({
            firestoreService,
          });

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

          // Log error to Firestore if not in development
          if (!isDevelopment()) {
            if (error instanceof Error) {
              const firestoreService = FirestoreService.getInstance();
              await firestoreService.createDocument({
                collection: 'errors',
                data: {
                  name: 'OfficeRndScheduledEvents.trialdayFollowup',
                  error: error.message,
                  timestamp: new Date(),
                },
              });
            }
          }
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

    // Use the existing initialization method to perform full sync
    // This will be implemented in the OfficeRndController
    const firestoreService = FirestoreService.getInstance();

    // For now, we'll call the API methods directly and update Firestore
    // In the future, this could be moved to a dedicated sync service

    const [members, companies, opportunities] = await Promise.all([
      officeRndService.getAllMembersFromAPI(),
      officeRndService.getAllCompaniesFromAPI(),
      officeRndService.getOpportunitiesFromAPI({}),
    ]);

    // Update Firestore with latest data
    await firestoreService.runBatch(async (batch) => {
      // Update members
      for (const member of members) {
        if (member._id) {
          batch.set(
            firestoreService
              .getFirestoreInstance()
              .collection(OfficeRndService.membersCollection)
              .doc(member._id),
            member
          );
        }
      }

      // Update companies
      for (const company of companies) {
        if (company._id) {
          batch.set(
            firestoreService
              .getFirestoreInstance()
              .collection(OfficeRndService.companiesCollection)
              .doc(company._id),
            company
          );
        }
      }

      // Update opportunities
      for (const opportunity of opportunities) {
        if (opportunity._id) {
          batch.set(
            firestoreService
              .getFirestoreInstance()
              .collection(OfficeRndService.opportunitiesCollection)
              .doc(opportunity._id),
            opportunity
          );
        }
      }
    });

    logger.info(
      'OfficeRndScheduledEvents.performFullSync()- Full sync completed',
      {
        membersUpdated: members.length,
        companiesUpdated: companies.length,
        opportunitiesUpdated: opportunities.length,
      }
    );
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

    const trialdayService = new TrialdayService({
      firestoreService: FirestoreService.getInstance(),
      sendgridService: SendgridService.getInstance(),
      emailConfirmationService: new EmailConfirmationService({
        firestoreService: FirestoreService.getInstance(),
        sendgridService: SendgridService.getInstance(),
      }),
      officeRndService: new OfficeRndService({
        firestoreService: FirestoreService.getInstance(),
      }),
    });

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
  }
}
