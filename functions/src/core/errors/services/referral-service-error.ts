import {AppError, ErrorCode} from '../app-error';

export enum ReferralServiceErrorCode {
  NO_PERMISSION = 'NO_PERMISSION',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  UNIQUE_CODE_FAILED = 'UNIQUE_CODE_FAILED',
  INVALID_ARGUMENT = 'INVALID_ARGUMENT',
  DOCUMENT_NOT_FOUND = 'DOCUMENT_NOT_FOUND',
  REFERRAL_CODE_NOT_FOUND = 'REFERRAL_CODE_NOT_FOUND',
  ALREADY_REFFERED = 'ALREADY_REFFERED',
  SELF_REFERRAL = 'SELF_REFERRAL',
  ALREADY_REFFERED_OTHER = 'ALREADY_REFFERED_OTHER',
  DATA_UNDEFINED = 'DATA_UNDEFINED',
  NOT_ELIGIBLE_FOR_CONVERSION = 'NOT_ELIGIBLE_FOR_CONVERSION',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class ReferralServiceError extends AppError {
  public readonly serviceCode: ReferralServiceErrorCode;

  constructor(
    message: string,
    serviceCode: ReferralServiceErrorCode,
    status = 400,
    details?: any,
    cause?: Error
  ) {
    super(message, ErrorCode.INVALID_ARGUMENT, status, details, cause);
    this.name = 'ReferralServiceError';
    this.serviceCode = serviceCode;
  }

  static noPermission() {
    return new ReferralServiceError(
      'Referrer does not have permission to create referral code',
      ReferralServiceErrorCode.NO_PERMISSION,
      400
    );
  }

  static alreadyExists() {
    return new ReferralServiceError(
      'Referrer already has a referral code',
      ReferralServiceErrorCode.ALREADY_EXISTS,
      400
    );
  }

  static uniqueCodeFailed() {
    return new ReferralServiceError(
      'Failed to generate unique referral code after maximum attempts',
      ReferralServiceErrorCode.UNIQUE_CODE_FAILED,
      500
    );
  }

  static invalidArgument(message: string, details?: any) {
    return new ReferralServiceError(
      message,
      ReferralServiceErrorCode.INVALID_ARGUMENT,
      400,
      details
    );
  }

  static documentNotFound(collection: string, id: string) {
    return new ReferralServiceError(
      `Document not found in ${collection}: ${id}`,
      ReferralServiceErrorCode.DOCUMENT_NOT_FOUND,
      404
    );
  }

  static referralCodeNotFound(code: string) {
    return new ReferralServiceError(
      `Referral code not found: ${code}`,
      ReferralServiceErrorCode.REFERRAL_CODE_NOT_FOUND,
      404
    );
  }

  static alreadyReferred() {
    return new ReferralServiceError(
      'User already referred with this code',
      ReferralServiceErrorCode.ALREADY_REFFERED,
      400
    );
  }

  static selfReferral() {
    return new ReferralServiceError(
      'Referrer cannot be the same as the referred user',
      ReferralServiceErrorCode.SELF_REFERRAL,
      400
    );
  }

  static alreadyReferredOther(referralCode: string) {
    return new ReferralServiceError(
      'User already referred with another code',
      ReferralServiceErrorCode.ALREADY_REFFERED_OTHER,
      400,
      {referralCode}
    );
  }

  static dataUndefined(message: string) {
    return new ReferralServiceError(
      message,
      ReferralServiceErrorCode.DATA_UNDEFINED,
      400
    );
  }

  static notEligibleForConversion(currentStatus: string) {
    return new ReferralServiceError(
      'Referral not eligible for conversion',
      ReferralServiceErrorCode.NOT_ELIGIBLE_FOR_CONVERSION,
      400,
      {currentStatus}
    );
  }

  static unknownError(message: string, details?: any) {
    return new ReferralServiceError(
      message,
      ReferralServiceErrorCode.UNKNOWN_ERROR,
      500,
      details
    );
  }
}
