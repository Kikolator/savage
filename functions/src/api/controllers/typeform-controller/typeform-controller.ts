import * as crypto from 'crypto';

import {Request, Response, NextFunction} from 'express';

import {BaseController} from '../base-controller';
import {HttpServer} from '..';
import {TypeformControllerError} from '../../../core/errors/api/typeform-controller-error';
import {getConfig, STATIC_CONFIG} from '../../../core/config';
import {TrialDayFormData, TypeformResponse} from '../../../core/data/models';
import {TrialdayService} from '../../../core/services/trialday-service';
import {isDevelopment} from '../../../core/utils/environment';

import {parseTypeformResponse} from './typeform-parser';

class TypeformController extends BaseController {
  private static readonly formHandlers: Map<
    string,
    (data: TypeformResponse) => Promise<void>
  > = new Map();
  private readonly config: ReturnType<typeof getConfig>['runtime'];

  constructor(
    private readonly params: {
      trialdayService: TrialdayService;
    }
  ) {
    super();

    // Get runtime config when controller is instantiated
    const appConfig = getConfig();
    this.config = appConfig.runtime;

    // Bind the handlers in the constructor
    TypeformController.formHandlers.set(
      STATIC_CONFIG.typeform.ids.trialDay,
      this.handleTrialDayForm.bind(this)
    );
  }

  initialize(httpServer: HttpServer): void {
    httpServer.post(
      '/webhook/typeform',
      this.createHandler(this.handleWebhook.bind(this))
    );
  }

  private async handleWebhook(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    this.logInfo('handling typeform webhook');

    // If in emulator mode, skip the signature verification
    if (isDevelopment()) {
      this.logInfo('skipping signature verification in emulator mode');
    } else {
      this.verifyTypeformSignature(req.typeformSignature, req.rawBody);
    }

    const typeformData = req.body as TypeformResponse;

    // Validate data
    if (!typeformData.form_response?.form_id) {
      throw TypeformControllerError.invalidData('handleWebhook');
    }

    // Get the handler for the form
    const formId = typeformData.form_response.form_id;
    const formHandler = TypeformController.formHandlers.get(formId);

    // Send 200 OK response to Typeform first
    res.status(200).send('OK');

    if (!formHandler) {
      // Log error internally but don't throw
      this.logError('No handler found for form', undefined, {
        formId,
        eventId: typeformData.event_id,
      });
      // TODO add error to database
      return;
    }

    // Process the form response
    formHandler(typeformData).catch((error) => {
      this.logError('Error processing form', error, {
        formId: typeformData.form_response.form_id,
        eventId: typeformData.event_id,
      });
      next(error);
    });
  }

  private async handleTrialDayForm(data: TypeformResponse): Promise<void> {
    this.logInfo('handling trial day form', {eventId: data.event_id});

    try {
      // Parse the form data
      const formData = parseTypeformResponse<TrialDayFormData>(
        data,
        STATIC_CONFIG.typeform.ids.trialDay
      );

      await this.params.trialdayService.handleTrialdayRequest(formData);
    } catch (error) {
      throw TypeformControllerError.formProcessingFailed(
        'handleTrialDayForm',
        data.form_response.form_id,
        data.event_id,
        error instanceof Error ? error : undefined
      );
    }
  }

  private verifyTypeformSignature(
    receivedSignature: string | undefined,
    payload: Buffer | undefined
  ): void {
    if (!receivedSignature) {
      throw TypeformControllerError.invalidSignature(
        'verifyTypeformSignature',
        {
          reason: 'No signature found in request',
        }
      );
    }

    if (!payload) {
      throw TypeformControllerError.noRawBody('verifyTypeformSignature');
    }

    const secret = this.config.typeform.secretKey;

    // Create HMAC and update with raw buffer
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const hash = hmac.digest('base64');
    const expectedSignature = `sha256=${hash}`;

    if (receivedSignature !== expectedSignature) {
      throw TypeformControllerError.invalidSignature(
        'verifyTypeformSignature',
        {
          receivedSignature,
          expectedSignature,
          secretLength: secret.length,
          hash,
          payloadLength: payload.length,
        }
      );
    }
  }
}

export default TypeformController;
