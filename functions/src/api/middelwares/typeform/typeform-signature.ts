import {Request, Response, NextFunction} from 'express';

export const setTypeformSignature = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const signature = req.headers['typeform-signature']?.toString();
  req.typeformSignature = signature;
  next();
};
