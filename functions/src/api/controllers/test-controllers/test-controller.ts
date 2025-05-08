import { RequestHandler } from 'express';
import { AppError, Controller, HttpServer } from '../index';

class TestController implements Controller {
  initialize(httpServer: HttpServer): void {
    httpServer.get('/ping', this.ping.bind(this));
  }

  // Test endpoint
  private ping: RequestHandler = async (request, response, next) => {
    try {
      response.status(200).json({
        message: 'Ping',
      });
      next();
    } catch (error) {
      if (error instanceof Error && 'status' in error) {
        const appError = error as AppError;
        next(appError);
      } else {
        const genericError = new Error('Internal Server Error') as AppError;
        genericError.status = 500;
        next(genericError);
      }
    }
  };
}

export default TestController;
