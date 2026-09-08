import 'dotenv/config';
import type { SignOptions } from 'jsonwebtoken';

const getEnv = (key: string): string => {
  const value = process.env[key];

  if (!value) {
    throw new Error(`${key} is not defined`);
  }

  return value;
};

const getExpiresIn = (key: string): SignOptions['expiresIn'] => {
  return getEnv(key) as SignOptions['expiresIn'];
};

export const jwtConfig = {
  accessSecret: getEnv('JWT_ACCESS_SECRET'),
  refreshSecret: getEnv('JWT_REFRESH_SECRET'),
  accessExpiresIn: getExpiresIn('JWT_ACCESS_EXPIRES_IN'),
  refreshExpiresIn: getExpiresIn('JWT_REFRESH_EXPIRES_IN'),
} as const;
