import {AppError, ErrorCode} from '../app-error';

export class OfficeRndScheduledEventError extends AppError {
  constructor(
    message: string,
    functionName: string,
    data: Record<string, unknown>
  ) {
    super(message, ErrorCode.OFFICE_RND_SCHEDULED_EVENT_ERROR, 500, {
      functionName,
      data,
    });
  }
}
