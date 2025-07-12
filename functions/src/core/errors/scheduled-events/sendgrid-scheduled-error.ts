/**
 * Specific error codes for SendGrid scheduled event operations
 */
export enum SendgridScheduledEventErrorCode {
  // API integration errors (9001-9099)
  API_FETCH_FAILED = 9001,
  CUSTOM_FIELDS_FETCH_FAILED = 9002,
  LISTS_FETCH_FAILED = 9003,

  // Firestore operations (9101-9199)
  FIRESTORE_BATCH_FAILED = 9101,
  FIRESTORE_WRITE_FAILED = 9102,
  METADATA_UPDATE_FAILED = 9103,

  // Validation errors (9201-9299)
  INVALID_API_RESPONSE = 9201,
  DATA_VALIDATION_FAILED = 9202,

  // General scheduled event errors (9901-9999)
  UNKNOWN_ERROR = 9999,
}

import {BaseScheduledEventError} from './base-scheduled-event-error';

export class SendgridScheduledEventError extends BaseScheduledEventError {
  public readonly scheduledEventCode: SendgridScheduledEventErrorCode;

  constructor(
    message: string,
    functionName: string,
    scheduledEventCode: SendgridScheduledEventErrorCode = SendgridScheduledEventErrorCode.UNKNOWN_ERROR,
    details?: Record<string, unknown>
  ) {
    super(message, scheduledEventCode, functionName, details);
    this.scheduledEventCode = scheduledEventCode;
  }

  /**
   * Error when API fetch fails
   */
  static apiFetchFailed(
    functionName: string,
    details?: Record<string, unknown>
  ): SendgridScheduledEventError {
    return new SendgridScheduledEventError(
      'Failed to fetch data from SendGrid API',
      functionName,
      SendgridScheduledEventErrorCode.API_FETCH_FAILED,
      details
    );
  }

  /**
   * Error when custom fields fetch fails
   */
  static customFieldsFetchFailed(
    functionName: string,
    details?: Record<string, unknown>
  ): SendgridScheduledEventError {
    return new SendgridScheduledEventError(
      'Failed to fetch custom fields from SendGrid API',
      functionName,
      SendgridScheduledEventErrorCode.CUSTOM_FIELDS_FETCH_FAILED,
      details
    );
  }

  /**
   * Error when lists fetch fails
   */
  static listsFetchFailed(
    functionName: string,
    details?: Record<string, unknown>
  ): SendgridScheduledEventError {
    return new SendgridScheduledEventError(
      'Failed to fetch lists from SendGrid API',
      functionName,
      SendgridScheduledEventErrorCode.LISTS_FETCH_FAILED,
      details
    );
  }

  /**
   * Error when Firestore batch operation fails
   */
  static firestoreBatchFailed(
    functionName: string,
    details?: Record<string, unknown>
  ): SendgridScheduledEventError {
    return new SendgridScheduledEventError(
      'Failed to perform Firestore batch operation',
      functionName,
      SendgridScheduledEventErrorCode.FIRESTORE_BATCH_FAILED,
      details
    );
  }

  /**
   * Error when metadata update fails
   */
  static metadataUpdateFailed(
    functionName: string,
    details?: Record<string, unknown>
  ): SendgridScheduledEventError {
    return new SendgridScheduledEventError(
      'Failed to update sync metadata',
      functionName,
      SendgridScheduledEventErrorCode.METADATA_UPDATE_FAILED,
      details
    );
  }

  /**
   * Generic error for unknown issues
   */
  static unknownError(
    functionName: string,
    details?: Record<string, unknown>
  ): SendgridScheduledEventError {
    return new SendgridScheduledEventError(
      'Unknown error occurred in SendGrid scheduled event',
      functionName,
      SendgridScheduledEventErrorCode.UNKNOWN_ERROR,
      details
    );
  }
}
