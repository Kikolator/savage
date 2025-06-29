import { logger } from 'firebase-functions';
import { Controller, HttpServer } from '..';
import { RequestHandler } from 'express';
import { firebaseSecrets } from '../../../core/config/firebase-secrets';
import { AppError, ErrorCode } from '../../../core/errors/app-error';
import crypto from 'crypto';

class OfficeRndController implements Controller {
  initialize(httpServer: HttpServer): void {
    httpServer.get('/webhook/office-rnd', this.handleWebhook.bind(this));
    httpServer.post('/initialize/office-rnd', this.initializeOfficeRnd.bind(this));
  }

  private handleWebhook: RequestHandler = async (
    request,
    response,
    next,
  ) => {
    logger.info('OfficeRndController.handleWebhook: handling office rnd webhook',
      {
        body: request.body,
      }
    );
    const { body, rawBody, headers } = request;

    // Verify the signature
    const officeRndSignature = headers['officernd-signature'] as string;
    this.verifyOfficeRndSignature(rawBody, officeRndSignature);

    // Send 200 OK response to OfficeRnd first
    response.status(200).send('OK');


    const { eventType, data } = body;

    switch (eventType) {
      case 'membership.created':
        logger.info('OfficeRndController.handleWebhook: membership created', { data });
        break;
      case 'membership.updated':
        logger.info('OfficeRndController.handleWebhook: membership updated', { data });
        break;
      case 'membership.removed':
        logger.info('OfficeRndController.handleWebhook: membership removed', { data });
        break;
      default:
        logger.error('OfficeRndController.handleWebhook: unknown event type', { eventType });
        throw new AppError('OfficeRndController.handleWebhook: unknown event type', ErrorCode.OFFICERND_UNKNOWN_EVENT, 500);
    }
    next();
  };

  private verifyOfficeRndSignature(
    rawBody: Buffer | undefined,
    officeRndSignature: string | undefined
  ): void {
    if (!officeRndSignature) {
      throw new AppError('OfficeRndController.handleWebhook: no office rnd signature found', ErrorCode.OFFICERND_WEBHOOK_INVALID_SIGNATURE, 401);
    }

    const webhookSecret = firebaseSecrets.officeRndWebhookSecret.value();

    const signatureHeaderParts = officeRndSignature.split(',');
    const timestampParts = signatureHeaderParts[0].split('=');
    const signatureParts = signatureHeaderParts[1].split('=');

    const timestamp = timestampParts[1];
    const signature = signatureParts[1];

    const payloadToSign = rawBody + '.' + timestamp;
    const mySignature = crypto.createHmac('sha256', webhookSecret)
      .update(payloadToSign)
      .digest('hex');

    if (mySignature !== signature) {
      throw new AppError('OfficeRndController.handleWebhook: invalid signature', ErrorCode.OFFICERND_WEBHOOK_INVALID_SIGNATURE, 401);
    }
  }

  // Initialize the OfficeRnd service.
  // ONLY CALL THIS ONCE.
  // TODO add a safety for when it is called it cannot be called again.
  private initializeOfficeRnd: RequestHandler = async (
    request,
    response,
    next,
  ) => {
    logger.info('OfficeRndController.initializeOfficeRnd: initializing office rnd');
    // Verify caller by checking the secret.
    const secret = request.headers['x-secret'];
    if (secret !== firebaseSecrets.typeformSecretKey.value()) {
      throw new AppError('OfficeRndController.initializeOfficeRnd: invalid secret', ErrorCode.UNAUTHORIZED, 401);
    }
    // Call is verified, respond 200;
    response.status(200).send('OK');

    // Handle logic in a try catch block.
    this._initializeOfficeRnd().catch((error) => {
      logger.error('OfficeRndController.initializeOfficeRnd: error initializing office rnd', error);
      next(error);
    });
    next();
  };

  private async _initializeOfficeRnd(): Promise<void> {
    // First we get all the data from OfficeRnd:
    // 1. Members
    // 2. Companies
    // 4. Events
    // 5. Bookings
    // 6. Contacts
    // 7. Locations
    // 8. Opportunities
    // 9. Opportunity Statuses

    // Then we save the data to the database in a batch.
  }
}
export default OfficeRndController;
