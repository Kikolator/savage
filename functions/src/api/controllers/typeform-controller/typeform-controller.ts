import { RequestHandler, Request } from 'express';
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
  constructor(
    private readonly params: {
      trialdayService: TrialdayService;
    }
  ) {}

  initialize(httpServer: HttpServer): void {
    httpServer.post('/webhook/typeform', this.handleWebhook.bind(this));
  }

  private static readonly formHandlers: Map<
    string, (data: TypeformResponse) => Promise<void>> = new Map([
      [TYPEFORM_IDS.TRIAL_DAY, TypeformController.prototype.handleTrialDayForm],
    ]);

  private handleWebhook: RequestHandler = async (
    request,
    response,
    next,
  ) => {
    logger.info('TypeformController.handleWebhook: handling typeform webhook');

    // First verify the typeform signature.
    this.verifyTypeformSignature(request);

    const typeformData = request.body as TypeformResponse;

    // validate data
    if (!typeformData.form_response?.form_id) {
      throw new AppError('Invalid Typeform webhook data', ErrorCode.TYPEFORM_WEBHOOK_INVALID_DATA);
    }

    // get the handler for the form
    const formId = typeformData.form_response.form_id;
    const formHandler = TypeformController.formHandlers.get(formId);

    if (!formHandler) {
      throw new AppError(`No handler found for form_id: ${formId}`, ErrorCode.TYPEFORM_WEBHOOK_NO_HANDLER_FOUND);
    }

    // Authentication successful - send 200 response
    response.status(200).send('OK');

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

  private verifyTypeformSignature(request: Request): void {
    const signature = request.typeformSignature;
    if (!signature) {
      throw new AppError('No signature found in request', ErrorCode.TYPEFORM_WEBHOOK_INVALID_SIGNATURE, 401);
    }
    const secret = firebaseSecrets.typeformSecretKey.value();
    const payload = request.body.toString();
    const hash = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('base64');
    if (signature !== `sha256=${hash}`) {
      throw new AppError('invalid signature', ErrorCode.TYPEFORM_WEBHOOK_INVALID_SIGNATURE, 401);
    }
    return;
  }
}

export default TypeformController;
