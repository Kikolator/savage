import crypto from 'crypto';

import {Request, Response, NextFunction} from 'express';
import {DocumentData} from 'firebase-admin/firestore';

import {BaseController} from '../base-controller';
import {HttpServer} from '..';
import {OfficeRndControllerError} from '../../../core/errors';
import {getConfig} from '../../../core/config';
import OfficeRndService from '../../../core/services/office-rnd-service';
import {FirestoreService} from '../../../core/services/firestore-service';
import {SendgridService} from '../../../core/services/sendgrid-service';
import {OfficeRndMember} from '../../../core/data/models';

interface OfficeRndWebhookBody {
  eventType: string;
  data: {
    object: Record<string, unknown>;
    previousAttributes: Record<string, unknown>;
  };
}

class OfficeRndController extends BaseController {
  private readonly config: ReturnType<typeof getConfig>['runtime'];

  constructor(
    private readonly officeRndService: OfficeRndService,
    private readonly firestoreService: FirestoreService,
    private readonly sendgridService: SendgridService
  ) {
    super();

    // Get runtime config when controller is instantiated
    const appConfig = getConfig();
    this.config = appConfig.runtime;
  }

  initialize(httpServer: HttpServer): void {
    httpServer.post(
      '/webhook/office-rnd',
      this.createHandler(this.handleWebhook.bind(this))
    );
    httpServer.get(
      '/initialize/office-rnd',
      this.createHandler(this.initializeOfficeRnd.bind(this))
    );
    httpServer.get(
      '/backup-status',
      this.createHandler(this.getBackupStatus.bind(this))
    );
    httpServer.post(
      '/cleanup-faulty-webhooks',
      this.createHandler(this.cleanupFaultyWebhooks.bind(this))
    );
  }

  private async handleWebhook(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    this.logInfo('handling office rnd webhook', {body: req.body});

    const {body, rawBody, headers} = req;

    // Verify the signature
    const officeRndSignature = headers['officernd-signature'] as string;
    this.verifyOfficeRndSignature(rawBody, officeRndSignature);

    // Send 200 OK response to OfficeRnd first
    res.status(200).send('OK');

    const {eventType, data} = body as OfficeRndWebhookBody;

    switch (eventType) {
      case 'membership.created':
        this.logWarn('NOT IMPLEMENTED: membership created', {data});
        break;

      case 'membership.updated':
        this.logWarn('NOT IMPLEMENTED: membership updated', {data});
        break;

      case 'membership.removed':
        this.logWarn('NOT IMPLEMENTED: membership removed', {data});
        break;

      case 'member.created':
        this.logInfo('member created', {data});
        await this.handleMemberCreated(
          data.object as unknown as OfficeRndMember
        );
        break;

      case 'member.updated':
        this.logInfo('member updated', {data});
        await this.handleMemberUpdated(
          data.object as unknown as OfficeRndMember
        );
        break;

      case 'member.removed':
        this.logInfo('member removed', {data});
        await this.handleMemberRemoved(
          data.object as unknown as OfficeRndMember
        );
        break;

      default:
        this.logWarn(`unknown event type: ${eventType}`);
    }
  }

  private verifyOfficeRndSignature(
    rawBody: Buffer | undefined,
    officeRndSignature: string | undefined
  ): void {
    if (!officeRndSignature) {
      throw OfficeRndControllerError.invalidSignature(
        'verifyOfficeRndSignature',
        {
          reason: 'No office rnd signature found in header',
        }
      );
    }

    const webhookSecret = this.config.officeRnd.webhookSecret;

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
      throw OfficeRndControllerError.invalidSignature(
        'verifyOfficeRndSignature',
        {
          reason:
            'Invalid signature for webhook. server and client are out of sync.',
          receivedSignature: signature,
          expectedSignature: mySignature,
        }
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
      this.logError('Failed to handle member creation', error, {
        memberId: member._id,
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
        this.logWarn('Previous member not found for update', {
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
      this.logError('Failed to handle member update', error, {
        memberId: member._id,
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
      this.logInfo('Member removed from Office Rnd', {
        memberId: member._id,
      });

      // Remove from SendGrid
      await this.sendgridService.removeMemberFromSendGrid(member);
    } catch (error) {
      this.logError('Failed to handle member removal', error, {
        memberId: member._id,
      });
      // Don't throw to avoid breaking the webhook
    }
  }

  /**
   * Cleanup faulty webhook documents that were created with OfficeRndWebhookBody.data structure
   * instead of OfficeRndMember structure
   */
  public async cleanupFaultyWebhooks(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      this.logInfo('Starting cleanup of faulty webhook documents');

      // Verify caller by checking the secret
      const secret = req.headers['savage-secret'];
      if (secret !== this.config.savage.secret) {
        throw OfficeRndControllerError.invalidSignature(
          'cleanupFaultyWebhooks',
          {
            reason:
              'Invalid secret for cleanupFaultyWebhooks. This endpoint is only accessible to Savage.',
          }
        );
      }

      // Get all documents from the members collection
      const query = await this.firestoreService.getCollection(
        OfficeRndService.membersCollection
      );

      const faultyDocuments: Array<{id: string; data: DocumentData}> = [];
      const validDocuments: Array<{id: string; data: DocumentData}> = [];

      query.forEach((documentData, documentId) => {
        const data = documentData as DocumentData;

        // Check if this is a faulty document (has the webhook body structure)
        // Faulty documents will have: { object: {...}, previousAttributes: {...} }
        // Valid documents will have: { _id: string, ... }
        if (data.data.object && data.data.previousAttributes) {
          faultyDocuments.push({id: String(documentId), data});
        } else if (data._id) {
          validDocuments.push({id: String(documentId), data});
        } else {
          // Unknown structure, log for investigation
          this.logWarn('Unknown document structure found', {
            documentId,
            dataKeys: Object.keys(data),
          });
        }
      });

      this.logInfo('Cleanup analysis completed', {
        totalDocuments: faultyDocuments.length + validDocuments.length,
        faultyDocuments: faultyDocuments.length,
        validDocuments: validDocuments.length,
      });

      // Delete faulty documents
      if (faultyDocuments.length > 0) {
        await this.firestoreService.runBatch(async (batch) => {
          for (const faultyDoc of faultyDocuments) {
            this.firestoreService.addDeleteToBatch(
              batch,
              OfficeRndService.membersCollection,
              faultyDoc.id
            );
          }
        });

        this.logInfo('Faulty documents deleted successfully', {
          deletedCount: faultyDocuments.length,
        });
      }

      const result = {
        totalDocuments: faultyDocuments.length + validDocuments.length,
        faultyDocumentsDeleted: faultyDocuments.length,
        validDocumentsRemaining: validDocuments.length,
        faultyDocumentIds: faultyDocuments.map((doc) => doc.id),
        message: `Successfully deleted ${faultyDocuments.length} faulty webhook documents`,
      };

      res.json(result);
    } catch (error) {
      this.logError('Failed to cleanup faulty webhooks', error);
      next(error);
    }
  }

  /**
   * Get backup status and statistics
   */
  public async getBackupStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      this.logInfo('Getting backup status');

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

      res.json(status);
    } catch (error) {
      this.logError('Failed to get backup status', error);
      next(error);
    }
  }

  // Initialize the OfficeRnd service.
  // ONLY CALL THIS ONCE.
  // TODO add a safety for when it is called it cannot be called again.
  private async initializeOfficeRnd(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    this.logInfo('initializing office rnd');

    // Verify caller by checking the secret.
    const secret = req.headers['savage-secret'];
    if (secret !== this.config.savage.secret) {
      throw OfficeRndControllerError.invalidSignature('initializeOfficeRnd', {
        reason:
          'Invalid secret for initializeOfficeRnd. This endpoint is only accessible to Savage.',
      });
    }

    // Call is verified, respond 200;
    res.status(200).send('OK');

    // Handle logic in a try catch block.
    this._initializeOfficeRnd().catch((error) => {
      this.logError('error initializing office rnd', error);
      next(error);
    });
  }

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
          this.firestoreService.addSetToBatch(
            batch,
            OfficeRndService.membersCollection,
            member._id,
            member
          );
        }
      }
      for (const company of companies) {
        if (company._id) {
          this.firestoreService.addSetToBatch(
            batch,
            OfficeRndService.companiesCollection,
            company._id,
            company
          );
        }
      }
      for (const opportunity of opportunities) {
        if (!opportunity._id) {
          // Skip if opportunity has no id. Which should not happen but just in case.
          continue;
        }
        this.firestoreService.addSetToBatch(
          batch,
          OfficeRndService.opportunitiesCollection,
          opportunity._id,
          opportunity
        );
      }
      for (const opStatus of opStatuses) {
        if (opStatus._id) {
          this.firestoreService.addSetToBatch(
            batch,
            OfficeRndService.opportunityStatusesCollection,
            opStatus._id,
            opStatus
          );
        }
      }
    });
  }
}
export default OfficeRndController;
