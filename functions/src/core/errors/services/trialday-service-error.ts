import {AppError, ErrorCode} from '../app-error';

/**
 * Specific error codes for TrialdayService operations
 */
export enum TrialdayServiceErrorCode {
  // Request handling errors
  DUPLICATE_REQUEST = 4001,
  INVALID_FORM_DATA = 4002,
  TIMEZONE_NOT_SUPPORTED = 4003,

  // Document operations
  DOCUMENT_NOT_FOUND = 4101,
  DOCUMENT_CREATION_FAILED = 4102,
  DOCUMENT_UPDATE_FAILED = 4103,
  DOCUMENT_QUERY_FAILED = 4104,

  // Email operations
  EMAIL_CONFIRMATION_FAILED = 4201,
  EMAIL_SEND_FAILED = 4202,
  EMAIL_TEMPLATE_NOT_FOUND = 4203,

  // OfficeRnd integration
  OFFICE_RND_MEMBER_CREATION_FAILED = 4301,
  OFFICE_RND_OPPORTUNITY_CREATION_FAILED = 4302,
  OFFICE_RND_STATUS_NOT_FOUND = 4303,
  OFFICE_RND_INTEGRATION_FAILED = 4304,

  // Business logic errors
  USER_CANNOT_BOOK_TRIALDAY = 4401,
  TRIALDAY_ALREADY_COMPLETED = 4402,
  TRIALDAY_ALREADY_CANCELLED = 4403,
  INVALID_STATUS_TRANSITION = 4404,

  // Phone confirmation
  PHONE_CONFIRMATION_FAILED = 4501,

  // Migration and placeholder operations
  PLACEHOLDER_CREATION_FAILED = 4601,
  MIGRATION_FAILED = 4602,

  // General service errors
  SERVICE_INITIALIZATION_FAILED = 4901,
  UNKNOWN_ERROR = 4999,
}

/**
 * TrialdayService specific error class
 * Extends AppError with service-specific error codes and context
 */
export class TrialdayServiceError extends AppError {
  public readonly serviceCode: TrialdayServiceErrorCode;

  constructor(
    message: string,
    serviceCode: TrialdayServiceErrorCode,
    statusCode = 500,
    method?: string,
    data?: unknown
  ) {
    super(message, ErrorCode.TRIALDAY_SERVICE_ERROR, statusCode, {
      method,
      data,
      serviceCode,
    });
    this.serviceCode = serviceCode;
  }

  // Factory methods for common error scenarios

  /**
   * Error when handling trial day request
   */
  static handleRequestFailed(
    method: string,
    data?: Record<string, unknown>
  ): TrialdayServiceError {
    return new TrialdayServiceError(
      'Failed to handle trial day request',
      TrialdayServiceErrorCode.UNKNOWN_ERROR,
      500,
      method,
      data
    );
  }

  /**
   * Error when duplicate request is detected
   */
  static duplicateRequest(eventId: string): TrialdayServiceError {
    return new TrialdayServiceError(
      'Duplicate trial day request detected',
      TrialdayServiceErrorCode.DUPLICATE_REQUEST,
      409,
      'handleTrialdayRequest',
      {eventId}
    );
  }

  /**
   * Error when form data is invalid
   */
  static invalidFormData(
    method: string,
    data?: Record<string, unknown>
  ): TrialdayServiceError {
    return new TrialdayServiceError(
      'Invalid trial day form data',
      TrialdayServiceErrorCode.INVALID_FORM_DATA,
      400,
      method,
      data
    );
  }

  /**
   * Error when timezone is not supported
   */
  static timezoneNotSupported(timezone: string): TrialdayServiceError {
    return new TrialdayServiceError(
      'Timezone not supported',
      TrialdayServiceErrorCode.TIMEZONE_NOT_SUPPORTED,
      400,
      'handleTrialdayRequest',
      {timezone}
    );
  }

  /**
   * Error when document is not found
   */
  static documentNotFound(
    collection: string,
    documentId: string,
    method: string
  ): TrialdayServiceError {
    return new TrialdayServiceError(
      'Trial day document not found',
      TrialdayServiceErrorCode.DOCUMENT_NOT_FOUND,
      404,
      method,
      {collection, documentId}
    );
  }

  /**
   * Error when document creation fails
   */
  static documentCreationFailed(
    collection: string,
    method: string,
    data?: Record<string, unknown>
  ): TrialdayServiceError {
    return new TrialdayServiceError(
      'Failed to create trial day document',
      TrialdayServiceErrorCode.DOCUMENT_CREATION_FAILED,
      500,
      method,
      {collection, ...data}
    );
  }

  /**
   * Error when document update fails
   */
  static documentUpdateFailed(
    collection: string,
    documentId: string,
    method: string,
    data?: Record<string, unknown>
  ): TrialdayServiceError {
    return new TrialdayServiceError(
      'Failed to update trial day document',
      TrialdayServiceErrorCode.DOCUMENT_UPDATE_FAILED,
      500,
      method,
      {collection, documentId, ...data}
    );
  }

  /**
   * Error when document query fails
   */
  static documentQueryFailed(
    collection: string,
    method: string,
    data?: Record<string, unknown>
  ): TrialdayServiceError {
    return new TrialdayServiceError(
      'Failed to query trial day documents',
      TrialdayServiceErrorCode.DOCUMENT_QUERY_FAILED,
      500,
      method,
      {collection, ...data}
    );
  }

  /**
   * Error when email confirmation fails
   */
  static emailConfirmationFailed(
    trialdayId: string,
    method: string,
    data?: Record<string, unknown>
  ): TrialdayServiceError {
    return new TrialdayServiceError(
      'Failed to send email confirmation',
      TrialdayServiceErrorCode.EMAIL_CONFIRMATION_FAILED,
      500,
      method,
      {trialdayId, ...data}
    );
  }

  /**
   * Error when email send fails
   */
  static emailSendFailed(
    trialdayId: string,
    method: string,
    data?: Record<string, unknown>
  ): TrialdayServiceError {
    return new TrialdayServiceError(
      'Failed to send email',
      TrialdayServiceErrorCode.EMAIL_SEND_FAILED,
      500,
      method,
      {trialdayId, ...data}
    );
  }

  /**
   * Error when email template is not found
   */
  static emailTemplateNotFound(
    templateId: string,
    method: string
  ): TrialdayServiceError {
    return new TrialdayServiceError(
      'Email template not found',
      TrialdayServiceErrorCode.EMAIL_TEMPLATE_NOT_FOUND,
      500,
      method,
      {templateId}
    );
  }

  /**
   * Error when OfficeRnd member creation fails
   */
  static officeRndMemberCreationFailed(
    trialdayId: string,
    data?: Record<string, unknown>
  ): TrialdayServiceError {
    return new TrialdayServiceError(
      'Failed to create OfficeRnd member',
      TrialdayServiceErrorCode.OFFICE_RND_MEMBER_CREATION_FAILED,
      500,
      'addToOfficeRnd',
      {trialdayId, ...data}
    );
  }

  /**
   * Error when OfficeRnd opportunity creation fails
   */
  static officeRndOpportunityCreationFailed(
    trialdayId: string,
    data?: Record<string, unknown>
  ): TrialdayServiceError {
    return new TrialdayServiceError(
      'Failed to create OfficeRnd opportunity',
      TrialdayServiceErrorCode.OFFICE_RND_OPPORTUNITY_CREATION_FAILED,
      500,
      'addToOfficeRnd',
      {trialdayId, ...data}
    );
  }

  /**
   * Error when OfficeRnd status is not found
   */
  static officeRndStatusNotFound(trialdayId: string): TrialdayServiceError {
    return new TrialdayServiceError(
      'OfficeRnd trial day status not found',
      TrialdayServiceErrorCode.OFFICE_RND_STATUS_NOT_FOUND,
      500,
      'addToOfficeRnd',
      {trialdayId}
    );
  }

  /**
   * Error when OfficeRnd integration fails
   */
  static officeRndIntegrationFailed(
    trialdayId: string,
    data?: Record<string, unknown>
  ): TrialdayServiceError {
    return new TrialdayServiceError(
      'OfficeRnd integration failed',
      TrialdayServiceErrorCode.OFFICE_RND_INTEGRATION_FAILED,
      500,
      'addToOfficeRnd',
      {trialdayId, ...data}
    );
  }

  /**
   * Error when user cannot book trial day
   */
  static userCannotBookTrialday(
    trialdayId: string,
    reason: string
  ): TrialdayServiceError {
    return new TrialdayServiceError(
      'User cannot book trial day',
      TrialdayServiceErrorCode.USER_CANNOT_BOOK_TRIALDAY,
      400,
      'canBookTrialday',
      {trialdayId, reason}
    );
  }

  /**
   * Error when trial day is already completed
   */
  static trialdayAlreadyCompleted(trialdayId: string): TrialdayServiceError {
    return new TrialdayServiceError(
      'Trial day is already completed',
      TrialdayServiceErrorCode.TRIALDAY_ALREADY_COMPLETED,
      400,
      'complete',
      {trialdayId}
    );
  }

  /**
   * Error when trial day is already cancelled
   */
  static trialdayAlreadyCancelled(trialdayId: string): TrialdayServiceError {
    return new TrialdayServiceError(
      'Trial day is already cancelled',
      TrialdayServiceErrorCode.TRIALDAY_ALREADY_CANCELLED,
      400,
      'cancel',
      {trialdayId}
    );
  }

  /**
   * Error when status transition is invalid
   */
  static invalidStatusTransition(
    trialdayId: string,
    fromStatus: string,
    toStatus: string
  ): TrialdayServiceError {
    return new TrialdayServiceError(
      'Invalid status transition',
      TrialdayServiceErrorCode.INVALID_STATUS_TRANSITION,
      400,
      'updateTrialdayStatus',
      {trialdayId, fromStatus, toStatus}
    );
  }

  /**
   * Error when phone confirmation fails
   */
  static phoneConfirmationFailed(
    trialdayId: string,
    data?: Record<string, unknown>
  ): TrialdayServiceError {
    return new TrialdayServiceError(
      'Failed to send phone confirmation',
      TrialdayServiceErrorCode.PHONE_CONFIRMATION_FAILED,
      500,
      'sendPhoneConfirmation',
      {trialdayId, ...data}
    );
  }

  /**
   * Error when placeholder creation fails
   */
  static placeholderCreationFailed(
    opportunityId: string,
    data?: Record<string, unknown>
  ): TrialdayServiceError {
    return new TrialdayServiceError(
      'Failed to create placeholder trial day',
      TrialdayServiceErrorCode.PLACEHOLDER_CREATION_FAILED,
      500,
      'createPlaceholderTrialday',
      {opportunityId, ...data}
    );
  }

  /**
   * Error when migration fails
   */
  static migrationFailed(
    method: string,
    data?: Record<string, unknown>
  ): TrialdayServiceError {
    return new TrialdayServiceError(
      'Trial day migration failed',
      TrialdayServiceErrorCode.MIGRATION_FAILED,
      500,
      method,
      data
    );
  }

  /**
   * Error when service initialization fails
   */
  static initializationFailed(
    data?: Record<string, unknown>
  ): TrialdayServiceError {
    return new TrialdayServiceError(
      'TrialdayService initialization failed',
      TrialdayServiceErrorCode.SERVICE_INITIALIZATION_FAILED,
      500,
      'constructor',
      data
    );
  }
}
