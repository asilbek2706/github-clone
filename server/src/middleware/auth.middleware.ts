import type { NextFunction, Request, Response } from 'express';

import { AuthError } from '../modules/auth/auth.errors.js';
import { verifyAccessToken } from '../modules/auth/auth.tokens.js';

export interface AuthenticatedRequest extends Request {
  userId: string;
}

export const authMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  const authorization = req.headers.authorization;

  if (!authorization) {
    throw new AuthError('Authorization header is required', 401, 'AUTHORIZATION_REQUIRED');
  }

  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new AuthError('Invalid authorization header', 401, 'INVALID_AUTHORIZATION_HEADER');
  }

  try {
    const payload = verifyAccessToken(token);

    (req as AuthenticatedRequest).userId = payload.sub;

    next();
  } catch {
    throw new AuthError('Invalid or expired access token', 401, 'INVALID_ACCESS_TOKEN');
  }
};
