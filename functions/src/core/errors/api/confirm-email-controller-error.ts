import {AppError} from '../app-error';

export enum ConfirmEmailErrorCode {
  INVALID_SECRET = 'INVALID_SECRET',
  MISSING_PARAMETERS = 'MISSING_PARAMETERS',
  UNKNOWN_EVENT_TYPE = 'UNKNOWN_EVENT_TYPE',
  EMAIL_CONFIRMATION_FAILED = 'EMAIL_CONFIRMATION_FAILED',
  EVENT_HANDLING_FAILED = 'EVENT_HANDLING_FAILED',
}

export class ConfirmEmailControllerError extends AppError {
  public readonly controllerCode: ConfirmEmailErrorCode;
  public readonly code: number;

  constructor(
    message: string,
    controllerCode: ConfirmEmailErrorCode,
    status = 400,
    details?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, status, details, cause);
    this.name = 'ConfirmEmailControllerError';
    this.controllerCode = controllerCode;
    this.code = 8000; // CONFIRM_EMAIL_CONTROLLER_ERROR
  }

  static invalidSecret(method: string, details?: Record<string, unknown>) {
    return new ConfirmEmailControllerError(
      'Invalid secret key provided',
      ConfirmEmailErrorCode.INVALID_SECRET,
      401,
      {method, ...details}
    );
  }

  static missingParameters(method: string, missingParams: string[]) {
    return new ConfirmEmailControllerError(
      'Missing required parameters',
      ConfirmEmailErrorCode.MISSING_PARAMETERS,
      400,
      {method, missingParams}
    );
  }

  static unknownEventType(method: string, eventType: string) {
    return new ConfirmEmailControllerError(
      'Unknown event type',
      ConfirmEmailErrorCode.UNKNOWN_EVENT_TYPE,
      400,
      {method, eventType}
    );
  }

  static emailConfirmationFailed(
    method: string,
    emailId: string,
    cause?: Error
  ) {
    return new ConfirmEmailControllerError(
      'Failed to confirm email',
      ConfirmEmailErrorCode.EMAIL_CONFIRMATION_FAILED,
      500,
      {method, emailId},
      cause
    );
  }

  static eventHandlingFailed(
    method: string,
    eventType: string,
    eventId: string,
    cause?: Error
  ) {
    return new ConfirmEmailControllerError(
      'Failed to handle event',
      ConfirmEmailErrorCode.EVENT_HANDLING_FAILED,
      500,
      {method, eventType, eventId},
      cause
    );
  }
}
