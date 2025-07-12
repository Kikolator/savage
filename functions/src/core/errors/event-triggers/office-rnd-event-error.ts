import {AppError, ErrorCode} from '../app-error';

/**
 * Specific error codes for OfficeRnd event trigger operations
 */
export enum OfficeRndEventErrorCode {
  // Member creation events (7001-7099)
  MEMBER_CREATION_HANDLER_FAILED = 7001,
  MEMBER_DATA_INVALID = 7002,
  MEMBER_STATUS_UNSUPPORTED = 7003,
  WHATSAPP_INTEGRATION_FAILED = 7004,

  // Member status change events (7101-7199)
  MEMBER_STATUS_CHANGE_HANDLER_FAILED = 7101,
  MEMBER_BEFORE_DATA_MISSING = 7102,
  MEMBER_AFTER_DATA_MISSING = 7103,
  STATUS_TRANSITION_INVALID = 7104,
  WHATSAPP_ADD_FAILED = 7105,
  WHATSAPP_REMOVE_FAILED = 7106,

  // Document operations (7201-7299)
  DOCUMENT_DATA_MISSING = 7201,
  DOCUMENT_PARSE_FAILED = 7202,
  DOCUMENT_VALIDATION_FAILED = 7203,

  // Integration errors (7301-7399)
  EXTERNAL_SERVICE_UNAVAILABLE = 7301,
  INTEGRATION_TIMEOUT = 7302,
  INTEGRATION_RATE_LIMIT = 7303,

  // General event trigger errors (7901-7999)
  EVENT_HANDLER_INITIALIZATION_FAILED = 7901,
  UNKNOWN_ERROR = 7999,
}

/**
 * OfficeRnd event trigger specific error class
 * Extends AppError with event trigger-specific error codes and context
 */
export class OfficeRndEventError extends AppError {
  public readonly eventCode: OfficeRndEventErrorCode;

  constructor(
    message: string,
    eventCode: OfficeRndEventErrorCode,
    method: string,
    data?: unknown
  ) {
    // Use 0 as status since event triggers don't return HTTP responses
    const details = {
      method,
      eventCode,
      eventTrigger: true,
      ...(data as Record<string, unknown>),
    };

    // Cast local error code to global ErrorCode for compatibility
    // TODO: Remove this cast when AppError is updated to support local error codes
    super(message, eventCode as unknown as ErrorCode, 0, details);
    this.eventCode = eventCode;
  }

  // Factory methods for member creation events

  /**
   * Error when member creation handler fails
   */
  static memberCreationHandlerFailed(
    memberId: string,
    data?: Record<string, unknown>
  ): OfficeRndEventError {
    return new OfficeRndEventError(
      'Failed to handle OfficeRnd member creation event',
      OfficeRndEventErrorCode.MEMBER_CREATION_HANDLER_FAILED,
      'onMemberCreated',
      {memberId, ...data}
    );
  }

  /**
   * Error when member data is invalid
   */
  static memberDataInvalid(
    memberId: string,
    data?: Record<string, unknown>
  ): OfficeRndEventError {
    return new OfficeRndEventError(
      'Invalid member data in creation event',
      OfficeRndEventErrorCode.MEMBER_DATA_INVALID,
      'onMemberCreated',
      {memberId, ...data}
    );
  }

  /**
   * Error when member status is unsupported
   */
  static memberStatusUnsupported(
    memberId: string,
    status: string
  ): OfficeRndEventError {
    return new OfficeRndEventError(
      'Unsupported member status for WhatsApp integration',
      OfficeRndEventErrorCode.MEMBER_STATUS_UNSUPPORTED,
      'onMemberCreated',
      {memberId, status}
    );
  }

  /**
   * Error when WhatsApp integration fails during member creation
   */
  static whatsappIntegrationFailed(
    memberId: string,
    operation: 'add' | 'remove',
    data?: Record<string, unknown>
  ): OfficeRndEventError {
    return new OfficeRndEventError(
      `WhatsApp ${operation} operation failed`,
      OfficeRndEventErrorCode.WHATSAPP_INTEGRATION_FAILED,
      'onMemberCreated',
      {memberId, operation, ...data}
    );
  }

  // Factory methods for member status change events

  /**
   * Error when member status change handler fails
   */
  static memberStatusChangeHandlerFailed(
    memberId: string,
    data?: Record<string, unknown>
  ): OfficeRndEventError {
    return new OfficeRndEventError(
      'Failed to handle OfficeRnd member status change event',
      OfficeRndEventErrorCode.MEMBER_STATUS_CHANGE_HANDLER_FAILED,
      'onMemberStatusChanged',
      {memberId, ...data}
    );
  }

  /**
   * Error when member before data is missing
   */
  static memberBeforeDataMissing(memberId: string): OfficeRndEventError {
    return new OfficeRndEventError(
      'Member before data is missing in status change event',
      OfficeRndEventErrorCode.MEMBER_BEFORE_DATA_MISSING,
      'onMemberStatusChanged',
      {memberId}
    );
  }

  /**
   * Error when member after data is missing
   */
  static memberAfterDataMissing(memberId: string): OfficeRndEventError {
    return new OfficeRndEventError(
      'Member after data is missing in status change event',
      OfficeRndEventErrorCode.MEMBER_AFTER_DATA_MISSING,
      'onMemberStatusChanged',
      {memberId}
    );
  }

  /**
   * Error when status transition is invalid
   */
  static statusTransitionInvalid(
    memberId: string,
    fromStatus: string,
    toStatus: string
  ): OfficeRndEventError {
    return new OfficeRndEventError(
      'Invalid status transition detected',
      OfficeRndEventErrorCode.STATUS_TRANSITION_INVALID,
      'onMemberStatusChanged',
      {memberId, fromStatus, toStatus}
    );
  }

  /**
   * Error when WhatsApp add operation fails
   */
  static whatsappAddFailed(
    memberId: string,
    data?: Record<string, unknown>
  ): OfficeRndEventError {
    return new OfficeRndEventError(
      'Failed to add member to WhatsApp community',
      OfficeRndEventErrorCode.WHATSAPP_ADD_FAILED,
      'onMemberStatusChanged',
      {memberId, operation: 'add', ...data}
    );
  }

  /**
   * Error when WhatsApp remove operation fails
   */
  static whatsappRemoveFailed(
    memberId: string,
    data?: Record<string, unknown>
  ): OfficeRndEventError {
    return new OfficeRndEventError(
      'Failed to remove member from WhatsApp community',
      OfficeRndEventErrorCode.WHATSAPP_REMOVE_FAILED,
      'onMemberStatusChanged',
      {memberId, operation: 'remove', ...data}
    );
  }

  // Factory methods for document operations

  /**
   * Error when document data is missing
   */
  static documentDataMissing(
    documentId: string,
    method: string
  ): OfficeRndEventError {
    return new OfficeRndEventError(
      'Document data is missing',
      OfficeRndEventErrorCode.DOCUMENT_DATA_MISSING,
      method,
      {documentId}
    );
  }

  /**
   * Error when document parsing fails
   */
  static documentParseFailed(
    documentId: string,
    method: string,
    data?: Record<string, unknown>
  ): OfficeRndEventError {
    return new OfficeRndEventError(
      'Failed to parse document data',
      OfficeRndEventErrorCode.DOCUMENT_PARSE_FAILED,
      method,
      {documentId, ...data}
    );
  }

  /**
   * Error when document validation fails
   */
  static documentValidationFailed(
    documentId: string,
    method: string,
    validationErrors: string[]
  ): OfficeRndEventError {
    return new OfficeRndEventError(
      'Document validation failed',
      OfficeRndEventErrorCode.DOCUMENT_VALIDATION_FAILED,
      method,
      {documentId, validationErrors}
    );
  }

  // Factory methods for integration errors

  /**
   * Error when external service is unavailable
   */
  static externalServiceUnavailable(
    serviceName: string,
    method: string,
    data?: Record<string, unknown>
  ): OfficeRndEventError {
    return new OfficeRndEventError(
      `External service ${serviceName} is unavailable`,
      OfficeRndEventErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
      method,
      {serviceName, ...data}
    );
  }

  /**
   * Error when integration times out
   */
  static integrationTimeout(
    serviceName: string,
    method: string,
    timeoutMs: number
  ): OfficeRndEventError {
    return new OfficeRndEventError(
      `Integration with ${serviceName} timed out`,
      OfficeRndEventErrorCode.INTEGRATION_TIMEOUT,
      method,
      {serviceName, timeoutMs}
    );
  }

  /**
   * Error when integration hits rate limit
   */
  static integrationRateLimit(
    serviceName: string,
    method: string,
    retryAfter?: number
  ): OfficeRndEventError {
    return new OfficeRndEventError(
      `Integration with ${serviceName} hit rate limit`,
      OfficeRndEventErrorCode.INTEGRATION_RATE_LIMIT,
      method,
      {serviceName, retryAfter}
    );
  }

  // Factory methods for general errors

  /**
   * Error when event handler initialization fails
   */
  static eventHandlerInitializationFailed(
    handlerName: string,
    data?: Record<string, unknown>
  ): OfficeRndEventError {
    return new OfficeRndEventError(
      'Failed to initialize event handler',
      OfficeRndEventErrorCode.EVENT_HANDLER_INITIALIZATION_FAILED,
      'initialize',
      {handlerName, ...data}
    );
  }

  /**
   * Generic error for unknown issues
   */
  static unknownError(
    method: string,
    data?: Record<string, unknown>
  ): OfficeRndEventError {
    return new OfficeRndEventError(
      'Unknown error occurred in OfficeRnd event trigger',
      OfficeRndEventErrorCode.UNKNOWN_ERROR,
      method,
      data
    );
  }
}
