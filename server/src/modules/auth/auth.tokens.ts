import jwt from 'jsonwebtoken';

import { jwtConfig } from '../../config/jwt.js';

interface AccessTokenPayload {
  sub: string;
  type: 'access';
}

interface RefreshTokenPayload {
  sub: string;
  type: 'refresh';
}

export const generateAccessToken = (userId: string): string => {
  const payload: AccessTokenPayload = {
    sub: userId,
    type: 'access',
  };

  return jwt.sign(
    payload,
    jwtConfig.accessSecret,
    {
      expiresIn: jwtConfig.accessExpiresIn!,
    },
  );
};

export const generateRefreshToken = (userId: string): string => {
  const payload: RefreshTokenPayload = {
    sub: userId,
    type: 'refresh',
  };

  return jwt.sign(
    payload,
    jwtConfig.refreshSecret,
    {
      expiresIn: jwtConfig.refreshExpiresIn!,
    },
  );
};

export const verifyAccessToken = (
  token: string,
): AccessTokenPayload => {
  const payload = jwt.verify(
    token,
    jwtConfig.accessSecret,
  );

  if (
    typeof payload === 'string' ||
    payload.type !== 'access' ||
    typeof payload.sub !== 'string'
  ) {
    throw new Error('Invalid access token');
  }

  return {
    sub: payload.sub,
    type: 'access',
  };
};

export const verifyRefreshToken = (
  token: string,
): RefreshTokenPayload => {
  const payload = jwt.verify(
    token,
    jwtConfig.refreshSecret,
  );

  if (
    typeof payload === 'string' ||
    payload.type !== 'refresh' ||
    typeof payload.sub !== 'string'
  ) {
    throw new Error('Invalid refresh token');
  }

  return {
    sub: payload.sub,
    type: 'refresh',
  };
};
