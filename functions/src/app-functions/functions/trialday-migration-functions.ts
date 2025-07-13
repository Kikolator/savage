import {onCall} from 'firebase-functions/v2/https';
import {logger} from 'firebase-functions/v2';

import {STATIC_CONFIG, SECRET_REFERENCES} from '../../core/config';
import {
  TrialdayMigrationService,
  MigrationOptions,
} from '../../core/services/trialday-migration-service';
import {ServiceResolver} from '../../core/services/di';

/**
 * Callable function for migrating legacy trialday data
 * This function provides safe migration options with email control
 */
export const migrateTrialdayData = onCall(
  {
    region: STATIC_CONFIG.region,
    secrets: [SECRET_REFERENCES.sendgridApiKey],
  },
  async (request) => {
    try {
      const {type, options, typeformData} = request.data;

      logger.info('migrateTrialdayData - Starting migration', {
        type,
        options,
        hasTypeformData: !!typeformData,
      });

      // Get services from DI container
      const trialdayService = ServiceResolver.getTrialdayService();
      const firestoreService = ServiceResolver.getFirestoreService();
      const officeRndService = ServiceResolver.getOfficeRndService();

      const migrationService = new TrialdayMigrationService(
        trialdayService,
        firestoreService,
        officeRndService
      );

      // Validate request
      if (
        !type ||
        !['legacy-opportunities', 'typeform-submissions'].includes(type)
      ) {
        throw new Error(`Invalid migration type: ${type}`);
      }

      // Set default options
      const migrationOptions: MigrationOptions = {
        sendEmails: false, // Default to false for safety
        createMissingTrialdays: true,
        dryRun: true, // Default to dry run for safety
        ...options,
      };

      let result;

      switch (type) {
        case 'legacy-opportunities':
          result =
            await migrationService.migrateLegacyOpportunities(migrationOptions);
          break;
        case 'typeform-submissions':
          if (!typeformData || !Array.isArray(typeformData)) {
            throw new Error(
              'typeformData is required and must be an array for typeform-submissions migration'
            );
          }
          result = await migrationService.migrateTypeformSubmissions(
            typeformData,
            migrationOptions
          );
          break;
        default:
          throw new Error(`Unknown migration type: ${type}`);
      }

      logger.info('migrateTrialdayData - Migration completed', {
        type,
        result,
      });

      return {
        success: true,
        type,
        options: migrationOptions,
        result,
      };
    } catch (error) {
      logger.error('migrateTrialdayData - Migration failed', {
        error: error instanceof Error ? error.message : 'unknown error',
        data: request.data,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'unknown error',
      };
    }
  }
);

/**
 * Helper function to get migration status and statistics
 */
export const getMigrationStatus = onCall(
  {
    region: STATIC_CONFIG.region,
  },
  async () => {
    try {
      // Get services from DI container
      const firestoreService = ServiceResolver.getFirestoreService();
      const officeRndService = ServiceResolver.getOfficeRndService();

      // Get statistics about missing trialdays
      const missingTrialdays = await firestoreService.queryCollection(
        'missing-trialdays',
        []
      );

      // Get total trialdays
      const totalTrialdays = await firestoreService.queryCollection(
        'trialDays',
        []
      );

      // Get total opportunities
      const opportunities = await officeRndService.getOpportunities({});

      return {
        success: true,
        statistics: {
          totalTrialdays: totalTrialdays.length,
          totalOpportunities: opportunities.length,
          missingTrialdays: missingTrialdays.length,
          missingTrialdaysList: missingTrialdays.slice(0, 10), // First 10 for preview
        },
      };
    } catch (error) {
      logger.error('getMigrationStatus - Failed to get status', {
        error: error instanceof Error ? error.message : 'unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'unknown error',
      };
    }
  }
);
