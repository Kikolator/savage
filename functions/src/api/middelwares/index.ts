import {Request, Response, NextFunction} from 'express';
import * as bodyParser from 'body-parser';
import {logger} from 'firebase-functions';

import {setTypeformSignature} from './typeform/typeform-signature';

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
    logger.debug('rawBodySaver: saving raw body', {
      bufLength: buf.length,
      encoding: encoding || 'utf8',
    });
    req.rawBody = buf;
  }
};

const options = {verify: rawBodySaver};

// Middleware to check if request is from Typeform
const isTypeformRequest = (req: Request, res: Response, next: NextFunction) => {
  if (
    req.headers['user-agent'] === 'Typeform Webhooks' &&
    req.headers['typeform-signature']
  ) {
    bodyParser.json(options)(req, res, next);
  } else {
    bodyParser.json()(req, res, next);
  }
};

export const interceptors: Array<
  (req: Request, res: Response, next: NextFunction) => void
> = [
  // bodyParser.urlencoded({ extended: false }), // Not needed for Typeform
  isTypeformRequest,
  setTypeformSignature,
];
