import {AppError} from '../app-error';

/**
 * FirestoreService-specific error codes.
 * These are defined in the 7000-7999 range.
 */
export enum FirestoreErrorCode {
  // Firestore Service errors (7000-7999)
  DOCUMENT_NOT_FOUND = 7000,
  COLLECTION_EMPTY = 7001,
  BATCH_OPERATION_FAILED = 7002,
  TRANSACTION_FAILED = 7003,
  QUERY_FAILED = 7004,
  DOCUMENT_CREATION_FAILED = 7005,
  DOCUMENT_UPDATE_FAILED = 7006,
  DOCUMENT_DELETION_FAILED = 7007,
  INVALID_DOCUMENT_DATA = 7008,
  CONNECTION_ERROR = 7009,
  PERMISSION_DENIED = 7010,
}

/**
 * Error class for FirestoreService operations.
 * Provides specific error handling for Firestore-related operations.
 */
export class FirestoreServiceError extends AppError {
  public readonly code: number;

  constructor(
    message: string,
    code: FirestoreErrorCode = FirestoreErrorCode.DOCUMENT_NOT_FOUND,
    status = 500,
    details?: unknown,
    cause?: Error
  ) {
    super(message, status, details, cause);
    this.name = 'FirestoreServiceError';
    this.code = code;
  }

  /**
   * Creates a FirestoreServiceError with additional context.
   * @param additionalDetails - Additional context to add
   * @returns New FirestoreServiceError instance with combined details
   */
  public withDetails(additionalDetails: unknown): FirestoreServiceError {
    const combinedDetails = {
      ...((this.details as Record<string, unknown>) || {}),
      ...((additionalDetails as Record<string, unknown>) || {}),
    };

    return new FirestoreServiceError(
      this.message,
      this.code,
      this.status,
      combinedDetails,
      this
    );
  }

  /**
   * Creates a FirestoreServiceError with a different message.
   * @param newMessage - The new error message
   * @returns New FirestoreServiceError instance with the updated message
   */
  public withMessage(newMessage: string): FirestoreServiceError {
    return new FirestoreServiceError(
      newMessage,
      this.code,
      this.status,
      this.details,
      this
    );
  }

  /**
   * Static factory method for document not found errors.
   * @param collection - The collection name
   * @param documentId - The document ID
   * @param cause - The original error
   * @returns FirestoreServiceError instance
   */
  static documentNotFound(
    collection: string,
    documentId: string,
    cause?: Error
  ): FirestoreServiceError {
    return new FirestoreServiceError(
      `Document not found in collection '${collection}' with ID '${documentId}'`,
      FirestoreErrorCode.DOCUMENT_NOT_FOUND,
      404,
      {collection, documentId},
      cause
    );
  }

  /**
   * Static factory method for batch operation failures.
   * @param operation - The batch operation that failed
   * @param cause - The original error
   * @returns FirestoreServiceError instance
   */
  static batchOperationFailed(
    operation: string,
    cause?: Error
  ): FirestoreServiceError {
    return new FirestoreServiceError(
      `Batch operation '${operation}' failed`,
      FirestoreErrorCode.BATCH_OPERATION_FAILED,
      500,
      {operation},
      cause
    );
  }

  /**
   * Static factory method for transaction failures.
   * @param operation - The transaction operation that failed
   * @param cause - The original error
   * @returns FirestoreServiceError instance
   */
  static transactionFailed(
    operation: string,
    cause?: Error
  ): FirestoreServiceError {
    return new FirestoreServiceError(
      `Transaction '${operation}' failed`,
      FirestoreErrorCode.TRANSACTION_FAILED,
      500,
      {operation},
      cause
    );
  }

  /**
   * Static factory method for query failures.
   * @param collection - The collection name
   * @param filters - The query filters
   * @param cause - The original error
   * @returns FirestoreServiceError instance
   */
  static queryFailed(
    collection: string,
    filters: unknown,
    cause?: Error
  ): FirestoreServiceError {
    return new FirestoreServiceError(
      `Query failed on collection '${collection}'`,
      FirestoreErrorCode.QUERY_FAILED,
      500,
      {collection, filters},
      cause
    );
  }

  /**
   * Static factory method for document creation failures.
   * @param collection - The collection name
   * @param documentId - The document ID
   * @param cause - The original error
   * @returns FirestoreServiceError instance
   */
  static documentCreationFailed(
    collection: string,
    documentId: string,
    cause?: Error
  ): FirestoreServiceError {
    return new FirestoreServiceError(
      `Failed to create document in collection '${collection}' with ID '${documentId}'`,
      FirestoreErrorCode.DOCUMENT_CREATION_FAILED,
      500,
      {collection, documentId},
      cause
    );
  }

  /**
   * Static factory method for permission denied errors.
   * @param operation - The operation that was denied
   * @param collection - The collection name
   * @param cause - The original error
   * @returns FirestoreServiceError instance
   */
  static permissionDenied(
    operation: string,
    collection: string,
    cause?: Error
  ): FirestoreServiceError {
    return new FirestoreServiceError(
      `Permission denied for ${operation} operation on collection '${collection}'`,
      FirestoreErrorCode.PERMISSION_DENIED,
      403,
      {operation, collection},
      cause
    );
  }

  /**
   * Static factory method for empty collection errors.
   * @param collection - The collection name
   * @param documentId - The parent document ID (for subcollections)
   * @param subCollection - The subcollection name (for subcollections)
   * @param cause - The original error
   * @returns FirestoreServiceError instance
   */
  static collectionEmpty(
    collection: string,
    documentId?: string,
    subCollection?: string,
    cause?: Error
  ): FirestoreServiceError {
    const details: Record<string, unknown> = {collection};
    if (documentId) details.documentId = documentId;
    if (subCollection) details.subCollection = subCollection;

    return new FirestoreServiceError(
      `Collection '${collection}' is empty`,
      FirestoreErrorCode.COLLECTION_EMPTY,
      404,
      details,
      cause
    );
  }

  /**
   * Static factory method for validation errors (e.g., missing parameters).
   * @param message - The error message
   * @param details - Additional error details
   * @returns FirestoreServiceError instance
   */
  static validationError(
    message: string,
    details?: unknown
  ): FirestoreServiceError {
    return new FirestoreServiceError(
      message,
      FirestoreErrorCode.INVALID_DOCUMENT_DATA,
      400,
      details
    );
  }
}
