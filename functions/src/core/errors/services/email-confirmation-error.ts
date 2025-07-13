import {AppError} from '../app-error';

export enum EmailConfirmationErrorCode {
  EMAIL_OBJECT_CREATION_FAILED = 'EMAIL_OBJECT_CREATION_FAILED',
  EMAIL_OBJECT_QUERY_FAILED = 'EMAIL_OBJECT_QUERY_FAILED',
  EMAIL_CONFIRMATION_SEND_FAILED = 'EMAIL_CONFIRMATION_SEND_FAILED',
  EMAIL_CONFIRMATION_FAILED = 'EMAIL_CONFIRMATION_FAILED',
  EMAIL_STATUS_CHECK_FAILED = 'EMAIL_STATUS_CHECK_FAILED',
  EMAIL_UPDATE_FAILED = 'EMAIL_UPDATE_FAILED',
  EMAIL_NOT_FOUND = 'EMAIL_NOT_FOUND',
  EMAIL_ALREADY_CONFIRMED = 'EMAIL_ALREADY_CONFIRMED',
  INVALID_EMAIL_FORMAT = 'INVALID_EMAIL_FORMAT',
  INVALID_EVENT_TYPE = 'INVALID_EVENT_TYPE',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class EmailConfirmationError extends AppError {
  public readonly serviceCode: EmailConfirmationErrorCode;
  public readonly code: number;

  constructor(
    message: string,
    serviceCode: EmailConfirmationErrorCode,
    status = 400,
    details?: any,
    cause?: Error
  ) {
    super(message, status, details, cause);
    this.name = 'EmailConfirmationError';
    this.serviceCode = serviceCode;
    this.code = 9100; // EMAIL_CONFIRMATION_ERROR
  }

  static emailObjectCreationFailed(
    method: string,
    email: string,
    eventType: string,
    eventId: string,
    cause?: Error
  ) {
    return new EmailConfirmationError(
      'Failed to create email confirmation object',
      EmailConfirmationErrorCode.EMAIL_OBJECT_CREATION_FAILED,
      500,
      {method, email, eventType, eventId},
      cause
    );
  }

  static emailObjectQueryFailed(method: string, email: string, cause?: Error) {
    return new EmailConfirmationError(
      'Failed to query email confirmation object',
      EmailConfirmationErrorCode.EMAIL_OBJECT_QUERY_FAILED,
      500,
      {method, email},
      cause
    );
  }

  static emailConfirmationSendFailed(
    method: string,
    email: string,
    firstName: string,
    cause?: Error
  ) {
    return new EmailConfirmationError(
      'Failed to send email confirmation',
      EmailConfirmationErrorCode.EMAIL_CONFIRMATION_SEND_FAILED,
      500,
      {method, email, firstName},
      cause
    );
  }

  static emailConfirmationFailed(
    method: string,
    emailId: string,
    cause?: Error
  ) {
    return new EmailConfirmationError(
      'Failed to confirm email',
      EmailConfirmationErrorCode.EMAIL_CONFIRMATION_FAILED,
      500,
      {method, emailId},
      cause
    );
  }

  static emailStatusCheckFailed(method: string, email: string, cause?: Error) {
    return new EmailConfirmationError(
      'Failed to check email confirmation status',
      EmailConfirmationErrorCode.EMAIL_STATUS_CHECK_FAILED,
      500,
      {method, email},
      cause
    );
  }

  static emailUpdateFailed(method: string, emailId: string, cause?: Error) {
    return new EmailConfirmationError(
      'Failed to update email confirmation object',
      EmailConfirmationErrorCode.EMAIL_UPDATE_FAILED,
      500,
      {method, emailId},
      cause
    );
  }

  static emailNotFound(method: string, emailId: string) {
    return new EmailConfirmationError(
      'Email confirmation object not found',
      EmailConfirmationErrorCode.EMAIL_NOT_FOUND,
      404,
      {method, emailId}
    );
  }

  static emailAlreadyConfirmed(method: string, email: string) {
    return new EmailConfirmationError(
      'Email is already confirmed',
      EmailConfirmationErrorCode.EMAIL_ALREADY_CONFIRMED,
      400,
      {method, email}
    );
  }

  static invalidEmailFormat(method: string, email: string) {
    return new EmailConfirmationError(
      'Invalid email format',
      EmailConfirmationErrorCode.INVALID_EMAIL_FORMAT,
      400,
      {method, email}
    );
  }

  static invalidEventType(method: string, eventType: string) {
    return new EmailConfirmationError(
      'Invalid event type',
      EmailConfirmationErrorCode.INVALID_EVENT_TYPE,
      400,
      {method, eventType}
    );
  }

  static unknownError(message: string, details?: any) {
    return new EmailConfirmationError(
      message,
      EmailConfirmationErrorCode.UNKNOWN_ERROR,
      500,
      details
    );
  }
}
