import {logger} from 'firebase-functions';

import {OfficeRndOpportunity, Trialday, TrialDayFormData} from '../data/models';

import {TrialdayService} from './trialday-service';
import {FirestoreService} from './firestore-service';
import OfficeRndService from './office-rnd-service';
import {EmailConfirmationService} from './email-confirmation-service';
import {container} from './di/container';

/**
 * Migration options to control behavior during migration
 */
export interface MigrationOptions {
  /** Whether to send emails during migration (default: false) */
  sendEmails?: boolean;
  /** Whether to create trialday documents for opportunities without them */
  createMissingTrialdays?: boolean;
  /** Whether to process typeform submissions */
  processTypeformSubmissions?: boolean;
  /** Date range for migration (optional) */
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  /** Specific opportunity IDs to migrate (optional) */
  opportunityIds?: string[];
  /** Whether to dry run (default: true) */
  dryRun?: boolean;
}

/**
 * Migration service for handling legacy opportunities and typeform submissions
 * This service provides safe migration options with email control
 */
export class TrialdayMigrationService {
  constructor(
    private readonly trialdayService: TrialdayService,
    private readonly firestoreService: FirestoreService,
    private readonly officeRndService: OfficeRndService
  ) {}

  /**
   * Migrates legacy opportunities to have trialday documents
   * @param options - Migration configuration options
   * @returns Migration results
   */
  public async migrateLegacyOpportunities(
    options: MigrationOptions = {}
  ): Promise<{
    totalOpportunities: number;
    processedOpportunities: number;
    createdTrialdays: number;
    skippedOpportunities: number;
    errors: Array<{opportunityId: string; error: string}>;
  }> {
    const {
      sendEmails = false,
      createMissingTrialdays = true,
      dryRun = true,
      opportunityIds,
      dateRange,
    } = options;

    logger.info(
      'TrialdayMigrationService.migrateLegacyOpportunities - Starting migration',
      {
        sendEmails,
        createMissingTrialdays,
        dryRun,
        hasOpportunityIds: !!opportunityIds,
        hasDateRange: !!dateRange,
      }
    );

    let totalOpportunities = 0;
    let processedOpportunities = 0;
    let createdTrialdays = 0;
    let skippedOpportunities = 0;
    const errors: Array<{opportunityId: string; error: string}> = [];

    try {
      // Get opportunities to migrate
      let opportunities: OfficeRndOpportunity[] = [];

      if (opportunityIds && opportunityIds.length > 0) {
        // Migrate specific opportunities
        // For now, we'll get all opportunities and filter by ID
        // In the future, implement getOpportunity method in OfficeRndService
        const allOpportunities = await this.officeRndService.getOpportunities(
          {}
        );
        opportunities = allOpportunities.filter((opp) =>
          opportunityIds.includes(opp._id || '')
        );
        opportunities = opportunities.filter(
          (opp): opp is OfficeRndOpportunity => opp !== null
        );
      } else {
        // Get all opportunities
        opportunities = await this.officeRndService.getOpportunities({});
      }

      // Filter by date range if specified
      if (dateRange) {
        opportunities = opportunities.filter(
          (opp) =>
            opp.startDate &&
            opp.startDate >= dateRange.startDate &&
            opp.startDate <= dateRange.endDate
        );
      }

      totalOpportunities = opportunities.length;

      logger.info(
        'TrialdayMigrationService.migrateLegacyOpportunities - Processing opportunities',
        {
          totalOpportunities,
          dryRun,
        }
      );

      // Process each opportunity
      for (const opportunity of opportunities) {
        try {
          const result = await this.processLegacyOpportunity(opportunity, {
            sendEmails,
            createMissingTrialdays,
            dryRun,
          });

          if (result.created) {
            createdTrialdays++;
          }
          if (result.skipped) {
            skippedOpportunities++;
          }
          processedOpportunities++;
        } catch (error) {
          errors.push({
            opportunityId: opportunity._id || 'unknown',
            error: error instanceof Error ? error.message : 'unknown error',
          });
        }
      }

      logger.info(
        'TrialdayMigrationService.migrateLegacyOpportunities - Migration completed',
        {
          totalOpportunities,
          processedOpportunities,
          createdTrialdays,
          skippedOpportunities,
          errors: errors.length,
        }
      );

      return {
        totalOpportunities,
        processedOpportunities,
        createdTrialdays,
        skippedOpportunities,
        errors,
      };
    } catch (error) {
      logger.error(
        'TrialdayMigrationService.migrateLegacyOpportunities - Migration failed',
        {
          error: error instanceof Error ? error.message : 'unknown error',
        }
      );
      throw error;
    }
  }

  /**
   * Processes a single legacy opportunity
   */
  private async processLegacyOpportunity(
    opportunity: OfficeRndOpportunity,
    options: {
      sendEmails: boolean;
      createMissingTrialdays: boolean;
      dryRun: boolean;
    }
  ): Promise<{created: boolean; skipped: boolean}> {
    const {createMissingTrialdays, dryRun} = options;

    // Check if opportunity already has a trialday
    const existingTrialday =
      await this.trialdayService.getTrialdayByOpportunityId(
        opportunity._id || ''
      );

    if (existingTrialday) {
      logger.info(
        'TrialdayMigrationService.processLegacyOpportunity - Opportunity already has trialday',
        {
          opportunityId: opportunity._id,
          trialdayId: existingTrialday.id,
        }
      );
      return {created: false, skipped: true};
    }

    // Create trialday document if enabled
    if (createMissingTrialdays && !dryRun) {
      const trialdayId = await this.trialdayService.createPlaceholderTrialday(
        opportunity._id || '',
        opportunity.member || '',
        opportunity.name || ''
      );

      logger.info(
        'TrialdayMigrationService.processLegacyOpportunity - Created trialday',
        {
          opportunityId: opportunity._id,
          trialdayId,
        }
      );

      return {created: true, skipped: false};
    } else if (dryRun) {
      logger.info(
        'TrialdayMigrationService.processLegacyOpportunity - Would create trialday (dry run)',
        {
          opportunityId: opportunity._id,
          opportunityName: opportunity.name,
        }
      );
      return {created: false, skipped: false};
    }

    return {created: false, skipped: false};
  }

  /**
   * Processes typeform submissions to create trialday documents
   * This is useful for reprocessing old typeform data
   * @param typeformData - Array of typeform submission data
   * @param options - Migration options
   * @returns Migration results
   */
  public async migrateTypeformSubmissions(
    typeformData: TrialDayFormData[],
    options: MigrationOptions = {}
  ): Promise<{
    totalSubmissions: number;
    processedSubmissions: number;
    createdTrialdays: number;
    skippedSubmissions: number;
    errors: Array<{eventId: string; error: string}>;
  }> {
    const {sendEmails = false, dryRun = true} = options;

    logger.info(
      'TrialdayMigrationService.migrateTypeformSubmissions - Starting migration',
      {
        totalSubmissions: typeformData.length,
        sendEmails,
        dryRun,
      }
    );

    let processedSubmissions = 0;
    let createdTrialdays = 0;
    let skippedSubmissions = 0;
    const errors: Array<{eventId: string; error: string}> = [];

    for (const formData of typeformData) {
      try {
        // Check if trialday already exists for this event
        const existingTrialday = await this.firestoreService.queryCollection(
          TrialdayService.trialDaysCollection,
          [
            {
              field: Trialday.FIELDS.EVENT_ID,
              operator: '==',
              value: formData.eventId,
            },
          ]
        );

        if (existingTrialday.length > 0) {
          logger.info(
            'TrialdayMigrationService.migrateTypeformSubmissions - Trialday already exists',
            {
              eventId: formData.eventId,
              trialdayId: existingTrialday[0].id,
            }
          );
          skippedSubmissions++;
          continue;
        }

        if (!dryRun) {
          // Create a modified trialday service that doesn't send emails if disabled
          const modifiedTrialdayService = new TrialdayService({
            firestoreService: this.firestoreService,
            sendgridService: sendEmails
              ? container.resolve('sendgrid')
              : ({
                  mailSend: async () => {
                    logger.info(
                      'TrialdayMigrationService.migrateTypeformSubmissions - Email sending disabled',
                      {
                        eventId: formData.eventId,
                        email: formData.email,
                      }
                    );
                  },
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } as any),
            emailConfirmationService: new EmailConfirmationService({
              firestoreService: this.firestoreService,
              sendgridService: container.resolve('sendgrid'),
            }),
            officeRndService: this.officeRndService,
          });

          await modifiedTrialdayService.handleTrialdayRequest(formData);
          createdTrialdays++;
        } else {
          logger.info(
            'TrialdayMigrationService.migrateTypeformSubmissions - Would create trialday (dry run)',
            {
              eventId: formData.eventId,
              email: formData.email,
              firstName: formData.firstName,
              lastName: formData.lastName,
            }
          );
        }

        processedSubmissions++;
      } catch (error) {
        errors.push({
          eventId: formData.eventId,
          error: error instanceof Error ? error.message : 'unknown error',
        });
      }
    }

    logger.info(
      'TrialdayMigrationService.migrateTypeformSubmissions - Migration completed',
      {
        totalSubmissions: typeformData.length,
        processedSubmissions,
        createdTrialdays,
        skippedSubmissions,
        errors: errors.length,
      }
    );

    return {
      totalSubmissions: typeformData.length,
      processedSubmissions,
      createdTrialdays,
      skippedSubmissions,
      errors,
    };
  }
}
