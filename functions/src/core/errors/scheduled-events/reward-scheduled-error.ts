/**
 * Specific error codes for Reward scheduled event operations
 */
export enum RewardScheduledEventErrorCode {
  // Reward processing errors (10001-10099)
  REWARD_PROCESSING_FAILED = 10001,
  DUE_REWARDS_FETCH_FAILED = 10002,
  REWARD_CALCULATION_FAILED = 10003,

  // Service integration errors (10101-10199)
  REWARD_SERVICE_FAILED = 10101,
  SERVICE_RESOLVER_FAILED = 10102,

  // General scheduled event errors (10901-10999)
  UNKNOWN_ERROR = 10999,
}

import {BaseScheduledEventError} from './base-scheduled-event-error';

export class RewardScheduledEventError extends BaseScheduledEventError {
  public readonly scheduledEventCode: RewardScheduledEventErrorCode;

  constructor(
    message: string,
    functionName: string,
    scheduledEventCode: RewardScheduledEventErrorCode = RewardScheduledEventErrorCode.UNKNOWN_ERROR,
    details?: Record<string, unknown>
  ) {
    super(message, scheduledEventCode, functionName, details);
    this.scheduledEventCode = scheduledEventCode;
  }

  /**
   * Error when reward processing fails
   */
  static rewardProcessingFailed(
    functionName: string,
    details?: Record<string, unknown>
  ): RewardScheduledEventError {
    return new RewardScheduledEventError(
      'Failed to process due rewards',
      functionName,
      RewardScheduledEventErrorCode.REWARD_PROCESSING_FAILED,
      details
    );
  }

  /**
   * Error when due rewards fetch fails
   */
  static dueRewardsFetchFailed(
    functionName: string,
    details?: Record<string, unknown>
  ): RewardScheduledEventError {
    return new RewardScheduledEventError(
      'Failed to fetch due rewards',
      functionName,
      RewardScheduledEventErrorCode.DUE_REWARDS_FETCH_FAILED,
      details
    );
  }

  /**
   * Error when reward calculation fails
   */
  static rewardCalculationFailed(
    functionName: string,
    details?: Record<string, unknown>
  ): RewardScheduledEventError {
    return new RewardScheduledEventError(
      'Failed to calculate rewards',
      functionName,
      RewardScheduledEventErrorCode.REWARD_CALCULATION_FAILED,
      details
    );
  }

  /**
   * Error when reward service fails
   */
  static rewardServiceFailed(
    functionName: string,
    details?: Record<string, unknown>
  ): RewardScheduledEventError {
    return new RewardScheduledEventError(
      'Reward service operation failed',
      functionName,
      RewardScheduledEventErrorCode.REWARD_SERVICE_FAILED,
      details
    );
  }

  /**
   * Error when service resolver fails
   */
  static serviceResolverFailed(
    functionName: string,
    details?: Record<string, unknown>
  ): RewardScheduledEventError {
    return new RewardScheduledEventError(
      'Failed to resolve service dependencies',
      functionName,
      RewardScheduledEventErrorCode.SERVICE_RESOLVER_FAILED,
      details
    );
  }

  /**
   * Generic error for unknown issues
   */
  static unknownError(
    functionName: string,
    details?: Record<string, unknown>
  ): RewardScheduledEventError {
    return new RewardScheduledEventError(
      'Unknown error occurred in Reward scheduled event',
      functionName,
      RewardScheduledEventErrorCode.UNKNOWN_ERROR,
      details
    );
  }
}
