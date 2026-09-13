import type { SignOptions } from 'jsonwebtoken';

import { env } from './env.js';

export const jwtConfig = {
  accessSecret: env.JWT_ACCESS_SECRET,
  refreshSecret: env.JWT_REFRESH_SECRET,
  accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
  refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
} as const;
