import { RequestHandler } from 'express';
import { Controller, HttpServer } from '../index';
import { AppError, ErrorCode } from '../../../core/errors/app-error';
import { logger } from 'firebase-functions';

class TestController implements Controller {
  initialize(httpServer: HttpServer): void {
    httpServer.get('/ping', this.ping.bind(this));
  }

  // Test endpoint
  private ping: RequestHandler = async (request, response, next) => {
    try {
      logger.debug('TestController.ping()- Pong');
      response.status(200).json({
        message: 'Pong',
      });
      next();
    } catch (error) {
      if (error instanceof Error && 'status' in error) {
        const appError = error as AppError;
        next(appError);
      } else {
        const genericError = new AppError('Internal Server Error', ErrorCode.UNKNOWN_ERROR, 500);
        next(genericError);
      }
    }
  };
}

export default TestController;
