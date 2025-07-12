export enum ErrorCode {
  // Generic errors (1000-1999)
  UNKNOWN_ERROR = 1000,
  VALIDATION_ERROR = 1001,
  NOT_FOUND = 1002,
  UNAUTHORIZED = 1003,
  FORBIDDEN = 1004,
  INVALID_ARGUMENT = 1005,

  // Google Calendar Service errors (5000-5999)
  GOOGLECAL_EVENT_CREATION_FAILED = 5000,

  // Typeform Controller errors (6000-6999)
  TYPEFORM_WEBHOOK_INVALID_SIGNATURE = 6000,
  TYPEFORM_WEBHOOK_INVALID_DATA = 6001,
  TYPEFORM_WEBHOOK_NO_HANDLER_FOUND = 6002,
  TYPEFORM_WEBHOOK_NO_RAW_BODY = 6003,

  // Extended errors (9000-9999)
  EMAIL_CONFIRMATION_ERROR = 9010,
  TRIALDAY_EVENT_ERROR = 9011,
}

/**
 * Base error class for all application errors.
 * Provides consistent error handling with proper error chaining and context.
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly status: number;
  public readonly details?: unknown;
  public readonly timestamp: Date;
  public readonly cause?: Error;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
    status = 500,
    details?: unknown,
    cause?: Error
  ) {
    // Ensure proper error inheritance
    super(message);

    // Set the name for proper instanceof checks
    this.name = this.constructor.name;

    // Set properties
    this.code = code;
    this.status = status;
    this.details = details;
    this.timestamp = new Date();
    this.cause = cause;

    // Ensure proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Creates a JSON representation of the error for logging/API responses.
   * @returns Serialized error object
   */
  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      status: this.status,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
      cause: this.cause
        ? {
            name: this.cause.name,
            message: this.cause.message,
            stack: this.cause.stack,
          }
        : undefined,
    };
  }

  /**
   * Creates a simplified JSON representation for API responses.
   * Excludes sensitive information like stack traces.
   * @returns Safe error object for client consumption
   */
  public toSafeJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      status: this.status,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
    };
  }

  /**
   * Checks if this error is of a specific type.
   * Useful for error handling and type guards.
   * @param errorClass - The error class to check against
   * @returns True if the error is an instance of the specified class
   */
  public isInstanceOf<T extends AppError>(
    errorClass: new (...args: any[]) => T
  ): this is T {
    return this instanceof errorClass;
  }

  /**
   * Creates a new error with additional context.
   * Useful for adding context while preserving the original error.
   * @param additionalDetails - Additional context to add
   * @returns New error instance with combined details
   */
  public withDetails(additionalDetails: unknown): AppError {
    const combinedDetails = {
      ...((this.details as Record<string, unknown>) || {}),
      ...((additionalDetails as Record<string, unknown>) || {}),
    };

    return new AppError(
      this.message,
      this.code,
      this.status,
      combinedDetails,
      this
    );
  }

  /**
   * Creates a new error with a different message.
   * Useful for providing more user-friendly error messages.
   * @param newMessage - The new error message
   * @returns New error instance with the updated message
   */
  public withMessage(newMessage: string): AppError {
    return new AppError(newMessage, this.code, this.status, this.details, this);
  }

  /**
   * Gets the full error chain as an array.
   * Useful for debugging and logging.
   * @returns Array of errors in the chain
   */
  public getErrorChain(): Error[] {
    const chain: Error[] = [this];
    let currentError: Error | undefined = this.cause;

    while (currentError) {
      chain.push(currentError);
      currentError =
        currentError instanceof AppError ? currentError.cause : undefined;
    }

    return chain;
  }

  /**
   * Gets the root cause of the error chain.
   * @returns The original error that started the chain
   */
  public getRootCause(): Error {
    const chain = this.getErrorChain();
    return chain[chain.length - 1];
  }
}
