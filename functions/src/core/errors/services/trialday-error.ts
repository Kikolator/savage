import {AppError, ErrorCode} from '../app-error';

export class TrialdayError extends AppError {
  constructor(message: string, method: string, data?: unknown) {
    super(message, ErrorCode.TRIALDAY_SERVICE_ERROR, 500, {method, data});
  }
}
