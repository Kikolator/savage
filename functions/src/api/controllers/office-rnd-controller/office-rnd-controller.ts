import { logger } from 'firebase-functions';
import { Controller, HttpServer } from '..';
import { RequestHandler } from 'express';
import { firebaseSecrets } from '../../../core/config/firebase-secrets';
import { AppError, ErrorCode } from '../../../core/errors/app-error';

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
    response.status(503).json({
      status: 'error',
      message: 'Service temporarily unavailable - under construction',
      code: 'SERVICE_UNAVAILABLE',
    });
    next();
  };

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
