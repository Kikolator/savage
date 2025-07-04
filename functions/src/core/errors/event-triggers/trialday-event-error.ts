import {AppError, ErrorCode} from '../app-error';

export class TrialdayEventError extends AppError {
  constructor(message: string, method: string, data: unknown) {
    super(message, ErrorCode.TRIALDAY_EVENT_ERROR, 500, {
      method,
      data,
    });
  }
}
