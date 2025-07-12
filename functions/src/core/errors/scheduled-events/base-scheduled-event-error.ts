import {AppError, ErrorCode} from '../app-error';

/**
 * Base error class for scheduled events.
 * Scheduled events don't return HTTP responses, so we don't need status codes.
 */
export abstract class BaseScheduledEventError extends AppError {
  constructor(
    message: string,
    localErrorCode: number,
    functionName: string,
    details?: Record<string, unknown>
  ) {
    // Use 0 as status since it's not relevant for scheduled events
    const errorDetails = {
      functionName,
      scheduledEvent: true,
      localErrorCode,
      ...details,
    };

    // Cast local error code to global ErrorCode for compatibility
    // TODO: Remove this cast when AppError is updated to support local error codes
    super(message, localErrorCode as unknown as ErrorCode, 0, errorDetails);
  }

  /**
   * Creates a standardized error object for Firestore logging
   */
  public toFirestoreError(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      functionName: (this.details as Record<string, unknown>)?.functionName,
      localErrorCode: (this.details as Record<string, unknown>)?.localErrorCode,
      timestamp: this.timestamp.toISOString(),
      details: this.details,
    };
  }
}
