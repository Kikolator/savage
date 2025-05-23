import { RequestHandler } from 'express';
import { Controller, HttpServer } from '..';
// import { FirestoreService } from '../../../core/services/firestore-service';
import { TYPEFORM_IDS } from '../../../core/config/typeform-ids';
import * as crypto from 'crypto';
import { firebaseSecrets } from '../../../core/config/firebase-secrets';
import { TrialDayFormData, TypeformResponse } from '../../../core/data/models';
import { parseTypeformResponse } from './typeform-parser';
import { logger } from 'firebase-functions';
import { TrialdayService } from '../../../core/services/trialday-service';
import { AppError, ErrorCode } from '../../../core/errors/app-error';

class TypeformController implements Controller {
  private static readonly formHandlers: Map<
    string, (data: TypeformResponse) => Promise<void>> = new Map();

  constructor(
    private readonly params: {
      trialdayService: TrialdayService;
    }
  ) {
    // Bind the handlers in the constructor
    TypeformController.formHandlers.set(
      TYPEFORM_IDS.TRIAL_DAY,
      this.handleTrialDayForm.bind(this)
    );
  }

  initialize(httpServer: HttpServer): void {
    httpServer.post('/webhook/typeform', this.handleWebhook.bind(this));
  }

  private handleWebhook: RequestHandler = async (
    request,
    response,
    next,
  ) => {
    logger.info('TypeformController.handleWebhook: handling typeform webhook');

    // First verify the typeform signature to ensure the request is legitimate
    this.verifyTypeformSignature(
      request.typeformSignature,
      request.rawBody
    );

    const typeformData = request.body as TypeformResponse;

    // validate data
    if (!typeformData.form_response?.form_id) {
      throw new AppError('Invalid Typeform webhook data', ErrorCode.TYPEFORM_WEBHOOK_INVALID_DATA);
    }

    // get the handler for the form
    const formId = typeformData.form_response.form_id;
    const formHandler = TypeformController.formHandlers.get(formId);

    // Send 200 OK response to Typeform first
    response.status(200).send('OK');

    if (!formHandler) {
      // Log error internally but don't throw
      logger.error('TypeformController.handleWebhook()- No handler found for form', {
        formId,
        eventId: typeformData.event_id,
      });
      // TODO add error to database
      return;
    }

    // process the form response
    formHandler(typeformData).catch((error) => {
      logger.error('TypeformController.handleWebhook: error processing form', {
        error,
        formId: typeformData.form_response.form_id,
        eventId: typeformData.event_id,
      });
      next(error);
    });
    next();
  };

  private async handleTrialDayForm(
    data: TypeformResponse
  ): Promise<void> {
    logger.info('TypeformController.handleTrialDayForm: handling trial day form', {
      eventId: data.event_id,
    });
    // parse the form data
    const formData = parseTypeformResponse<TrialDayFormData>(
      data,
      TYPEFORM_IDS.TRIAL_DAY);

    await this.params.trialdayService.handleTrialdayRequest(formData);
  }

  private verifyTypeformSignature(
    receivedSignature: string | undefined,
    payload: Buffer | undefined
  ): void {
    if (!receivedSignature) {
      throw new AppError('No signature found in request', ErrorCode.TYPEFORM_WEBHOOK_INVALID_SIGNATURE, 401);
    }
    if (!payload) {
      throw new AppError('No payload found in request, check the rawBodySaver middleware', ErrorCode.TYPEFORM_WEBHOOK_NO_RAW_BODY, 401);
    }
    const secret = firebaseSecrets.typeformSecretKey.value();

    logger.debug('Typeform signature verification', {
      receivedSignature,
      payloadLength: payload.length,
      payloadHex: payload.toString('hex').substring(0, 100),
      secretLength: secret.length,
      secretFirstChars: secret.substring(0, 4) + '...',
    });

    // Create HMAC and update with raw buffer
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const hash = hmac.digest('base64');

    const expectedSignature = `sha256=${hash}`;
    logger.debug('Generated signature details', {
      hash,
      expectedSignature,
      receivedSignature,
      match: receivedSignature === expectedSignature,
      payloadHexEnd: payload.toString('hex').substring(payload.length * 2 - 100),
    });

    if (receivedSignature !== expectedSignature) {
      throw new AppError('invalid signature', ErrorCode.TYPEFORM_WEBHOOK_INVALID_SIGNATURE, 401, {
        receivedSignature,
        expectedSignature,
        secretLength: secret.length,
        hash,
        payloadLength: payload.length,
      });
    }
    return;
  }
}

export default TypeformController;
