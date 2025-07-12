import {AppError, ErrorCode} from '../app-error';

export enum SendgridServiceErrorCode {
  CLIENT_NOT_INITIALIZED = 'CLIENT_NOT_INITIALIZED',
  MAIL_SERVICE_NOT_INITIALIZED = 'MAIL_SERVICE_NOT_INITIALIZED',
  API_KEY_MISSING = 'API_KEY_MISSING',
  CONTACT_ADDITION_FAILED = 'CONTACT_ADDITION_FAILED',
  MAIL_SEND_FAILED = 'MAIL_SEND_FAILED',
  LISTS_FETCH_FAILED = 'LISTS_FETCH_FAILED',
  CUSTOM_FIELDS_FETCH_FAILED = 'CUSTOM_FIELDS_FETCH_FAILED',
  MEMBER_SYNC_FAILED = 'MEMBER_SYNC_FAILED',
  LIST_RESOLUTION_FAILED = 'LIST_RESOLUTION_FAILED',
  CONTACT_CREATION_FAILED = 'CONTACT_CREATION_FAILED',
  CUSTOM_FIELD_MAPPINGS_FAILED = 'CUSTOM_FIELD_MAPPINGS_FAILED',
  MEMBER_REMOVAL_FAILED = 'MEMBER_REMOVAL_FAILED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class SendgridServiceError extends AppError {
  public readonly serviceCode: SendgridServiceErrorCode;

  constructor(
    message: string,
    serviceCode: SendgridServiceErrorCode,
    status = 400,
    details?: any,
    cause?: Error
  ) {
    super(message, ErrorCode.INVALID_ARGUMENT, status, details, cause);
    this.name = 'SendgridServiceError';
    this.serviceCode = serviceCode;
  }

  static clientNotInitialized(method: string) {
    return new SendgridServiceError(
      'SendGrid client not initialized',
      SendgridServiceErrorCode.CLIENT_NOT_INITIALIZED,
      500,
      {method}
    );
  }

  static mailServiceNotInitialized(method: string) {
    return new SendgridServiceError(
      'SendGrid mail service not initialized',
      SendgridServiceErrorCode.MAIL_SERVICE_NOT_INITIALIZED,
      500,
      {method}
    );
  }

  static apiKeyMissing() {
    return new SendgridServiceError(
      'SendGrid API key is missing',
      SendgridServiceErrorCode.API_KEY_MISSING,
      500
    );
  }

  static contactAdditionFailed(
    method: string,
    statusCode: number,
    responseBody?: any,
    cause?: Error
  ) {
    return new SendgridServiceError(
      'Failed to add contact to SendGrid',
      SendgridServiceErrorCode.CONTACT_ADDITION_FAILED,
      500,
      {method, statusCode, responseBody},
      cause
    );
  }

  static mailSendFailed(
    method: string,
    statusCode: number,
    responseBody?: any,
    cause?: Error
  ) {
    return new SendgridServiceError(
      'Failed to send email via SendGrid',
      SendgridServiceErrorCode.MAIL_SEND_FAILED,
      500,
      {method, statusCode, responseBody},
      cause
    );
  }

  static listsFetchFailed(
    method: string,
    statusCode: number,
    responseBody?: any,
    cause?: Error
  ) {
    return new SendgridServiceError(
      'Failed to fetch lists from SendGrid API',
      SendgridServiceErrorCode.LISTS_FETCH_FAILED,
      500,
      {method, statusCode, responseBody},
      cause
    );
  }

  static customFieldsFetchFailed(
    method: string,
    statusCode: number,
    responseBody?: any,
    cause?: Error
  ) {
    return new SendgridServiceError(
      'Failed to fetch custom fields from SendGrid API',
      SendgridServiceErrorCode.CUSTOM_FIELDS_FETCH_FAILED,
      500,
      {method, statusCode, responseBody},
      cause
    );
  }

  static memberSyncFailed(
    method: string,
    memberId: string,
    email: string,
    cause?: Error
  ) {
    return new SendgridServiceError(
      'Failed to sync member to SendGrid',
      SendgridServiceErrorCode.MEMBER_SYNC_FAILED,
      500,
      {method, memberId, email},
      cause
    );
  }

  static listResolutionFailed(method: string, listName: string, cause?: Error) {
    return new SendgridServiceError(
      `Failed to resolve list ID for: ${listName}`,
      SendgridServiceErrorCode.LIST_RESOLUTION_FAILED,
      500,
      {method, listName},
      cause
    );
  }

  static contactCreationFailed(
    method: string,
    memberId: string,
    cause?: Error
  ) {
    return new SendgridServiceError(
      'Failed to create contact from member',
      SendgridServiceErrorCode.CONTACT_CREATION_FAILED,
      500,
      {method, memberId},
      cause
    );
  }

  static customFieldMappingsFailed(method: string, cause?: Error) {
    return new SendgridServiceError(
      'Failed to get custom field mappings',
      SendgridServiceErrorCode.CUSTOM_FIELD_MAPPINGS_FAILED,
      500,
      {method},
      cause
    );
  }

  static memberRemovalFailed(
    method: string,
    memberId: string,
    email: string,
    cause?: Error
  ) {
    return new SendgridServiceError(
      'Failed to remove member from SendGrid',
      SendgridServiceErrorCode.MEMBER_REMOVAL_FAILED,
      500,
      {method, memberId, email},
      cause
    );
  }

  static unknownError(message: string, details?: any) {
    return new SendgridServiceError(
      message,
      SendgridServiceErrorCode.UNKNOWN_ERROR,
      500,
      details
    );
  }
}
