import { Request, Response, NextFunction } from 'express';
import * as bodyParser from 'body-parser';

export const interceptors: Array<
  (req: Request, res: Response, next: NextFunction) => void
> = [
  bodyParser.urlencoded({ extended: false }),
  bodyParser.json(),
];
