import {Request, Response, NextFunction} from 'express';

import {ConfirmEmailController} from '../../../src/api/controllers/confirm-email-controller/confirm-email-controller';
import {TrialdayStatus} from '../../../src/core/data/enums/app/trialday-status';

// Define proper interfaces for the mocked services
interface MockEmailConfirmationService {
  confirmEmail: jest.Mock;
}

interface MockTrialdayService {
  updateTrialdayStatus: jest.Mock;
}

describe('ConfirmEmailController', () => {
  let controller: ConfirmEmailController;
  let emailConfirmationService: MockEmailConfirmationService;
  let trialdayService: MockTrialdayService;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    emailConfirmationService = {
      confirmEmail: jest.fn(),
    } as MockEmailConfirmationService;
    trialdayService = {updateTrialdayStatus: jest.fn()} as MockTrialdayService;
    controller = new ConfirmEmailController(
      emailConfirmationService as any,
      trialdayService as any
    );
    req = {body: {}, headers: {}};
    res = {set: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn()};
    next = jest.fn();
  });

  it('should return 400 if required fields are missing', async () => {
    req.body = {};
    const wrappedHandler = controller['createHandler'](
      controller['handleConfirmEmail'].bind(controller)
    );
    await wrappedHandler(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({status: 400}));
  });

  it('should call confirmEmail and updateTrialdayStatus for trial', async () => {
    req.body = {id: 'id', eventType: 'trial', eventId: 'eid'};
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
  });

  it('should handle unknown eventType asynchronously', async () => {
    req.body = {id: 'id', eventType: 'foo', eventId: 'eid'};
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

  it('should handle errors from services asynchronously', async () => {
    req.body = {id: 'id', eventType: 'trial', eventId: 'eid'};
    (emailConfirmationService.confirmEmail as jest.Mock).mockRejectedValue(
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

  it('should set CORS headers on OPTIONS', () => {
    const response = {
      set: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    } as unknown as Response;
    (controller as any)['handleOptions'](
      {headers: {}} as Request,
      response,
      next
    );
    expect(response.set).toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.send).toHaveBeenCalled();
  });
});
