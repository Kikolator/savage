import {jest} from '@jest/globals';
import {Request, Response, NextFunction} from 'express';

import {ConfirmEmailController} from '../../../src/api/controllers/confirm-email-controller/confirm-email-controller';
import {TrialdayStatus} from '../../../src/core/data/enums/app/trialday-status';

// Mock Firebase Functions logger
jest.mock('firebase-functions', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Define proper interfaces for the mocked services
interface MockEmailConfirmationService {
  confirmEmail: jest.Mock;
}

interface MockTrialdayService {
  updateTrialdayStatus: jest.Mock;
}

describe('ConfirmEmailController Integration', () => {
  let controller: ConfirmEmailController;
  let emailConfirmationService: MockEmailConfirmationService;
  let trialdayService: MockTrialdayService;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    emailConfirmationService = {
      confirmEmail: (jest.fn() as any).mockResolvedValue(undefined),
    } as any;
    trialdayService = {
      updateTrialdayStatus: (jest.fn() as any).mockResolvedValue(undefined),
    } as any;
    controller = new ConfirmEmailController(
      emailConfirmationService as any,
      trialdayService as any
    );
    req = {body: {id: 'id', eventType: 'trial', eventId: 'eid'}, headers: {}};
    res = {
      set: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    } as unknown as Response;
    next = jest.fn();
  });

  it('should process a valid trial confirmation', async () => {
    await (controller as any)['handleConfirmEmail'](
      req as Request,
      res as Response,
      next
    );
    expect(emailConfirmationService.confirmEmail).toHaveBeenCalledWith('id');
    expect(trialdayService.updateTrialdayStatus).toHaveBeenCalledWith(
      'eid',
      TrialdayStatus.EMAIL_CONFIRMED
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('Email confirmed');
    expect(next).not.toHaveBeenCalled();
  });

  it('should handle service errors asynchronously', async () => {
    (emailConfirmationService.confirmEmail as any).mockRejectedValue(
      new Error('fail')
    );
    await (controller as any)['handleConfirmEmail'](
      req as Request,
      res as Response,
      next
    );
    // The controller sends 200 immediately, errors are handled asynchronously
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('Email confirmed');
    // next should not be called with errors since they're handled asynchronously
    expect(next).not.toHaveBeenCalled();
  });
});
