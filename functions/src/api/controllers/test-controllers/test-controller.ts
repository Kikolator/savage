import {Request, Response, NextFunction} from 'express';

import {BaseController} from '../base-controller';
import {HttpServer} from '../index';

class TestController extends BaseController {
  initialize(httpServer: HttpServer): void {
    httpServer.get('/ping', this.createHandler(this.ping.bind(this)));
  }

  // Test endpoint
  private async ping(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    this.logDebug('Pong');
    res.status(200).json({message: 'Pong'});
  }
}

export default TestController;
