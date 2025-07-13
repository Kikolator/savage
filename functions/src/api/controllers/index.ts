import {RequestHandler, Router} from 'express';
import {logger} from 'firebase-functions';

import {AppError} from '../../core/errors/app-error';

export interface Controller {
  initialize(httpServer: HttpServer): void;
}

export * from './base-controller';

export class HttpServer {
  private router: Router;

  constructor(public readonly app: Router) {
    this.router = app;
  }

  get(path: string, requestHandler: RequestHandler): void {
    this.router.get(path, this._catchErrorHandler(requestHandler));
  }

  post(path: string, requestHandler: RequestHandler): void {
    this.router.post(path, this._catchErrorHandler(requestHandler));
  }

  put(path: string, requestHandler: RequestHandler): void {
    this.router.put(path, this._catchErrorHandler(requestHandler));
  }

  delete(path: string, requestHandler: RequestHandler): void {
    this.router.delete(path, this._catchErrorHandler(requestHandler));
  }

  options(path: string, requestHandler: RequestHandler): void {
    this.router.options(path, requestHandler);
  }

  //   createdVersionedRouter;
  // This allows us to create a new router for a specific version
  createdVersionedRouter(version: string): Router {
    // eslint-disable-next-line new-cap
    const versionedRouter = Router();
    this.router.use(`/v${version}`, versionedRouter);
    return versionedRouter;
  }

  // Add method to use middleware on specific routes
  useMiddleware(path: string, middleware: RequestHandler): void {
    this.router.use(path, middleware);
  }

  private _catchErrorHandler(requestHandler: RequestHandler): RequestHandler {
    return async (req, res, next) => {
      try {
        await requestHandler(req, res, next);
      } catch (error: unknown) {
        logger.error('HttpServer._catchErrorHandler(): unhandled error', {
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
          path: req.path,
          method: req.method,
        });

        if (error instanceof AppError) {
          // Use the safe JSON representation for client responses
          const errorResponse = error.toSafeJSON();
          // Add code if it exists on the error
          if ('code' in error) {
            errorResponse.code = (error as any).code;
          }
          res.status(error.status || 500).json(errorResponse);
        } else if (error instanceof Error) {
          res.status(500).json({
            name: 'InternalServerError',
            message: error.message,
            code: 1000, // UNKNOWN_ERROR
            status: 500,
            timestamp: new Date().toISOString(),
          });
        } else {
          res.status(500).json({
            name: 'InternalServerError',
            message: 'Internal Server Error',
            code: 1000, // UNKNOWN_ERROR
            status: 500,
            timestamp: new Date().toISOString(),
          });
        }
      }
    };
  }
}
