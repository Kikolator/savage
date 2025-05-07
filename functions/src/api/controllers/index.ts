import { RequestHandler, Router } from 'express';
import { logger } from 'firebase-functions';

export interface Controller {
    initialize(httpServer: HttpServer) : void;
}

export class AppError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
    this.name = 'AppError';
  }
}

export class HttpServer {
  private router: Router;

  constructor( public readonly app: Router) {
    this.router = app;
  }

  get(path: string, requestHandler: RequestHandler): void {
    logger.debug(`GET ${path}`);
    this.router.get(path, this._catchErrorHandler(requestHandler));
  }

  post(path: string, requestHandler: RequestHandler): void {
    logger.debug(`POST ${path}`);
    this.router.post(path, this._catchErrorHandler(requestHandler));
  }

  put(path: string, requestHandler: RequestHandler): void {
    logger.debug(`PUT ${path}`);
    this.router.put(path, this._catchErrorHandler(requestHandler));
  }

  delete(path: string, requestHandler: RequestHandler): void {
    logger.debug(`DELETE ${path}`);
    this.router.delete(path, this._catchErrorHandler(requestHandler));
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
        logger.error(error);
        if (error instanceof AppError) {
          res.status(error.status || 500).json({
            message: error.message,
          });
        } else if (error instanceof Error) {
          res.status(500).json({
            message: error.message,
          });
        } else {
          res.status(500).json({
            message: 'Internal Server Error',
          });
        }
      }
    };
  }
}
