import {AppError} from '../app-error';

export class TrialdayError extends AppError {
  public readonly code: number;

  constructor(message: string, method: string, data?: unknown) {
    super(message, 500, {method, data});
    this.code = 9600; // TRIALDAY_SERVICE_ERROR
  }
}
