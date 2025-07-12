import {AppError, ErrorCode} from '../app-error';

export enum OfficeRnDServiceErrorCode {
  MEMBER_NOT_FOUND = 'MEMBER_NOT_FOUND',
  DESK_BOOKING_FAILED = 'DESK_BOOKING_FAILED',
  MULTIPLE_MEMBERS_FOUND = 'MULTIPLE_MEMBERS_FOUND',
  TRIALDAY_STATUS_NOT_FOUND = 'TRIALDAY_STATUS_NOT_FOUND',
  UNKNOWN_EVENT = 'UNKNOWN_EVENT',
  WEBHOOK_INVALID_SIGNATURE = 'WEBHOOK_INVALID_SIGNATURE',
  TOKEN_INITIALIZATION_FAILED = 'TOKEN_INITIALIZATION_FAILED',
  API_REQUEST_FAILED = 'API_REQUEST_FAILED',
  MEMBER_UPDATE_FAILED = 'MEMBER_UPDATE_FAILED',
  OPPORTUNITY_UPDATE_FAILED = 'OPPORTUNITY_UPDATE_FAILED',
  PAYMENT_LINE_CREATION_FAILED = 'PAYMENT_LINE_CREATION_FAILED',
  PAGINATION_FAILED = 'PAGINATION_FAILED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  SECRET_KEY_EMPTY = 'SECRET_KEY_EMPTY',
  OAUTH_TOKEN_FAILED = 'OAUTH_TOKEN_FAILED',
  TOKEN_REFRESH_FAILED = 'TOKEN_REFRESH_FAILED',
  MEMBER_CREATION_FAILED = 'MEMBER_CREATION_FAILED',
  OPPORTUNITY_STATUSES_FETCH_FAILED = 'OPPORTUNITY_STATUSES_FETCH_FAILED',
  OPPORTUNITY_CREATION_FAILED = 'OPPORTUNITY_CREATION_FAILED',
  PAYMENT_ADDITION_FAILED = 'PAYMENT_ADDITION_FAILED',
  FEE_CREATION_FAILED = 'FEE_CREATION_FAILED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class OfficeRnDServiceError extends AppError {
  public readonly serviceCode: OfficeRnDServiceErrorCode;

  constructor(
    message: string,
    serviceCode: OfficeRnDServiceErrorCode,
    status = 400,
    details?: any,
    cause?: Error
  ) {
    super(message, ErrorCode.INVALID_ARGUMENT, status, details, cause);
    this.name = 'OfficeRnDServiceError';
    this.serviceCode = serviceCode;
  }

  static memberNotFound(memberId: string, details?: any) {
    return new OfficeRnDServiceError(
      `Member not found: ${memberId}`,
      OfficeRnDServiceErrorCode.MEMBER_NOT_FOUND,
      404,
      {memberId, ...details}
    );
  }

  static deskBookingFailed(memberId: string, error: string) {
    return new OfficeRnDServiceError(
      `Desk booking failed for member ${memberId}`,
      OfficeRnDServiceErrorCode.DESK_BOOKING_FAILED,
      500,
      {memberId, error}
    );
  }

  static multipleMembersFound(query: string) {
    return new OfficeRnDServiceError(
      `Multiple members found for query: ${query}`,
      OfficeRnDServiceErrorCode.MULTIPLE_MEMBERS_FOUND,
      400,
      {query}
    );
  }

  static trialdayStatusNotFound(status: string) {
    return new OfficeRnDServiceError(
      `Trialday status not found: ${status}`,
      OfficeRnDServiceErrorCode.TRIALDAY_STATUS_NOT_FOUND,
      404,
      {status}
    );
  }

  static unknownEvent(eventType: string) {
    return new OfficeRnDServiceError(
      `Unknown event type: ${eventType}`,
      OfficeRnDServiceErrorCode.UNKNOWN_EVENT,
      400,
      {eventType}
    );
  }

  static webhookInvalidSignature() {
    return new OfficeRnDServiceError(
      'Invalid webhook signature',
      OfficeRnDServiceErrorCode.WEBHOOK_INVALID_SIGNATURE,
      401
    );
  }

  static tokenInitializationFailed(
    method: string,
    details?: any,
    cause?: Error
  ) {
    return new OfficeRnDServiceError(
      'Failed to initialize OfficeRnD token',
      OfficeRnDServiceErrorCode.TOKEN_INITIALIZATION_FAILED,
      500,
      {method, ...details},
      cause
    );
  }

  static apiRequestFailed(
    method: string,
    endpoint: string,
    status: number,
    body?: any
  ) {
    return new OfficeRnDServiceError(
      `OfficeRnD API request failed: ${endpoint}`,
      OfficeRnDServiceErrorCode.API_REQUEST_FAILED,
      status,
      {method, endpoint, status, body}
    );
  }

  static memberUpdateFailed(
    method: string,
    memberId: string,
    body?: any,
    cause?: Error
  ) {
    return new OfficeRnDServiceError(
      `Failed to update member ${memberId}`,
      OfficeRnDServiceErrorCode.MEMBER_UPDATE_FAILED,
      500,
      {method, memberId, body},
      cause
    );
  }

  static opportunityUpdateFailed(
    method: string,
    opportunityId: string,
    status?: number,
    body?: any,
    cause?: Error
  ) {
    return new OfficeRnDServiceError(
      `Failed to update opportunity ${opportunityId}`,
      OfficeRnDServiceErrorCode.OPPORTUNITY_UPDATE_FAILED,
      500,
      {method, opportunityId, status, body},
      cause
    );
  }

  static paymentLineCreationFailed(opportunityId: string, error: string) {
    return new OfficeRnDServiceError(
      `Failed to create payment line for opportunity ${opportunityId}`,
      OfficeRnDServiceErrorCode.PAYMENT_LINE_CREATION_FAILED,
      500,
      {opportunityId, error}
    );
  }

  // New factory methods for missing functionality

  static paginationFailed(endpoint: string, details?: any, cause?: Error) {
    return new OfficeRnDServiceError(
      `Pagination failed for endpoint: ${endpoint}`,
      OfficeRnDServiceErrorCode.PAGINATION_FAILED,
      500,
      {endpoint, ...details},
      cause
    );
  }

  static tokenExpired() {
    return new OfficeRnDServiceError(
      'OfficeRnD token has expired',
      OfficeRnDServiceErrorCode.TOKEN_EXPIRED,
      401
    );
  }

  static secretKeyEmpty() {
    return new OfficeRnDServiceError(
      'OfficeRnD secret key is empty or null',
      OfficeRnDServiceErrorCode.SECRET_KEY_EMPTY,
      500
    );
  }

  static oauthTokenFailed(body: any) {
    return new OfficeRnDServiceError(
      'Failed to obtain OAuth token from OfficeRnD',
      OfficeRnDServiceErrorCode.OAUTH_TOKEN_FAILED,
      500,
      {body}
    );
  }

  static tokenRefreshFailed(details?: any, cause?: Error) {
    return new OfficeRnDServiceError(
      'Failed to refresh OfficeRnD token',
      OfficeRnDServiceErrorCode.TOKEN_REFRESH_FAILED,
      500,
      details,
      cause
    );
  }

  static memberCreationFailed(
    method: string,
    member: any,
    body?: any,
    cause?: Error
  ) {
    return new OfficeRnDServiceError(
      'Failed to create member in OfficeRnD',
      OfficeRnDServiceErrorCode.MEMBER_CREATION_FAILED,
      500,
      {method, member, body},
      cause
    );
  }

  static opportunityStatusesFetchFailed(
    method: string,
    status?: number,
    body?: any,
    cause?: Error
  ) {
    return new OfficeRnDServiceError(
      'Failed to fetch opportunity statuses from OfficeRnD',
      OfficeRnDServiceErrorCode.OPPORTUNITY_STATUSES_FETCH_FAILED,
      500,
      {method, status, body},
      cause
    );
  }

  static opportunityCreationFailed(
    method: string,
    opportunity: any,
    status?: number,
    body?: any,
    cause?: Error
  ) {
    return new OfficeRnDServiceError(
      'Failed to create opportunity in OfficeRnD',
      OfficeRnDServiceErrorCode.OPPORTUNITY_CREATION_FAILED,
      500,
      {method, opportunity, status, body},
      cause
    );
  }

  static paymentAdditionFailed(
    method: string,
    memberId: string,
    status?: number,
    body?: any,
    cause?: Error
  ) {
    return new OfficeRnDServiceError(
      `Failed to add payment for member ${memberId}`,
      OfficeRnDServiceErrorCode.PAYMENT_ADDITION_FAILED,
      500,
      {method, memberId, status, body},
      cause
    );
  }

  static feeCreationFailed(
    method: string,
    feeName: string,
    memberId: string,
    status?: number,
    body?: any,
    cause?: Error
  ) {
    return new OfficeRnDServiceError(
      `Failed to create fee ${feeName} for member ${memberId}`,
      OfficeRnDServiceErrorCode.FEE_CREATION_FAILED,
      500,
      {method, feeName, memberId, status, body},
      cause
    );
  }

  static unknownError(message: string, details?: any) {
    return new OfficeRnDServiceError(
      message,
      OfficeRnDServiceErrorCode.UNKNOWN_ERROR,
      500,
      details
    );
  }
}
