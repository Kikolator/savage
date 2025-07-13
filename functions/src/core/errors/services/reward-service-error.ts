import {AppError} from '../app-error';

export enum RewardServiceErrorCode {
  INVALID_REFERRAL_STATUS = 'INVALID_REFERRAL_STATUS',
  MISSING_SUBSCRIPTION_VALUE = 'MISSING_SUBSCRIPTION_VALUE',
  INVALID_PAYOUT_CHANNEL = 'INVALID_PAYOUT_CHANNEL',
  PAYOUT_FAILED = 'PAYOUT_FAILED',
  DOCUMENT_NOT_FOUND = 'DOCUMENT_NOT_FOUND',
  DATA_UNDEFINED = 'DATA_UNDEFINED',
  BATCH_OPERATION_FAILED = 'BATCH_OPERATION_FAILED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class RewardServiceError extends AppError {
  public readonly serviceCode: RewardServiceErrorCode;
  public readonly code: number;

  constructor(
    message: string,
    serviceCode: RewardServiceErrorCode,
    status = 400,
    details?: any,
    cause?: Error
  ) {
    super(message, status, details, cause);
    this.name = 'RewardServiceError';
    this.serviceCode = serviceCode;
    this.code = 9400; // REWARD_SERVICE_ERROR
  }

  static invalidReferralStatus(referralId: string, currentStatus: string) {
    return new RewardServiceError(
      `Referral ${referralId} is not in CONVERTED status`,
      RewardServiceErrorCode.INVALID_REFERRAL_STATUS,
      400,
      {referralId, currentStatus}
    );
  }

  static missingSubscriptionValue(referralId: string) {
    return new RewardServiceError(
      `Referral ${referralId} has no subscriptionValue - cannot create reward`,
      RewardServiceErrorCode.MISSING_SUBSCRIPTION_VALUE,
      400,
      {referralId}
    );
  }

  static invalidPayoutChannel(payoutChannel: string) {
    return new RewardServiceError(
      `Invalid payout channel: ${payoutChannel}`,
      RewardServiceErrorCode.INVALID_PAYOUT_CHANNEL,
      400,
      {payoutChannel}
    );
  }

  static payoutFailed(rewardId: string, error: string) {
    return new RewardServiceError(
      `Payout failed for reward ${rewardId}`,
      RewardServiceErrorCode.PAYOUT_FAILED,
      500,
      {rewardId, error}
    );
  }

  static documentNotFound(collection: string, id: string) {
    return new RewardServiceError(
      `Document not found in ${collection}: ${id}`,
      RewardServiceErrorCode.DOCUMENT_NOT_FOUND,
      404
    );
  }

  static dataUndefined(message: string) {
    return new RewardServiceError(
      message,
      RewardServiceErrorCode.DATA_UNDEFINED,
      400
    );
  }

  static batchOperationFailed(operation: string, error: string) {
    return new RewardServiceError(
      `Batch operation failed: ${operation}`,
      RewardServiceErrorCode.BATCH_OPERATION_FAILED,
      500,
      {operation, error}
    );
  }

  static unknownError(message: string, details?: any) {
    return new RewardServiceError(
      message,
      RewardServiceErrorCode.UNKNOWN_ERROR,
      500,
      details
    );
  }
}
