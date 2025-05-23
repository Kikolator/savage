import { Request, Response, NextFunction } from 'express';
import * as bodyParser from 'body-parser';
import { setTypeformSignature } from './typeform/typeform-signature';

// custom verifier function, only to requests from Typeform
const rawBodySaver = (
  req: Request,
  res: Response,
  buf: Buffer,
  encoding: BufferEncoding
) => {
  if (
    req.headers['user-agent'] === 'Typeform Webhooks' &&
    req.headers['typeform-signature'] &&
    buf &&
    buf.length
  ) {
    req.rawBody = buf.toString(encoding || 'utf8');
  }
};

const options = {
  verify: rawBodySaver,
};

export const interceptors: Array<
  (req: Request, res: Response, next: NextFunction) => void
> = [
  bodyParser.urlencoded({ extended: false }),
  bodyParser.json(options),
  setTypeformSignature,
];
