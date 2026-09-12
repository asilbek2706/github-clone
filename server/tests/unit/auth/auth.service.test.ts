import { beforeEach, describe, expect, it, vi } from 'vitest';

import bcrypt from 'bcrypt';

import prisma from '../../../src/config/prisma.js';

import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  verifyRefreshToken,
} from '../../../src/modules/auth/auth.tokens.js';

import {
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshAuth,
  registerUser,
} from '../../../src/modules/auth/auth.service.js';

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

vi.mock('../../../src/config/prisma.js', () => ({
  default: {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    session: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('../../../src/modules/auth/auth.tokens.js', () => ({
  generateAccessToken: vi.fn(),
  generateRefreshToken: vi.fn(),
  hashRefreshToken: vi.fn(),
  verifyRefreshToken: vi.fn(),
}));

const mockedUserFindFirst = vi.mocked(prisma.user.findFirst);

const mockedUserFindUnique = vi.mocked(prisma.user.findUnique);

const mockedUserCreate = vi.mocked(prisma.user.create);

const mockedSessionCreate = vi.mocked(prisma.session.create);

const mockedSessionFindUnique = vi.mocked(prisma.session.findUnique);

const mockedSessionUpdate = vi.mocked(prisma.session.update);

const mockedSessionUpdateMany = vi.mocked(prisma.session.updateMany);

const mockedTransaction = vi.mocked(prisma.$transaction);

const mockedBcryptHash = vi.mocked(bcrypt.hash);

const mockedBcryptCompare = vi.mocked(bcrypt.compare);

const mockedGenerateAccessToken = vi.mocked(generateAccessToken);

const mockedGenerateRefreshToken = vi.mocked(generateRefreshToken);

const mockedHashRefreshToken = vi.mocked(hashRefreshToken);

const mockedVerifyRefreshToken = vi.mocked(verifyRefreshToken);

const baseUser = {
  id: 'user-1',
  username: 'asil',
  email: 'asil@example.com',
  password: 'hashed-password',
  name: 'Asil',
  avatarUrl: null,
  bio: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('auth service', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedGenerateAccessToken.mockReturnValue('access-token');

    mockedGenerateRefreshToken.mockReturnValue({
      token: 'refresh-token',
      tokenHash: 'refresh-hash',
    } as never);

    mockedHashRefreshToken.mockReturnValue('refresh-hash');
  });

  it('registers a new user', async () => {
    mockedUserFindFirst.mockResolvedValue(null as never);

    mockedBcryptHash.mockResolvedValue('hashed-password' as never);

    mockedUserCreate.mockResolvedValue(baseUser as never);

    mockedSessionCreate.mockResolvedValue({} as never);

    const result = await registerUser({
      username: 'asil',
      email: 'asil@example.com',
      password: 'password123',
      name: 'Asil',
    });

    expect(result.user.username).toBe('asil');

    expect(result.accessToken).toBe('access-token');

    expect(result.refreshToken).toBe('refresh-token');
  });

  it('rejects duplicate username', async () => {
    mockedUserFindFirst.mockResolvedValue(baseUser as never);

    await expect(
      registerUser({
        username: 'asil',
        email: 'other@example.com',
        password: 'password123',
        name: 'Asil',
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'USERNAME_TAKEN',
    });
  });

  it('rejects duplicate email', async () => {
    mockedUserFindFirst.mockResolvedValue({
      ...baseUser,
      username: 'another-user',
    } as never);

    await expect(
      registerUser({
        username: 'newuser',
        email: 'asil@example.com',
        password: 'password123',
        name: 'New User',
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'EMAIL_ALREADY_REGISTERED',
    });
  });

  it('logs in user with valid credentials', async () => {
    mockedUserFindUnique.mockResolvedValue(baseUser as never);

    mockedBcryptCompare.mockResolvedValue(true as never);

    mockedSessionCreate.mockResolvedValue({} as never);

    const result = await loginUser({
      email: 'asil@example.com',
      password: 'password123',
    });

    expect(result.user.id).toBe('user-1');
    expect(result.accessToken).toBe('access-token');
  });

  it('rejects login when user does not exist', async () => {
    mockedUserFindUnique.mockResolvedValue(null as never);

    await expect(
      loginUser({
        email: 'missing@example.com',
        password: 'password123',
      }),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    });
  });

  it('rejects login with invalid password', async () => {
    mockedUserFindUnique.mockResolvedValue(baseUser as never);

    mockedBcryptCompare.mockResolvedValue(false as never);

    await expect(
      loginUser({
        email: 'asil@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    });
  });

  it('returns current user', async () => {
    mockedUserFindUnique.mockResolvedValue(baseUser as never);

    const result = await getCurrentUser('user-1');

    expect(result.id).toBe('user-1');
    expect(result.email).toBe('asil@example.com');
  });

  it('throws 404 when current user does not exist', async () => {
    mockedUserFindUnique.mockResolvedValue(null as never);

    await expect(getCurrentUser('missing-user')).rejects.toMatchObject({
      statusCode: 404,
      code: 'USER_NOT_FOUND',
    });
  });

  it('rejects refresh when session does not exist', async () => {
    mockedVerifyRefreshToken.mockReturnValue({
      sub: 'user-1',
    } as never);

    mockedSessionFindUnique.mockResolvedValue(null as never);

    await expect(refreshAuth('refresh-token')).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_REFRESH_TOKEN',
    });
  });

  it('rejects revoked refresh token', async () => {
    mockedVerifyRefreshToken.mockReturnValue({
      sub: 'user-1',
    } as never);

    mockedSessionFindUnique.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      refreshTokenHash: 'refresh-hash',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: new Date(),
      createdAt: new Date(),
    } as never);

    await expect(refreshAuth('refresh-token')).rejects.toMatchObject({
      statusCode: 401,
      code: 'REFRESH_TOKEN_REVOKED',
    });
  });

  it('rejects expired refresh token', async () => {
    mockedVerifyRefreshToken.mockReturnValue({
      sub: 'user-1',
    } as never);

    mockedSessionFindUnique.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      refreshTokenHash: 'refresh-hash',
      expiresAt: new Date(Date.now() - 60_000),
      revokedAt: null,
      createdAt: new Date(),
    } as never);

    await expect(refreshAuth('refresh-token')).rejects.toMatchObject({
      statusCode: 401,
      code: 'REFRESH_TOKEN_EXPIRED',
    });
  });

  it('rejects refresh token when subject does not match session user', async () => {
    mockedVerifyRefreshToken.mockReturnValue({
      sub: 'other-user',
    } as never);

    mockedSessionFindUnique.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      refreshTokenHash: 'refresh-hash',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      createdAt: new Date(),
    } as never);

    await expect(refreshAuth('refresh-token')).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_REFRESH_TOKEN',
    });
  });

  it('refreshes authentication successfully', async () => {
    mockedVerifyRefreshToken.mockReturnValue({
      sub: 'user-1',
    } as never);

    mockedSessionFindUnique.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      refreshTokenHash: 'refresh-hash',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      createdAt: new Date(),
    } as never);

    mockedUserFindUnique.mockResolvedValue(baseUser as never);

    mockedSessionUpdate.mockReturnValue({} as never);

    mockedSessionCreate.mockReturnValue({} as never);

    mockedTransaction.mockResolvedValue([] as never);

    const result = await refreshAuth('refresh-token');

    expect(result.user.id).toBe('user-1');

    expect(result.accessToken).toBe('access-token');

    expect(result.refreshToken).toBe('refresh-token');

    expect(mockedTransaction).toHaveBeenCalledOnce();
  });

  it('logs out by revoking active refresh session', async () => {
    mockedSessionUpdateMany.mockResolvedValue({
      count: 1,
    } as never);

    await expect(logoutUser('refresh-token')).resolves.toBeUndefined();

    expect(mockedSessionUpdateMany).toHaveBeenCalledOnce();
  });
});
