import type { Request, Response } from 'express';

import { AuthError } from './auth.errors.js';
import { loginUser, registerUser } from './auth.service.js';
import { loginSchema, registerSchema } from './auth.validation.js';

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

  res.status(200).json({
    success: true,
    data: {
      user: auth.user,
      accessToken: auth.accessToken,
    },
  });
};
