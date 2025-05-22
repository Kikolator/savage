import { Request, Response, NextFunction } from 'express';
import * as bodyParser from 'body-parser';
import { setTypeformSignature } from './typeform/typeform-signature';

export const interceptors: Array<
  (req: Request, res: Response, next: NextFunction) => void
> = [
  bodyParser.urlencoded({ extended: false }),
  bodyParser.json(),
  setTypeformSignature,
];
