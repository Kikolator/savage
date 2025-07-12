import {AppError, ErrorCode} from '../app-error';

/**
 * Specific error codes for Trialday event trigger operations
 */
export enum TrialdayEventErrorCode {
  // Event handling errors (8001-8099)
  EVENT_HANDLER_FAILED = 8001,
  INVALID_EVENT_DATA = 8002,
  STATUS_TRANSITION_FAILED = 8003,

  // General event trigger errors (8901-8999)
  UNKNOWN_ERROR = 8999,
}

export class TrialdayEventError extends AppError {
  public readonly eventCode: TrialdayEventErrorCode;

  constructor(
    message: string,
    eventCode: TrialdayEventErrorCode = TrialdayEventErrorCode.UNKNOWN_ERROR,
    method: string,
    data?: unknown
  ) {
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

  /**
   * Error when event handler fails
   */
  static eventHandlerFailed(
    method: string,
    data?: Record<string, unknown>
  ): TrialdayEventError {
    return new TrialdayEventError(
      'Failed to handle trialday event',
      TrialdayEventErrorCode.EVENT_HANDLER_FAILED,
      method,
      data
    );
  }

  /**
   * Error when event data is invalid
   */
  static invalidEventData(
    method: string,
    data?: Record<string, unknown>
  ): TrialdayEventError {
    return new TrialdayEventError(
      'Invalid trialday event data',
      TrialdayEventErrorCode.INVALID_EVENT_DATA,
      method,
      data
    );
  }

  /**
   * Error when status transition fails
   */
  static statusTransitionFailed(
    method: string,
    data?: Record<string, unknown>
  ): TrialdayEventError {
    return new TrialdayEventError(
      'Failed to transition trialday status',
      TrialdayEventErrorCode.STATUS_TRANSITION_FAILED,
      method,
      data
    );
  }
}
