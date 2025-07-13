import {AppError} from '../app-error';

export enum OfficeRndErrorCode {
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  INVALID_DATA = 'INVALID_DATA',
  MEMBER_NOT_FOUND = 'MEMBER_NOT_FOUND',
  WEBHOOK_PROCESSING_FAILED = 'WEBHOOK_PROCESSING_FAILED',
  MEMBER_SYNC_FAILED = 'MEMBER_SYNC_FAILED',
  UNKNOWN_EVENT_TYPE = 'UNKNOWN_EVENT_TYPE',
}

export class OfficeRndControllerError extends AppError {
  public readonly controllerCode: OfficeRndErrorCode;
  public readonly code: number;

  constructor(
    message: string,
    controllerCode: OfficeRndErrorCode,
    status = 400,
    details?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, status, details, cause);
    this.name = 'OfficeRndControllerError';
    this.controllerCode = controllerCode;
    this.code = 7000; // OFFICERND_CONTROLLER_ERROR
  }

  static invalidSignature(method: string, details?: Record<string, unknown>) {
    return new OfficeRndControllerError(
      'Invalid OfficeRnd signature',
      OfficeRndErrorCode.INVALID_SIGNATURE,
      401,
      {method, ...details}
    );
  }

  static invalidData(method: string, eventType?: string) {
    return new OfficeRndControllerError(
      'Invalid OfficeRnd webhook data',
      OfficeRndErrorCode.INVALID_DATA,
      400,
      {method, eventType}
    );
  }

  static memberNotFound(method: string, memberId: string) {
    return new OfficeRndControllerError(
      'Member not found',
      OfficeRndErrorCode.MEMBER_NOT_FOUND,
      404,
      {method, memberId}
    );
  }

  static webhookProcessingFailed(
    method: string,
    eventType: string,
    cause?: Error
  ) {
    return new OfficeRndControllerError(
      'Failed to process webhook',
      OfficeRndErrorCode.WEBHOOK_PROCESSING_FAILED,
      500,
      {method, eventType},
      cause
    );
  }

  static memberSyncFailed(method: string, memberId: string, cause?: Error) {
    return new OfficeRndControllerError(
      'Failed to sync member',
      OfficeRndErrorCode.MEMBER_SYNC_FAILED,
      500,
      {method, memberId},
      cause
    );
  }

  static unknownEventType(method: string, eventType: string) {
    return new OfficeRndControllerError(
      'Unknown event type',
      OfficeRndErrorCode.UNKNOWN_EVENT_TYPE,
      400,
      {method, eventType}
    );
  }
}
