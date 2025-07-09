import {AppError, ErrorCode} from '../app-error';

export class OfficeRndControllerError extends AppError {
  constructor(
    message: string,
    statusCode: number,
    method: string,
    details?: Record<string, unknown>
  ) {
    super(message, ErrorCode.OFFICERND_CONTROLLER_ERROR, statusCode, {
      method: method,
      details: details,
    });
  }
}
