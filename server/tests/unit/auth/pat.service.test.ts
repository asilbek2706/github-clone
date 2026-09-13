import { beforeEach, describe, expect, it, vi } from 'vitest';

import prisma from '../../../src/config/prisma.js';

import {
  createPersonalAccessToken,
  verifyPersonalAccessToken,
} from '../../../src/modules/auth/pat.service.js';

vi.mock('../../../src/config/prisma.js', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
    personalAccessToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const mockedUserFindUnique = vi.mocked(prisma.user.findUnique);

const mockedPatCreate = vi.mocked(prisma.personalAccessToken.create);

const mockedPatFindUnique = vi.mocked(prisma.personalAccessToken.findUnique);

const mockedPatUpdate = vi.mocked(prisma.personalAccessToken.update);

describe('personal access token service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a personal access token', async () => {
    const createdAt = new Date();

    mockedPatCreate.mockResolvedValue({
      id: 'pat-1',
      userId: 'user-1',
      name: 'Laptop token',
      tokenPrefix: 'gzp_example',
      tokenHash: 'hashed-token',
      expiresAt: null,
      lastUsedAt: null,
      createdAt,
      updatedAt: createdAt,
    } as never);

    const result = await createPersonalAccessToken('user-1', 'Laptop token');

    expect(result.id).toBe('pat-1');
    expect(result.name).toBe('Laptop token');

    expect(result.token).toMatch(/^gzp_/);

    expect(result.expiresAt).toBeNull();

    expect(mockedPatCreate).toHaveBeenCalledOnce();
  });

  it('rejects verification when username does not exist', async () => {
    mockedUserFindUnique.mockResolvedValue(null as never);

    await expect(
      verifyPersonalAccessToken('missing-user', 'gzp_invalid-token'),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_GIT_CREDENTIALS',
    });
  });

  it('rejects verification when token does not exist', async () => {
    mockedUserFindUnique.mockResolvedValue({
      id: 'user-1',
      username: 'testuser',
    } as never);

    mockedPatFindUnique.mockResolvedValue(null as never);

    await expect(verifyPersonalAccessToken('testuser', 'gzp_invalid-token')).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_GIT_CREDENTIALS',
    });
  });

  it('rejects verification when token hash is invalid', async () => {
    mockedUserFindUnique.mockResolvedValue({
      id: 'user-1',
      username: 'testuser',
    } as never);

    mockedPatFindUnique.mockResolvedValue({
      id: 'pat-1',
      userId: 'user-1',
      name: 'Test token',
      tokenPrefix: 'gzp_invalid',
      tokenHash: 'wrong-hash',
      expiresAt: null,
      lastUsedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    await expect(verifyPersonalAccessToken('testuser', 'gzp_invalid-token')).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_GIT_CREDENTIALS',
    });
  });

  it('rejects verification when token belongs to another user', async () => {
    mockedUserFindUnique.mockResolvedValue({
      id: 'user-1',
      username: 'testuser',
    } as never);

    const token = 'gzp_test-token-for-owner-check';

    const crypto = await import('node:crypto');

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    mockedPatFindUnique.mockResolvedValue({
      id: 'pat-1',
      userId: 'user-2',
      name: 'Test token',
      tokenPrefix: token.slice(0, 12),
      tokenHash,
      expiresAt: null,
      lastUsedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    await expect(verifyPersonalAccessToken('testuser', token)).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_GIT_CREDENTIALS',
    });
  });

  it('rejects expired personal access token', async () => {
    mockedUserFindUnique.mockResolvedValue({
      id: 'user-1',
      username: 'testuser',
    } as never);

    const token = 'gzp_test-expired-token';

    const crypto = await import('node:crypto');

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    mockedPatFindUnique.mockResolvedValue({
      id: 'pat-1',
      userId: 'user-1',
      name: 'Expired token',
      tokenPrefix: token.slice(0, 12),
      tokenHash,
      expiresAt: new Date(Date.now() - 60_000),
      lastUsedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    await expect(verifyPersonalAccessToken('testuser', token)).rejects.toMatchObject({
      statusCode: 401,
      code: 'GIT_TOKEN_EXPIRED',
    });
  });

  it('verifies valid personal access token and updates lastUsedAt', async () => {
    mockedUserFindUnique.mockResolvedValue({
      id: 'user-1',
      username: 'testuser',
    } as never);

    const token = 'gzp_test-valid-token';

    const crypto = await import('node:crypto');

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    mockedPatFindUnique.mockResolvedValue({
      id: 'pat-1',
      userId: 'user-1',
      name: 'Valid token',
      tokenPrefix: token.slice(0, 12),
      tokenHash,
      expiresAt: new Date(Date.now() + 60_000),
      lastUsedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    mockedPatUpdate.mockResolvedValue({} as never);

    const result = await verifyPersonalAccessToken('testuser', token);

    expect(result).toEqual({
      userId: 'user-1',
      username: 'testuser',
    });

    expect(mockedPatUpdate).toHaveBeenCalledOnce();

    expect(mockedPatUpdate).toHaveBeenCalledWith({
      where: {
        id: 'pat-1',
      },
      data: {
        lastUsedAt: expect.any(Date),
      },
    });
  });

  it('stores only token prefix and hash when creating a personal access token', async () => {
    const createdAt = new Date();

    mockedPatCreate.mockResolvedValue({
      id: 'pat-1',
      userId: 'user-1',
      name: 'Laptop token',
      tokenPrefix: 'gzp_example',
      tokenHash: 'hashed-token',
      expiresAt: null,
      lastUsedAt: null,
      createdAt,
      updatedAt: createdAt,
    } as never);

    const result = await createPersonalAccessToken('user-1', 'Laptop token');

    expect(result.token).toMatch(/^gzp_/);

    expect(mockedPatCreate).toHaveBeenCalledOnce();

    expect(mockedPatCreate).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        name: 'Laptop token',
        tokenPrefix: expect.stringMatching(/^gzp_/),
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        expiresAt: null,
      },
    });

    const createCall = mockedPatCreate.mock.calls[0];

    expect(createCall).toBeDefined();
    expect(createCall?.[0].data).not.toHaveProperty('token');
  });

  it('stores the provided expiration date when creating a personal access token', async () => {
    const createdAt = new Date();
    const expiresAt = new Date('2026-10-01T12:00:00.000Z');

    mockedPatCreate.mockResolvedValue({
      id: 'pat-1',
      userId: 'user-1',
      name: 'Expiring token',
      tokenPrefix: 'gzp_example',
      tokenHash: 'hashed-token',
      expiresAt,
      lastUsedAt: null,
      createdAt,
      updatedAt: createdAt,
    } as never);

    const result = await createPersonalAccessToken('user-1', 'Expiring token', expiresAt);

    expect(result.expiresAt).toEqual(expiresAt);

    expect(mockedPatCreate).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        name: 'Expiring token',
        tokenPrefix: expect.any(String),
        tokenHash: expect.any(String),
        expiresAt,
      },
    });
  });

  it('does not update lastUsedAt when token hash is invalid', async () => {
    mockedUserFindUnique.mockResolvedValue({
      id: 'user-1',
      username: 'testuser',
    } as never);

    mockedPatFindUnique.mockResolvedValue({
      id: 'pat-1',
      userId: 'user-1',
      name: 'Test token',
      tokenPrefix: 'gzp_invalid',
      tokenHash: 'wrong-hash',
      expiresAt: null,
      lastUsedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    await expect(verifyPersonalAccessToken('testuser', 'gzp_invalid-token')).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_GIT_CREDENTIALS',
    });

    expect(mockedPatUpdate).not.toHaveBeenCalled();
  });

  it('does not update lastUsedAt when token belongs to another user', async () => {
    mockedUserFindUnique.mockResolvedValue({
      id: 'user-1',
      username: 'testuser',
    } as never);

    const token = 'gzp_other-user-token';

    const crypto = await import('node:crypto');

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    mockedPatFindUnique.mockResolvedValue({
      id: 'pat-1',
      userId: 'user-2',
      name: 'Other user token',
      tokenPrefix: token.slice(0, 12),
      tokenHash,
      expiresAt: null,
      lastUsedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    await expect(verifyPersonalAccessToken('testuser', token)).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_GIT_CREDENTIALS',
    });

    expect(mockedPatUpdate).not.toHaveBeenCalled();
  });

  it('does not update lastUsedAt when personal access token is expired', async () => {
    mockedUserFindUnique.mockResolvedValue({
      id: 'user-1',
      username: 'testuser',
    } as never);

    const token = 'gzp_expired-token';

    const crypto = await import('node:crypto');

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    mockedPatFindUnique.mockResolvedValue({
      id: 'pat-1',
      userId: 'user-1',
      name: 'Expired token',
      tokenPrefix: token.slice(0, 12),
      tokenHash,
      expiresAt: new Date(Date.now() - 60_000),
      lastUsedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    await expect(verifyPersonalAccessToken('testuser', token)).rejects.toMatchObject({
      statusCode: 401,
      code: 'GIT_TOKEN_EXPIRED',
    });

    expect(mockedPatUpdate).not.toHaveBeenCalled();
  });

  it('rejects a personal access token that expires at the current time', async () => {
    const now = new Date('2026-09-13T07:30:00.000Z');

    vi.useFakeTimers();
    vi.setSystemTime(now);

    try {
      mockedUserFindUnique.mockResolvedValue({
        id: 'user-1',
        username: 'testuser',
      } as never);

      const token = 'gzp_boundary-expired-token';

      const crypto = await import('node:crypto');

      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      mockedPatFindUnique.mockResolvedValue({
        id: 'pat-1',
        userId: 'user-1',
        name: 'Boundary token',
        tokenPrefix: token.slice(0, 12),
        tokenHash,
        expiresAt: now,
        lastUsedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      await expect(verifyPersonalAccessToken('testuser', token)).rejects.toMatchObject({
        statusCode: 401,
        code: 'GIT_TOKEN_EXPIRED',
      });

      expect(mockedPatUpdate).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects a token with the same-length but different hash', async () => {
    mockedUserFindUnique.mockResolvedValue({
      id: 'user-1',
      username: 'testuser',
    } as never);

    const token = 'gzp_valid-looking-token';

    const crypto = await import('node:crypto');

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const differentHash =
      tokenHash[0] === 'a' ? `b${tokenHash.slice(1)}` : `a${tokenHash.slice(1)}`;

    mockedPatFindUnique.mockResolvedValue({
      id: 'pat-1',
      userId: 'user-1',
      name: 'Test token',
      tokenPrefix: token.slice(0, 12),
      tokenHash: differentHash,
      expiresAt: null,
      lastUsedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    await expect(verifyPersonalAccessToken('testuser', token)).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_GIT_CREDENTIALS',
    });

    expect(mockedPatUpdate).not.toHaveBeenCalled();
  });
});
