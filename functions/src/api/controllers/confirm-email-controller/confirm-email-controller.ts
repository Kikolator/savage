import {RequestHandler} from 'express';
import {logger} from 'firebase-functions';

import {Controller, HttpServer} from '..';
import {AppError, ErrorCode} from '../../../core/errors';
import {EmailConfirmationService} from '../../../core/services/email-confirmation-service';
import {TrialdayService} from '../../../core/services/trialday-service';
import {TrialdayStatus} from '../../../core/data/enums';

export class ConfirmEmailController implements Controller {
  constructor(
    private readonly emailConfirmationService: EmailConfirmationService,
    private readonly trialdayService: TrialdayService
  ) {}
  initialize(httpServer: HttpServer): void {
    httpServer.post('/confirm-email', this.handleConfirmEmail);
  }

  private handleConfirmEmail: RequestHandler = async (
    request,
    response,
    next
  ) => {
    try {
      logger.info(
        'ConfirmEmailController.handleConfirmEmail: confirming email',
        {
          body: request.body,
          headers: request.headers,
        }
      );
      // TODO: Verify the secret key
      //   const { query, headers, rawBody } = request;
      //   const signature = headers['savage-signature'] as string;
      // this.verifyEmailConfirmationSecret(rawBody, signature);

      const {id, eventType, eventId} = request.body;
      if (!id || !eventType || !eventId) {
        throw new AppError(
          'ConfirmEmailController.handleConfirmEmail: missing id, eventType, or eventId',
          ErrorCode.INVALID_ARGUMENT,
          401
        );
      }

      // sent 200 status code.
      response.status(200).send('Email confirmed');

      // handle eventType+eventId
      this.handleEvent(id, eventType, eventId);
    } catch (error) {
      next(error);
    }
  };

  private async handleEvent(
    id: string,
    eventType: string,
    eventId: string
  ): Promise<void> {
    // Update email doc to confirmed.
    await this.emailConfirmationService.confirmEmail(id);

    switch (eventType) {
      case 'trial':
        // Update trial doc status to email confirmed
        await this.trialdayService.updateTrialdayStatus(
          eventId,
          TrialdayStatus.EMAIL_CONFIRMED
        );
        // Confirmation email is handled in the trialday-events trigger.
        break;
      case 'membership':
        // Update membership doc status to email confirmed
        throw new Error('Not implemented');
        break;
      default:
        throw new AppError(
          'ConfirmEmailController.handleConfirmEmail: unknown event type',
          ErrorCode.INVALID_ARGUMENT,
          401
        );
    }
  }

  //   private verifyEmailConfirmationSecret(rawBody: Buffer | undefined, clientSignature: string | undefined): void {
  //     if (!clientSignature) {
  //       throw new AppError(
  //         'ConfirmEmailController.handleConfirmEmail: no secret found in headers',
  //         ErrorCode.UNAUTHORIZED,
  //         401
  //       );
  //     }
  //     if (!rawBody) {
  //       throw new AppError(
  //         'ConfirmEmailController.handleConfirmEmail: no body found in request',
  //         ErrorCode.UNAUTHORIZED,
  //         401
  //       );
  //     }

  //     const serverSecret = firebaseSecrets.savageSecret.value();

  //     const serverSignature = crypto
  //       .createHmac('sha256', serverSecret)
  //       .update(rawBody.toString())
  //       .digest('hex');

  //     if (clientSignature !== serverSignature) {
  //       throw new AppError(
  //         'ConfirmEmailController.handleConfirmEmail: invalid secret',
  //         ErrorCode.UNAUTHORIZED,
  //         401
  //       );
  //     }
  //   }
}
