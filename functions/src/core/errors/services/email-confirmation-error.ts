import {AppError, ErrorCode} from '../app-error';

export class EmailConfirmationError extends AppError {
  constructor(message: string, id?: string, email?: string, error?: string) {
    super(
      message,
      ErrorCode.EMAIL_CONFIRMATION_ERROR,
      500,
      `Document id: ${id} | Email: ${email} | Error: ${error}`
    );
  }
}
