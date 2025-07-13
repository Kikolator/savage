import {logger} from 'firebase-functions/v2';

import {RewardScheduledEvents} from '../../../src/scheduled-events/on-schedule-events/reward-scheduled-events';
import {FirestoreService} from '../../../src/core/services/firestore-service';
import {ServiceResolver} from '../../../src/core/services/di';
import * as environment from '../../../src/core/utils/environment';
import {RewardScheduledEventError} from '../../../src/core/errors';

jest.mock('../../../src/core/services/firestore-service');
jest.mock('../../../src/core/services/di');
jest.mock('../../../src/core/utils/environment');

// Define proper types for mocks
interface MockFirestoreService {
  createDocument: jest.Mock;
  getInstance: jest.Mock;
}

interface MockRewardService {
  processDueRewards: jest.Mock;
}

const mockFirestoreService: MockFirestoreService = {
  createDocument: jest.fn(),
  getInstance: jest.fn(),
};

const mockRewardService: MockRewardService = {
  processDueRewards: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  (FirestoreService.getInstance as jest.Mock).mockReturnValue(
    mockFirestoreService
  );
  (ServiceResolver.getRewardService as jest.Mock).mockReturnValue(
    mockRewardService
  );
  (environment.isDevelopment as jest.Mock).mockReturnValue(false);

  // Reset mock implementations to success by default
  mockFirestoreService.createDocument.mockResolvedValue(undefined);
  mockRewardService.processDueRewards.mockResolvedValue(undefined);
});

describe('RewardScheduledEvents', () => {
  const events = new RewardScheduledEvents();
  const add = jest.fn();

  it('should register the processDueRewards scheduled event', () => {
    events.initialize(add);
    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({name: 'processDueRewards'})
    );
  });

  describe('processDueRewards scheduled handler', () => {
    const handler = (
      events as unknown as {
        processDueRewards: {handler: () => Promise<void>};
      }
    ).processDueRewards.handler;

    describe('Success scenarios', () => {
      it('should process due rewards successfully', async () => {
        mockRewardService.processDueRewards.mockResolvedValue(undefined);

        await handler();

        expect(ServiceResolver.getRewardService).toHaveBeenCalled();
        expect(mockRewardService.processDueRewards).toHaveBeenCalled();
      });

      it('should handle empty reward processing', async () => {
        mockRewardService.processDueRewards.mockResolvedValue(undefined);

        await handler();

        expect(mockRewardService.processDueRewards).toHaveBeenCalled();
      });
    });

    describe('Error handling scenarios', () => {
      it('should handle RewardService errors in production mode', async () => {
        const serviceError = new Error('Reward service failed');
        mockRewardService.processDueRewards.mockRejectedValue(serviceError);
        (environment.isDevelopment as jest.Mock).mockReturnValue(false);

        await expect(handler()).rejects.toThrow(RewardScheduledEventError);

        expect(logger.error).toHaveBeenCalledWith(
          'RewardScheduledEvents.processDueRewards()- Error processing due rewards',
          serviceError
        );
        expect(mockFirestoreService.createDocument).toHaveBeenCalledWith({
          collection: 'errors',
          data: expect.objectContaining({
            name: 'RewardScheduledEventError',
            message: 'Failed to process due rewards',
            functionName: 'processDueRewards',
            details: expect.objectContaining({
              originalError: 'Reward service failed',
            }),
          }),
        });
      });

      it('should handle RewardService errors in development mode', async () => {
        const serviceError = new Error('Reward service failed');
        mockRewardService.processDueRewards.mockRejectedValue(serviceError);
        (environment.isDevelopment as jest.Mock).mockReturnValue(true);

        await expect(handler()).rejects.toThrow(RewardScheduledEventError);

        expect(logger.error).toHaveBeenCalledWith(
          'RewardScheduledEvents.processDueRewards()- Error processing due rewards',
          serviceError
        );
        expect(logger.debug).toHaveBeenCalledWith(
          'RewardScheduledEvents.processDueRewards()- In development mode, ' +
            'the error will not be logged in Firestore'
        );
        expect(mockFirestoreService.createDocument).not.toHaveBeenCalled();
      });

      it('should handle non-Error objects', async () => {
        const nonError = 'String error';
        mockRewardService.processDueRewards.mockRejectedValue(nonError);
        (environment.isDevelopment as jest.Mock).mockReturnValue(false);

        await expect(handler()).rejects.toThrow(RewardScheduledEventError);

        expect(mockFirestoreService.createDocument).toHaveBeenCalledWith({
          collection: 'errors',
          data: expect.objectContaining({
            details: expect.objectContaining({
              originalError: 'Unknown error',
            }),
          }),
        });
      });

      it('should handle null/undefined errors', async () => {
        mockRewardService.processDueRewards.mockRejectedValue(null);
        (environment.isDevelopment as jest.Mock).mockReturnValue(false);

        await expect(handler()).rejects.toThrow(RewardScheduledEventError);

        expect(mockFirestoreService.createDocument).toHaveBeenCalledWith({
          collection: 'errors',
          data: expect.objectContaining({
            details: expect.objectContaining({
              originalError: 'Unknown error',
            }),
          }),
        });
      });

      it('should handle Firestore error logging failures', async () => {
        const serviceError = new Error('Reward service failed');
        mockRewardService.processDueRewards.mockRejectedValue(serviceError);
        mockFirestoreService.createDocument.mockRejectedValue(
          new Error('Firestore error')
        );
        (environment.isDevelopment as jest.Mock).mockReturnValue(false);

        // Currently the implementation doesn't handle Firestore errors, so it will throw the Firestore error
        await expect(handler()).rejects.toThrow('Firestore error');

        expect(logger.error).toHaveBeenCalledWith(
          'RewardScheduledEvents.processDueRewards()- Error processing due rewards',
          serviceError
        );
        expect(mockFirestoreService.createDocument).toHaveBeenCalled();
      });
    });

    describe('ServiceResolver integration', () => {
      it('should use ServiceResolver to get RewardService', async () => {
        mockRewardService.processDueRewards.mockResolvedValue(undefined);

        await handler();

        expect(ServiceResolver.getRewardService).toHaveBeenCalledTimes(1);
        expect(mockRewardService.processDueRewards).toHaveBeenCalledTimes(1);
      });

      it('should handle ServiceResolver failures', async () => {
        (ServiceResolver.getRewardService as jest.Mock).mockImplementation(
          () => {
            throw new Error('ServiceResolver failed');
          }
        );

        await expect(handler()).rejects.toThrow(RewardScheduledEventError);

        expect(logger.error).toHaveBeenCalledWith(
          'RewardScheduledEvents.processDueRewards()- Error processing due rewards',
          expect.any(Error)
        );
      });
    });

    describe('Environment-specific behavior', () => {
      it('should log errors to Firestore in production', async () => {
        const serviceError = new Error('Production error');
        mockRewardService.processDueRewards.mockRejectedValue(serviceError);
        (environment.isDevelopment as jest.Mock).mockReturnValue(false);

        await expect(handler()).rejects.toThrow(RewardScheduledEventError);

        expect(mockFirestoreService.createDocument).toHaveBeenCalled();
        expect(logger.debug).not.toHaveBeenCalled();
      });

      it('should not log errors to Firestore in development', async () => {
        const serviceError = new Error('Development error');
        mockRewardService.processDueRewards.mockRejectedValue(serviceError);
        (environment.isDevelopment as jest.Mock).mockReturnValue(true);

        await expect(handler()).rejects.toThrow(RewardScheduledEventError);

        expect(mockFirestoreService.createDocument).not.toHaveBeenCalled();
        expect(logger.debug).toHaveBeenCalledWith(
          'RewardScheduledEvents.processDueRewards()- In development mode, ' +
            'the error will not be logged in Firestore'
        );
      });
    });

    describe('Error object creation', () => {
      it('should create RewardScheduledEventError with correct properties', async () => {
        const serviceError = new Error('Test error message');
        mockRewardService.processDueRewards.mockRejectedValue(serviceError);
        (environment.isDevelopment as jest.Mock).mockReturnValue(false);

        try {
          await handler();
        } catch (error) {
          expect(error).toBeInstanceOf(RewardScheduledEventError);
          expect((error as RewardScheduledEventError).message).toBe(
            'Failed to process due rewards'
          );
          expect((error as RewardScheduledEventError).details).toEqual({
            functionName: 'processDueRewards',
            scheduledEvent: true,
            localErrorCode: 10001,
            originalError: 'Test error message',
          });
        }
      });

      it('should preserve original error message in details', async () => {
        const serviceError = new Error('Complex error with details');
        mockRewardService.processDueRewards.mockRejectedValue(serviceError);
        (environment.isDevelopment as jest.Mock).mockReturnValue(false);

        try {
          await handler();
        } catch (error) {
          expect((error as RewardScheduledEventError).details).toEqual({
            functionName: 'processDueRewards',
            scheduledEvent: true,
            localErrorCode: 10001,
            originalError: 'Complex error with details',
          });
        }
      });
    });

    describe('Logging behavior', () => {
      it('should log error with correct context', async () => {
        const serviceError = new Error('Logging test error');
        mockRewardService.processDueRewards.mockRejectedValue(serviceError);

        await expect(handler()).rejects.toThrow(RewardScheduledEventError);

        expect(logger.error).toHaveBeenCalledWith(
          'RewardScheduledEvents.processDueRewards()- Error processing due rewards',
          serviceError
        );
      });

      it('should log debug message in development mode', async () => {
        const serviceError = new Error('Debug test error');
        mockRewardService.processDueRewards.mockRejectedValue(serviceError);
        (environment.isDevelopment as jest.Mock).mockReturnValue(true);

        await expect(handler()).rejects.toThrow(RewardScheduledEventError);

        expect(logger.debug).toHaveBeenCalledWith(
          'RewardScheduledEvents.processDueRewards()- In development mode, ' +
            'the error will not be logged in Firestore'
        );
      });
    });

    describe('Edge cases', () => {
      it('should handle async errors from reward service', async () => {
        const asyncError = new Error('Async error');
        mockRewardService.processDueRewards.mockRejectedValue(asyncError);

        await expect(handler()).rejects.toThrow(RewardScheduledEventError);
      });

      it('should handle errors with circular references', async () => {
        const circularError = new Error('Circular error');
        (circularError as unknown as {self: unknown}).self = circularError;
        mockRewardService.processDueRewards.mockRejectedValue(circularError);

        await expect(handler()).rejects.toThrow(RewardScheduledEventError);
      });

      it('should handle very long error messages', async () => {
        const longMessage = 'A'.repeat(10000);
        const longError = new Error(longMessage);
        mockRewardService.processDueRewards.mockRejectedValue(longError);

        await expect(handler()).rejects.toThrow(RewardScheduledEventError);
      });
    });
  });
});
