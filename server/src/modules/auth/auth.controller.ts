import type { Request, Response } from 'express';

import {
  getRefreshTokenCookieName,
  setRefreshTokenCookie,
} from './auth.cookies.js';
import { AuthError } from './auth.errors.js';
import {
  loginUser,
  refreshAuth,
  registerUser,
} from './auth.service.js';
import {
  loginSchema,
  registerSchema,
} from './auth.validation.js';

export const register = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const result = registerSchema.safeParse(req.body);

  if (!result.success) {
    throw new AuthError(
      'Validation failed',
      400,
      'VALIDATION_ERROR',
    );
  }

  const auth = await registerUser({
    username: result.data.username,
    email: result.data.email,
    password: result.data.password,
    ...(result.data.name !== undefined
      ? { name: result.data.name }
      : {}),
  });

  setRefreshTokenCookie(res, auth.refreshToken);

  res.status(201).json({
    success: true,
    data: {
      user: auth.user,
      accessToken: auth.accessToken,
    },
  });
};

export const login = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const result = loginSchema.safeParse(req.body);

  if (!result.success) {
    throw new AuthError(
      'Validation failed',
      400,
      'VALIDATION_ERROR',
    );
  }

  const auth = await loginUser(result.data);

  setRefreshTokenCookie(res, auth.refreshToken);

  res.status(200).json({
    success: true,
    data: {
      user: auth.user,
      accessToken: auth.accessToken,
    },
  });
};

export const refresh = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const refreshToken = getRefreshTokenFromCookie(req);

  if (!refreshToken) {
    throw new AuthError(
      'Refresh token is required',
      401,
      'REFRESH_TOKEN_REQUIRED',
    );
  }

  const auth = await refreshAuth(refreshToken);

  setRefreshTokenCookie(res, auth.refreshToken);

  res.status(200).json({
    success: true,
    data: {
      user: auth.user,
      accessToken: auth.accessToken,
    },
  });
};

export const getRefreshTokenFromCookie = (
  req: Request,
): string | undefined => {
  return req.cookies?.[getRefreshTokenCookieName()];
};
