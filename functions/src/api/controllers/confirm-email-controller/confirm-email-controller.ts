import {Request, Response, NextFunction} from 'express';

import {BaseController} from '../base-controller';
import {HttpServer} from '..';
import {ConfirmEmailControllerError} from '../../../core/errors/api/confirm-email-controller-error';
import {EmailConfirmationService} from '../../../core/services/email-confirmation-service';
import {TrialdayService} from '../../../core/services/trialday-service';
import {TrialdayStatus} from '../../../core/data/enums';

export class ConfirmEmailController extends BaseController {
  constructor(
    private readonly emailConfirmationService: EmailConfirmationService,
    private readonly trialdayService: TrialdayService
  ) {
    super();
  }

  initialize(httpServer: HttpServer): void {
    httpServer.post(
      '/confirm-email',
      this.createHandler(this.handleConfirmEmail.bind(this))
    );
    httpServer.options(
      '/confirm-email',
      this.createHandler(this.handleOptions.bind(this))
    );
  }

  private async handleOptions(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    this.setCorsHeaders(res);

    this.logInfo('handling preflight request', {
      origin: req.headers.origin,
      method: req.method,
    });

    res.status(200).send();
  }

  private async handleConfirmEmail(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    this.setCorsHeaders(res);

    // Validate required parameters
    this.validateRequiredParams(
      req.body,
      ['id', 'eventType', 'eventId'],
      'handleConfirmEmail'
    );

    const {id, eventType, eventId} = req.body;

    // Send immediate response to client
    res.status(200).send('Email confirmed');

    // Handle the event asynchronously
    try {
      await this.handleEvent(id, eventType, eventId);
    } catch (error) {
      // Log error but don't throw since we already sent 200 response
      this.logError('Failed to handle email confirmation event', error, {
        id,
        eventType,
        eventId,
      });
    }
  }

  private async handleEvent(
    id: string,
    eventType: string,
    eventId: string
  ): Promise<void> {
    try {
      // Update email doc to confirmed
      await this.emailConfirmationService.confirmEmail(id);

      switch (eventType) {
        case 'trial':
          // Update trial doc status to email confirmed
          await this.trialdayService.updateTrialdayStatus(
            eventId,
            TrialdayStatus.EMAIL_CONFIRMED
          );
          this.logInfo('Trial day email confirmed', {eventId});
          break;

        case 'membership':
          // Update membership doc status to email confirmed
          throw new Error('Membership email confirmation not implemented');

        default:
          throw ConfirmEmailControllerError.unknownEventType(
            'handleEvent',
            eventType
          );
      }
    } catch (error) {
      if (error instanceof ConfirmEmailControllerError) {
        throw error;
      }

      // Wrap service errors in controller-specific error
      throw ConfirmEmailControllerError.eventHandlingFailed(
        'handleEvent',
        eventType,
        eventId,
        error instanceof Error ? error : undefined
      );
    }
  }

  // TODO: Implement signature verification
  // private verifyEmailConfirmationSecret(rawBody: Buffer | undefined, clientSignature: string | undefined): void {
  //   if (!clientSignature) {
  //     throw ConfirmEmailControllerError.invalidSecret('verifyEmailConfirmationSecret', {
  //       reason: 'No secret found in headers'
  //     });
  //   }
  //   if (!rawBody) {
  //     throw ConfirmEmailControllerError.invalidSecret('verifyEmailConfirmationSecret', {
  //       reason: 'No body found in request'
  //     });
  //   }
  //   // ... signature verification logic
  // }
}
