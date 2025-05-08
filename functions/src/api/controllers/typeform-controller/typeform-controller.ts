import { RequestHandler, Request } from 'express';
import { AppError, Controller, HttpServer } from '..';
// import { FirestoreService } from '../../../core/services/firestore-service';
import { TYPEFORM_IDS } from '../../../core/config/typeform-ids';
import * as crypto from 'crypto';
import { firebaseSecrets } from '../../../core/config/firebase-secrets';
import { TrialDayFormData, TypeformResponse } from '../../../core/data/models';
import { parseTypeformResponse } from './typeform-parser';
import { logger } from 'firebase-functions';

class TypeformController implements Controller {
//   private readonly firestoreService: FirestoreService;
  private readonly formHandlers: Map<
    string, (data: TypeformResponse) => Promise<void>>;

  constructor() {
    // this.firestoreService = FirestoreService.getInstance();
    this.formHandlers = new Map([
      [TYPEFORM_IDS.TRIAL_DAY, this.handleTrialDayForm.bind(this)],
    ]);
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

    // First verify the typeform signature.
    this.verifyTypeformSignature(request);

    const typeformData = request.body as TypeformResponse;

    // validate data
    if (!typeformData.form_response?.form_id) {
      throw new AppError('Invalid Typeform webhook data', 400);
    }

    // get the handler for the form
    const formId = typeformData.form_response.form_id;
    const formHandler = this.formHandlers.get(formId);

    if (!formHandler) {
      throw new AppError(`No handler found for form_id: ${formId}`);
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
    });
  };

  private async handleTrialDayForm(
    data: TypeformResponse
  ): Promise<void> {
    logger.debug('TypeformController.handleTrialDayForm: handling trial day form', {
      eventId: data.event_id,
    });
    // parse the form data
    const formData = parseTypeformResponse<TrialDayFormData>(
      data,
      TYPEFORM_IDS.TRIAL_DAY);
    logger.debug('TypeformController.handleTrialDayForm: parsed form data', {
      formData,
    });

    // TODO check availability logic.
    // TODO approve/reschedule/deny.
    // TODO send email confirmation.
    // TODO Add to Google Cal.
    // TODO book a desk in office rnd
    throw new AppError('unimplemented', 500);
  }

  private verifyTypeformSignature(request: Request): void {
    const signature = request.typeformSignature;
    if (!signature) {
      throw new AppError('invalid typeform signature', 401);
    }
    const secret = firebaseSecrets.typeformSecretKey.value();
    const payload = request.body.toString();
    const hash = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('base64');
    if (signature !== `sha256=${hash}`) {
      throw new AppError('invalid typeform signature', 401);
    }
    return;
  }
}

export default TypeformController;
