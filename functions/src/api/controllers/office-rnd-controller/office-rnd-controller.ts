import crypto from 'crypto';

import {logger} from 'firebase-functions';
import {RequestHandler} from 'express';

import {Controller, HttpServer} from '..';
import {firebaseSecrets} from '../../../core/config/firebase-secrets';
import {OfficeRndControllerError} from '../../../core/errors';
import OfficeRndService from '../../../core/services/office-rnd-service';
import {FirestoreService} from '../../../core/services/firestore-service';
import {SendgridService} from '../../../core/services/sendgrid-service';
import {OfficeRndMember} from '../../../core/data/models';

class OfficeRndController implements Controller {
  constructor(
    private readonly officeRndService: OfficeRndService,
    private readonly firestoreService: FirestoreService,
    private readonly sendgridService: SendgridService
  ) {}
  initialize(httpServer: HttpServer): void {
    httpServer.post('/webhook/office-rnd', this.handleWebhook.bind(this));
    httpServer.get(
      '/initialize/office-rnd',
      this.initializeOfficeRnd.bind(this)
    );
    httpServer.get('/backup-status', this.getBackupStatus.bind(this));
  }

  private handleWebhook: RequestHandler = async (request, response, next) => {
    logger.info(
      'OfficeRndController.handleWebhook: handling office rnd webhook',
      {body: request.body}
    );
    const {body, rawBody, headers} = request;

    // Verify the signature
    const officeRndSignature = headers['officernd-signature'] as string;
    this.verifyOfficeRndSignature(rawBody, officeRndSignature);

    // Send 200 OK response to OfficeRnd first
    response.status(200).send('OK');

    const {eventType, data} = body;

    switch (eventType) {
      case 'membership.created':
        logger.warn(
          'NOT IMPLEMENTED: OfficeRndController.handleWebhook: membership created',
          {
            data,
          }
        );
        break;
      case 'membership.updated':
        logger.warn(
          'NOT IMPLEMENTED: OfficeRndController.handleWebhook: membership updated',
          {
            data,
          }
        );
        break;
      case 'membership.removed':
        logger.warn(
          'NOT IMPLEMENTED:OfficeRndController.handleWebhook: membership removed',
          {
            data,
          }
        );
        break;
      case 'member.created':
        logger.info('OfficeRndController.handleWebhook: member created', {
          data,
        });
        await this.handleMemberCreated(data);
        break;
      case 'member.updated':
        logger.info('OfficeRndController.handleWebhook: member updated', {
          data,
        });
        await this.handleMemberUpdated(data);
        break;
      case 'member.removed':
        logger.info('OfficeRndController.handleWebhook: member removed', {
          data,
        });
        await this.handleMemberRemoved(data);
        break;
      default:
        logger.warn(
          `OfficeRndController.handleWebhook: unknown event type: ${eventType}`
        );
    }
    next();
  };

  private verifyOfficeRndSignature(
    rawBody: Buffer | undefined,
    officeRndSignature: string | undefined
  ): void {
    if (!officeRndSignature) {
      throw new OfficeRndControllerError(
        'No office rnd signature found in header',
        401,
        'verifyOfficeRndSignature'
      );
    }

    const webhookSecret = firebaseSecrets.officeRndWebhookSecret.value();

    const signatureHeaderParts = officeRndSignature.split(',');
    const timestampParts = signatureHeaderParts[0].split('=');
    const signatureParts = signatureHeaderParts[1].split('=');

    const timestamp = timestampParts[1];
    const signature = signatureParts[1];

    const payloadToSign = rawBody + '.' + timestamp;
    const mySignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payloadToSign)
      .digest('hex');

    if (mySignature !== signature) {
      throw new OfficeRndControllerError(
        'Invalid signature for webhook. server and client are out of sync.',
        401,
        'verifyOfficeRndSignature'
      );
    }
  }

  /**
   * Handles member creation events from Office Rnd webhook
   */
  private async handleMemberCreated(member: OfficeRndMember): Promise<void> {
    try {
      // Save to Firestore
      await this.firestoreService.setDocument({
        collection: OfficeRndService.membersCollection,
        documentId: member._id,
        data: member,
      });

      // WhatsApp integration handled by Firestore event triggers

      // Sync to SendGrid
      await this.sendgridService.syncMemberToSendGrid(member);
    } catch (error) {
      logger.error('Failed to handle member creation', {
        memberId: member._id,
        error: error instanceof Error ? error.message : 'unknown error',
      });
      // Don't throw to avoid breaking the webhook
    }
  }

  /**
   * Handles member update events from Office Rnd webhook
   */
  private async handleMemberUpdated(member: OfficeRndMember): Promise<void> {
    try {
      // Get the previous member data from Firestore
      let previousMember: OfficeRndMember | null = null;
      try {
        const previousData = await this.firestoreService.getDocument(
          OfficeRndService.membersCollection,
          member._id
        );
        previousMember = previousData as OfficeRndMember;
      } catch (error) {
        // Previous member not found, that's okay for updates
        logger.warn('Previous member not found for update', {
          memberId: member._id,
        });
      }

      // Update Firestore
      await this.firestoreService.setDocument({
        collection: OfficeRndService.membersCollection,
        documentId: member._id,
        data: member,
      });

      // WhatsApp integration handled by Firestore event triggers

      // Sync to SendGrid with previous state for comparison
      await this.sendgridService.syncMemberToSendGrid(
        member,
        previousMember ?? undefined
      );
    } catch (error) {
      logger.error('Failed to handle member update', {
        memberId: member._id,
        error: error instanceof Error ? error.message : 'unknown error',
      });
      // Don't throw to avoid breaking the webhook
    }
  }

  /**
   * Handles member removal events from Office Rnd webhook
   */
  private async handleMemberRemoved(member: OfficeRndMember): Promise<void> {
    try {
      // Remove from Firestore by setting to null or using a different approach
      // For now, we'll just log the removal since there's no deleteDocument method
      logger.info('Member removed from Office Rnd', {
        memberId: member._id,
      });

      // Remove from SendGrid
      await this.sendgridService.removeMemberFromSendGrid(member);
    } catch (error) {
      logger.error('Failed to handle member removal', {
        memberId: member._id,
        error: error instanceof Error ? error.message : 'unknown error',
      });
      // Don't throw to avoid breaking the webhook
    }
  }

  /**
   * Get backup status and statistics
   */
  public getBackupStatus: RequestHandler = async (request, response, next) => {
    try {
      logger.info('OfficeRndController.getBackupStatus: Getting backup status');

      // Get backup metadata from Firestore
      const backupMetadata = await this.firestoreService.getDocument(
        OfficeRndService.metadataCollection,
        'backup-metadata'
      );

      // Get current data counts
      const [
        firestoreMembers,
        apiMembers,
        firestoreOpportunities,
        apiOpportunities,
        firestoreCompanies,
        apiCompanies,
      ] = await Promise.all([
        this.officeRndService.getAllMembers(),
        this.officeRndService.getAllMembersFromAPI(),
        this.officeRndService.getOpportunities({}),
        this.officeRndService.getOpportunitiesFromAPI({}),
        this.officeRndService.getAllCompanies(),
        this.officeRndService.getAllCompaniesFromAPI(),
      ]);

      const status = {
        backup: backupMetadata || {status: 'no_backup_data'},
        currentStats: {
          members: {
            firestore: firestoreMembers.length,
            api: apiMembers.length,
            missing: apiMembers.length - firestoreMembers.length,
          },
          opportunities: {
            firestore: firestoreOpportunities.length,
            api: apiOpportunities.length,
            missing: apiOpportunities.length - firestoreOpportunities.length,
          },
          companies: {
            firestore: firestoreCompanies.length,
            api: apiCompanies.length,
            missing: apiCompanies.length - firestoreCompanies.length,
          },
        },
        syncHealth: {
          members:
            firestoreMembers.length === apiMembers.length
              ? 'healthy'
              : 'out_of_sync',
          opportunities:
            firestoreOpportunities.length === apiOpportunities.length
              ? 'healthy'
              : 'out_of_sync',
          companies:
            firestoreCompanies.length === apiCompanies.length
              ? 'healthy'
              : 'out_of_sync',
        },
        lastChecked: new Date(),
      };

      response.json(status);
    } catch (error) {
      logger.error('Failed to get backup status', {
        error: error instanceof Error ? error.message : 'unknown error',
      });
      next(error);
    }
  };

  // Initialize the OfficeRnd service.
  // ONLY CALL THIS ONCE.
  // TODO add a safety for when it is called it cannot be called again.
  private initializeOfficeRnd: RequestHandler = async (
    request,
    response,
    next
  ) => {
    logger.info(
      'OfficeRndController.initializeOfficeRnd: initializing office rnd'
    );
    // Verify caller by checking the secret.
    const secret = request.headers['savage-secret'];
    if (secret !== firebaseSecrets.savageSecret.value()) {
      throw new OfficeRndControllerError(
        'Invalid secret for initializeOfficeRnd. This endpoint is only accessible to Savage.',
        401,
        'initializeOfficeRnd'
      );
    }
    // Call is verified, respond 200;
    response.status(200).send('OK');

    // Handle logic in a try catch block.
    this._initializeOfficeRnd().catch((error) => {
      logger.error(
        'OfficeRndController.initializeOfficeRnd: error initializing office rnd',
        error
      );
      next(error);
    });
    next();
  };

  private async _initializeOfficeRnd(): Promise<void> {
    // First we get all the data from OfficeRnd API for initial migration:
    // 1. Members
    const members = await this.officeRndService.getAllMembersFromAPI();
    // 2. Companies
    const companies = await this.officeRndService.getAllCompaniesFromAPI();
    // 4. Events
    // 5. Bookings
    // 7. Locations (not needed yet)
    // 8. Opportunities
    const opportunities = await this.officeRndService.getOpportunitiesFromAPI(
      {}
    );
    // 9. Opportunity Statuses
    const opStatuses =
      await this.officeRndService.getOpportunityStatusesFromAPI();

    // Then we save the data to the database in a batch.
    await this.firestoreService.runBatch(async (batch) => {
      for (const member of members) {
        if (member._id) {
          batch.set(
            this.firestoreService
              .getFirestoreInstance()
              .collection(OfficeRndService.membersCollection)
              .doc(member._id),
            member
          );
        }
      }
      for (const company of companies) {
        if (company._id) {
          batch.set(
            this.firestoreService
              .getFirestoreInstance()
              .collection(OfficeRndService.companiesCollection)
              .doc(company._id),
            company
          );
        }
      }
      for (const opportunity of opportunities) {
        if (!opportunity._id) {
          // Skip if opportunity has no id. Which should not happen but just in case.
          continue;
        }
        batch.set(
          this.firestoreService
            .getFirestoreInstance()
            .collection(OfficeRndService.opportunitiesCollection)
            .doc(opportunity._id),
          opportunity
        );
      }
      for (const opStatus of opStatuses) {
        if (opStatus._id) {
          batch.set(
            this.firestoreService
              .getFirestoreInstance()
              .collection(OfficeRndService.opportunityStatusesCollection)
              .doc(opStatus._id),
            opStatus
          );
        }
      }
    });
  }
}
export default OfficeRndController;
