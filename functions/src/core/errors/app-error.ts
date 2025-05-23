export enum ErrorCode {
  // Generic errors (1000-1999)
  UNKNOWN_ERROR = 1000,
  VALIDATION_ERROR = 1001,
  NOT_FOUND = 1002,
  UNAUTHORIZED = 1003,
  FORBIDDEN = 1004,

  // TrialDay Service errors (2000-2999)
  TRIALDAY_MEMBER_NOT_ALLOWED = 2000,
  TRIALDAY_ALREADY_COMPLETED = 2001,
  TRIALDAY_PENDING_EXISTS = 2002,
  TRIALDAY_NO_DESK_AVAILABLE = 2003,
  TRIALDAY_BOOKING_ERROR = 2004,


  // OfficeRnd Service errors (3000-3999)
  OFFICERND_MEMBER_NOT_FOUND = 3000,
  OFFICERND_DESK_BOOKING_FAILED = 3001,
  OFFICE_RND_MULTIPLE_MEMBERS_FOUND = 3002,
  TRIALDAY_STATUS_NOT_FOUND = 3003,

  // Sendgrid Service errors (4000-4999)
  SENDGRID_MAIL_SEND_FAILED = 4000,
  SENDGRID_CONTACT_ADD_FAILED = 4001,
  SENDGRID_LIST_NOT_FOUND = 4002,
  SENDGRID_MULTIPLE_LISTS_FOUND = 4003,

  // Google Calendar Service errors (5000-5999)
  GOOGLECAL_EVENT_CREATION_FAILED = 5000,

  // Typeform Controller errors (6000-6999)
  TYPEFORM_WEBHOOK_INVALID_SIGNATURE = 6000,
  TYPEFORM_WEBHOOK_INVALID_DATA = 6001,
  TYPEFORM_WEBHOOK_NO_HANDLER_FOUND = 6002,
  TYPEFORM_WEBHOOK_NO_RAW_BODY = 6003,

  // Firestore Service errors (7000-7999)
  DOCUMENT_NOT_FOUND = 7000,
  COLLECTION_EMPTY = 7001,
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly status: number;
  public readonly details?: unknown;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
    status = 500,
    details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
  }

  public toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      status: this.status,
      details: this.details,
    };
  }
}
