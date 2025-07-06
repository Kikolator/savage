import {jest, describe, it, expect, beforeEach} from '@jest/globals';
import {Request, Response, NextFunction} from 'express';

import TestController from '../../../src/api/controllers/test-controllers/test-controller';
import {AppError, ErrorCode} from '../../../src/core/errors/app-error';
import {createMockRequest, createMockResponse} from '../../utils/test-helpers';

describe('TestController', () => {
  let testController: TestController;
  let mockRequest: Request;
  let mockResponse: Response;
  let mockNext: NextFunction;
  let mockHttpServer: any;

  beforeEach(() => {
    testController = new TestController();
    mockRequest = createMockRequest() as any;
    mockResponse = createMockResponse() as any;
    mockNext = jest.fn();
    mockHttpServer = {
      get: jest.fn(),
    };
  });

  describe('initialize', () => {
    it('should register ping endpoint', () => {
      testController.initialize(mockHttpServer);

      expect(mockHttpServer.get).toHaveBeenCalledWith(
        '/ping',
        expect.any(Function)
      );
    });
  });

  describe('ping endpoint', () => {
    it('should return pong message with 200 status', async () => {
      testController.initialize(mockHttpServer);
      const pingHandler = mockHttpServer.get.mock.calls[0][1];

      await pingHandler(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({message: 'Pong'});
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle AppError correctly', async () => {
      testController.initialize(mockHttpServer);
      const pingHandler = mockHttpServer.get.mock.calls[0][1];

      // Mock logger to throw an AppError
      const appError = new AppError('Test error', ErrorCode.UNKNOWN_ERROR, 400);
      jest.spyOn(console, 'debug').mockImplementation(() => {
        throw appError;
      });

      await pingHandler(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(appError);
    });

    it('should handle generic errors correctly', async () => {
      testController.initialize(mockHttpServer);
      const pingHandler = mockHttpServer.get.mock.calls[0][1];

      // Mock logger to throw a generic error
      const genericError = new Error('Generic error');
      jest.spyOn(console, 'debug').mockImplementation(() => {
        throw genericError;
      });

      await pingHandler(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Internal Server Error',
          code: ErrorCode.UNKNOWN_ERROR,
          statusCode: 500,
        })
      );
    });
  });
});
