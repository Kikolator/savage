import {Request, Response, NextFunction} from 'express';
import {logger} from 'firebase-functions';

import {AppError} from '../../core/errors/app-error';

import {HttpServer} from './index';

export interface Controller {
  initialize(httpServer: HttpServer): void;
}

/**
 * Base controller class that provides common functionality for all controllers
 * - Consistent logging with structured data
 * - Error handling utilities
 * - Request/response helpers
 */
export abstract class BaseController implements Controller {
  protected readonly controllerName: string;

  constructor() {
    this.controllerName = this.constructor.name;
  }

  abstract initialize(httpServer: HttpServer): void;

  /**
   * Logs an info message with controller context
   */
  protected logInfo(message: string, data?: Record<string, unknown>): void {
    logger.info(`${this.controllerName}: ${message}`, {
      controller: this.controllerName,
      ...data,
    });
  }

  /**
   * Logs a warning message with controller context
   */
  protected logWarn(message: string, data?: Record<string, unknown>): void {
    logger.warn(`${this.controllerName}: ${message}`, {
      controller: this.controllerName,
      ...data,
    });
  }

  /**
   * Logs an error message with controller context
   */
  protected logError(
    message: string,
    error?: unknown,
    data?: Record<string, unknown>
  ): void {
    logger.error(`${this.controllerName}: ${message}`, {
      controller: this.controllerName,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      ...data,
    });
  }

  /**
   * Logs a debug message with controller context
   */
  protected logDebug(message: string, data?: Record<string, unknown>): void {
    logger.debug(`${this.controllerName}: ${message}`, {
      controller: this.controllerName,
      ...data,
    });
  }

  /**
   * Creates a request handler with automatic error handling and logging
   */
  protected createHandler(
    handler: (req: Request, res: Response, next: NextFunction) => Promise<void>
  ) {
    return async (
      req: Request,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const startTime = Date.now();
      const method = `${this.controllerName}.${handler.name}`;

      try {
        this.logDebug(`${method}: request started`, {
          method: req.method,
          path: req.path,
          query: req.query,
          body: req.body,
          headers: this.sanitizeHeaders(req.headers),
        });

        await handler(req, res, next);

        const duration = Date.now() - startTime;
        this.logInfo(`${method}: request completed`, {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
        });
      } catch (error) {
        const duration = Date.now() - startTime;
        this.logError(`${method}: request failed`, error, {
          method: req.method,
          path: req.path,
          duration,
        });

        // Ensure error is passed to error handling middleware
        next(error);
      }
    };
  }

  /**
   * Sanitizes headers for logging (removes sensitive data)
   */
  private sanitizeHeaders(
    headers: Record<string, unknown>
  ): Record<string, unknown> {
    const sanitized = {...headers};
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'savage-secret',
    ];

    sensitiveHeaders.forEach((header) => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Validates required request body parameters
   */
  protected validateRequiredParams(
    body: Record<string, unknown>,
    requiredParams: string[],
    method: string
  ): void {
    const missingParams = requiredParams.filter((param) => !body[param]);

    if (missingParams.length > 0) {
      throw new AppError(
        `Missing required parameters: ${missingParams.join(', ')}`,
        400,
        {method, missingParams}
      );
    }
  }

  /**
   * Validates required request query parameters
   */
  protected validateRequiredQuery(
    query: Record<string, unknown>,
    requiredParams: string[],
    method: string
  ): void {
    const missingParams = requiredParams.filter((param) => !query[param]);

    if (missingParams.length > 0) {
      throw new AppError(
        `Missing required query parameters: ${missingParams.join(', ')}`,
        400,
        {method, missingParams}
      );
    }
  }

  /**
   * Sets CORS headers for cross-origin requests
   */
  protected setCorsHeaders(
    res: Response,
    origin = 'https://savage-coworking.com'
  ): void {
    res.set({
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, savage-secret, Authorization',
      'Access-Control-Max-Age': '86400', // 24 hours
      'Access-Control-Allow-Credentials': 'true',
    });
  }
}
