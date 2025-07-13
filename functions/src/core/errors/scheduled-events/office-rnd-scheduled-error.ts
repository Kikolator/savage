/**
 * Specific error codes for OfficeRnd scheduled event operations
 */
export enum OfficeRndScheduledEventErrorCode {
  // Token operations (11001-11099)
  TOKEN_GENERATION_FAILED = 11001,
  TOKEN_REFRESH_FAILED = 11002,
  TOKEN_VALIDATION_FAILED = 11003,

  // Data backup operations (11101-11199)
  DATA_BACKUP_FAILED = 11101,
  DATA_VALIDATION_FAILED = 11102,
  METADATA_UPDATE_FAILED = 11103,

  // Trial day operations (11201-11299)
  TRIALDAY_FOLLOWUP_FAILED = 11201,
  OPPORTUNITY_PROCESSING_FAILED = 11202,
  TRIALDAY_DOCUMENT_MISSING = 11203,

  // API integration errors (11301-11399)
  OFFICE_RND_API_FAILED = 11301,
  API_RATE_LIMIT = 11302,
  API_TIMEOUT = 11303,

  // General scheduled event errors (11901-11999)
  UNKNOWN_ERROR = 11999,
}

import {BaseScheduledEventError} from './base-scheduled-event-error';

export class OfficeRndScheduledEventError extends BaseScheduledEventError {
  public readonly scheduledEventCode: OfficeRndScheduledEventErrorCode;

  constructor(
    message: string,
    functionName: string,
    scheduledEventCode: OfficeRndScheduledEventErrorCode = OfficeRndScheduledEventErrorCode.UNKNOWN_ERROR,
    details?: Record<string, unknown>
  ) {
    super(message, scheduledEventCode, functionName, details);
    this.scheduledEventCode = scheduledEventCode;
  }

  /**
   * Error when token generation fails
   */
  static tokenGenerationFailed(
    functionName: string,
    details?: Record<string, unknown>
  ): OfficeRndScheduledEventError {
    return new OfficeRndScheduledEventError(
      'Failed to generate OAuth2.0 token',
      functionName,
      OfficeRndScheduledEventErrorCode.TOKEN_GENERATION_FAILED,
      details
    );
  }

  /**
   * Error when token refresh fails
   */
  static tokenRefreshFailed(
    functionName: string,
    details?: Record<string, unknown>
  ): OfficeRndScheduledEventError {
    return new OfficeRndScheduledEventError(
      'Failed to refresh OAuth2.0 token',
      functionName,
      OfficeRndScheduledEventErrorCode.TOKEN_REFRESH_FAILED,
      details
    );
  }

  /**
   * Error when data backup fails
   */
  static dataBackupFailed(
    functionName: string,
    details?: Record<string, unknown>
  ): OfficeRndScheduledEventError {
    return new OfficeRndScheduledEventError(
      'Failed to perform data backup and validation',
      functionName,
      OfficeRndScheduledEventErrorCode.DATA_BACKUP_FAILED,
      details
    );
  }

  /**
   * Error when data validation fails
   */
  static dataValidationFailed(
    functionName: string,
    details?: Record<string, unknown>
  ): OfficeRndScheduledEventError {
    return new OfficeRndScheduledEventError(
      'Data validation failed during backup',
      functionName,
      OfficeRndScheduledEventErrorCode.DATA_VALIDATION_FAILED,
      details
    );
  }

  /**
   * Error when trial day followup fails
   */
  static trialdayFollowupFailed(
    functionName: string,
    details?: Record<string, unknown>
  ): OfficeRndScheduledEventError {
    return new OfficeRndScheduledEventError(
      'Failed to process trial complete opportunities',
      functionName,
      OfficeRndScheduledEventErrorCode.TRIALDAY_FOLLOWUP_FAILED,
      details
    );
  }

  /**
   * Error when opportunity processing fails
   */
  static opportunityProcessingFailed(
    functionName: string,
    details?: Record<string, unknown>
  ): OfficeRndScheduledEventError {
    return new OfficeRndScheduledEventError(
      'Failed to process individual opportunity',
      functionName,
      OfficeRndScheduledEventErrorCode.OPPORTUNITY_PROCESSING_FAILED,
      details
    );
  }

  /**
   * Error when trial day document is missing
   */
  static trialdayDocumentMissing(
    functionName: string,
    opportunityId: string,
    details?: Record<string, unknown>
  ): OfficeRndScheduledEventError {
    return new OfficeRndScheduledEventError(
      'Trial day document not found for opportunity',
      functionName,
      OfficeRndScheduledEventErrorCode.TRIALDAY_DOCUMENT_MISSING,
      {opportunityId, ...details}
    );
  }

  /**
   * Error when OfficeRnd API fails
   */
  static officeRndApiFailed(
    functionName: string,
    details?: Record<string, unknown>
  ): OfficeRndScheduledEventError {
    return new OfficeRndScheduledEventError(
      'OfficeRnd API operation failed',
      functionName,
      OfficeRndScheduledEventErrorCode.OFFICE_RND_API_FAILED,
      details
    );
  }

  /**
   * Error when API rate limit is hit
   */
  static apiRateLimit(
    functionName: string,
    details?: Record<string, unknown>
  ): OfficeRndScheduledEventError {
    return new OfficeRndScheduledEventError(
      'OfficeRnd API rate limit exceeded',
      functionName,
      OfficeRndScheduledEventErrorCode.API_RATE_LIMIT,
      details
    );
  }

  /**
   * Generic error for unknown issues
   */
  static unknownError(
    functionName: string,
    details?: Record<string, unknown>
  ): OfficeRndScheduledEventError {
    return new OfficeRndScheduledEventError(
      'Unknown error occurred in OfficeRnd scheduled event',
      functionName,
      OfficeRndScheduledEventErrorCode.UNKNOWN_ERROR,
      details
    );
  }
}
