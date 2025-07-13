import {AppError} from '../app-error';

export enum TypeformErrorCode {
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  INVALID_DATA = 'INVALID_DATA',
  NO_HANDLER_FOUND = 'NO_HANDLER_FOUND',
  NO_RAW_BODY = 'NO_RAW_BODY',
  FORM_PROCESSING_FAILED = 'FORM_PROCESSING_FAILED',
  WEBHOOK_PROCESSING_FAILED = 'WEBHOOK_PROCESSING_FAILED',
}

export class TypeformControllerError extends AppError {
  public readonly controllerCode: TypeformErrorCode;
  public readonly code: number;

  constructor(
    message: string,
    controllerCode: TypeformErrorCode,
    status = 400,
    details?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, status, details, cause);
    this.name = 'TypeformControllerError';
    this.controllerCode = controllerCode;
    this.code = 6000; // TYPEFORM_WEBHOOK_INVALID_DATA
  }

  static invalidSignature(method: string, details?: Record<string, unknown>) {
    return new TypeformControllerError(
      'Invalid Typeform signature',
      TypeformErrorCode.INVALID_SIGNATURE,
      401,
      {method, ...details}
    );
  }

  static invalidData(method: string, formId?: string) {
    return new TypeformControllerError(
      'Invalid Typeform webhook data',
      TypeformErrorCode.INVALID_DATA,
      400,
      {method, formId}
    );
  }

  static noHandlerFound(method: string, formId: string) {
    return new TypeformControllerError(
      'No handler found for form',
      TypeformErrorCode.NO_HANDLER_FOUND,
      400,
      {method, formId}
    );
  }

  static noRawBody(method: string) {
    return new TypeformControllerError(
      'No raw body found in request',
      TypeformErrorCode.NO_RAW_BODY,
      400,
      {method}
    );
  }

  static formProcessingFailed(
    method: string,
    formId: string,
    eventId: string,
    cause?: Error
  ) {
    return new TypeformControllerError(
      'Failed to process form data',
      TypeformErrorCode.FORM_PROCESSING_FAILED,
      500,
      {method, formId, eventId},
      cause
    );
  }

  static webhookProcessingFailed(
    method: string,
    eventId: string,
    cause?: Error
  ) {
    return new TypeformControllerError(
      'Failed to process webhook',
      TypeformErrorCode.WEBHOOK_PROCESSING_FAILED,
      500,
      {method, eventId},
      cause
    );
  }
}
