import bcrypt from 'bcrypt';

import prisma from '../../config/prisma.js';
import { AuthError } from './auth.errors.js';
import {
  generateAccessToken,
  generateRefreshToken,
} from './auth.tokens.js';
import type {
  AuthResponse,
  AuthUser,
  LoginInput,
  RegisterInput,
} from './auth.types.js';

const SALT_ROUNDS = 12;

const toAuthUser = (user: {
  id: string;
  username: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: Date;
  updatedAt: Date;
}): AuthUser => ({
  id: user.id,
  username: user.username,
  email: user.email,
  name: user.name,
  avatarUrl: user.avatarUrl,
  bio: user.bio,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const registerUser = async (
  input: RegisterInput,
): Promise<AuthResponse> => {
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { username: input.username },
        { email: input.email },
      ],
    },
  });

  if (existingUser) {
    if (existingUser.username === input.username) {
      throw new AuthError(
        'Username is already taken',
        409,
        'USERNAME_TAKEN',
      );
    }

    throw new AuthError(
      'Email is already registered',
      409,
      'EMAIL_ALREADY_REGISTERED',
    );
  }

  const hashedPassword = await bcrypt.hash(
    input.password,
    SALT_ROUNDS,
  );

  const user = await prisma.user.create({
    data: {
      username: input.username,
      email: input.email,
      password: hashedPassword,
      name: input.name ?? null,
    },
  });

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  return {
    user: toAuthUser(user),
    accessToken,
    refreshToken,
  };
};

export const loginUser = async (
  input: LoginInput,
): Promise<AuthResponse> => {
  const user = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
  });

  if (!user) {
    throw new AuthError(
      'Invalid email or password',
      401,
      'INVALID_CREDENTIALS',
    );
  }

  const passwordMatches = await bcrypt.compare(
    input.password,
    user.password,
  );

  if (!passwordMatches) {
    throw new AuthError(
      'Invalid email or password',
      401,
      'INVALID_CREDENTIALS',
    );
  }

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  return {
    user: toAuthUser(user),
    accessToken,
    refreshToken,
  };
};
