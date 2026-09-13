import type { Response } from 'express';

import { env } from '../../config/env.js';

const REFRESH_TOKEN_COOKIE = 'refreshToken';

const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

export const setRefreshTokenCookie = (res: Response, refreshToken: string): void => {
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
};

export const clearRefreshTokenCookie = (res: Response): void => {
  res.clearCookie(REFRESH_TOKEN_COOKIE, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
  });
};

export const getRefreshTokenCookieName = (): string => {
  return REFRESH_TOKEN_COOKIE;
};
