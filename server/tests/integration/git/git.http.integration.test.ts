import request from 'supertest';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { spawn } from 'node:child_process';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../../src/app.js';

import prisma from '../../../src/config/prisma.js';

import { verifyPersonalAccessToken } from '../../../src/modules/auth/pat.service.js';

import { authorizeRepositoryAccess } from '../../../src/modules/repositories/repository.authorization.service.js';

vi.mock('../../../src/config/prisma.js', () => ({
  default: {
    repository: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('../../../src/modules/auth/pat.service.js', () => ({
  verifyPersonalAccessToken: vi.fn(),
}));

vi.mock('../../../src/modules/repositories/repository.authorization.service.js', () => ({
  authorizeRepositoryAccess: vi.fn(),
}));

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();

  return {
    ...actual,
    spawn: vi.fn(),
  };
});

const mockedFindRepository = vi.mocked(prisma.repository.findFirst);

const mockedVerifyPersonalAccessToken = vi.mocked(verifyPersonalAccessToken);

const mockedAuthorizeRepositoryAccess = vi.mocked(authorizeRepositoryAccess);

const mockedSpawn = vi.mocked(spawn);

const gitRepository = {
  id: 'repo-1',
  name: 'demo',
  isPrivate: false,
  defaultBranch: 'main',
  owner: {
    id: 'owner-1',
    username: 'asil',
  },
};

const createGitBackendProcess = () => {
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  const stdin = new PassThrough();

  const child = new EventEmitter() as EventEmitter & {
    stdout: PassThrough;
    stderr: PassThrough;
    stdin: PassThrough;
  };

  child.stdout = stdout;
  child.stderr = stderr;
  child.stdin = stdin;

  return child;
};

const mockSuccessfulGitBackend = () => {
  mockedSpawn.mockImplementation(() => {
    const child = createGitBackendProcess();

    setImmediate(() => {
      const headers = [
        'Status: 200 OK',
        'Content-Type: application/x-git-upload-pack-advertisement',
        '',
        '',
      ].join('\r\n');

      child.stdout.write(Buffer.from(headers));

      child.stdout.write(Buffer.from('git-response'));

      child.stdout.end();

      child.emit('close', 0);
    });

    return child as never;
  });
};

describe('Git HTTP integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('allows anonymous read access to a public repository', async () => {
    mockedFindRepository.mockResolvedValue(gitRepository as never);

    mockedAuthorizeRepositoryAccess.mockResolvedValue({
      permission: 'PUBLIC',
    } as never);

    mockSuccessfulGitBackend();

    const response = await request(app).get('/asil/demo.git/info/refs?service=git-upload-pack');

    expect(response.status).toBe(200);

    expect(mockedVerifyPersonalAccessToken).not.toHaveBeenCalled();

    expect(mockedAuthorizeRepositoryAccess).toHaveBeenCalledWith('repo-1', 'READ');

    expect(mockedSpawn).toHaveBeenCalledOnce();
  });

  it('requires authentication for private repository read access', async () => {
    mockedFindRepository.mockResolvedValue({
      ...gitRepository,
      isPrivate: true,
    } as never);

    const response = await request(app).get('/asil/demo.git/info/refs?service=git-upload-pack');

    expect(response.status).toBe(401);

    expect(response.body).toMatchObject({
      success: false,
      code: 'GIT_AUTH_REQUIRED',
      message: 'Git username and personal access token are required',
    });

    expect(response.headers['www-authenticate']).toBe('Basic realm="GitZone"');

    expect(mockedSpawn).not.toHaveBeenCalled();
  });

  it('allows authenticated read access to a private repository', async () => {
    mockedFindRepository.mockResolvedValue({
      ...gitRepository,
      isPrivate: true,
    } as never);

    mockedVerifyPersonalAccessToken.mockResolvedValue({
      userId: 'user-2',
      username: 'testuser',
    });

    mockedAuthorizeRepositoryAccess.mockResolvedValue({
      permission: 'READ',
    } as never);

    mockSuccessfulGitBackend();

    const credentials = Buffer.from('testuser:gzp_testtoken').toString('base64');

    const response = await request(app)
      .get('/asil/demo.git/info/refs?service=git-upload-pack')
      .set('Authorization', `Basic ${credentials}`);

    expect(response.status).toBe(200);

    expect(mockedVerifyPersonalAccessToken).toHaveBeenCalledWith('testuser', 'gzp_testtoken');

    expect(mockedAuthorizeRepositoryAccess).toHaveBeenCalledWith('repo-1', 'READ', 'user-2');

    expect(mockedSpawn).toHaveBeenCalledOnce();
  });

  it('requires authentication for repository write access', async () => {
    mockedFindRepository.mockResolvedValue(gitRepository as never);

    const response = await request(app).get('/asil/demo.git/info/refs?service=git-receive-pack');

    expect(response.status).toBe(401);

    expect(response.body).toMatchObject({
      success: false,
      code: 'GIT_AUTH_REQUIRED',
      message: 'Git username and personal access token are required',
    });

    expect(response.headers['www-authenticate']).toBe('Basic realm="GitZone"');

    expect(mockedSpawn).not.toHaveBeenCalled();
  });

  it('allows write access when authorization succeeds', async () => {
    mockedFindRepository.mockResolvedValue(gitRepository as never);

    mockedVerifyPersonalAccessToken.mockResolvedValue({
      userId: 'user-2',
      username: 'testuser',
    });

    mockedAuthorizeRepositoryAccess.mockResolvedValue({
      permission: 'WRITE',
    } as never);

    mockSuccessfulGitBackend();

    const credentials = Buffer.from('testuser:gzp_testtoken').toString('base64');

    const response = await request(app)
      .get('/asil/demo.git/info/refs?service=git-receive-pack')
      .set('Authorization', `Basic ${credentials}`);

    expect(response.status).toBe(200);

    expect(mockedVerifyPersonalAccessToken).toHaveBeenCalledWith('testuser', 'gzp_testtoken');

    expect(mockedAuthorizeRepositoryAccess).toHaveBeenCalledWith('repo-1', 'WRITE', 'user-2');

    expect(mockedSpawn).toHaveBeenCalledOnce();
  });

  it('rejects write access when repository authorization fails', async () => {
    mockedFindRepository.mockResolvedValue(gitRepository as never);

    mockedVerifyPersonalAccessToken.mockResolvedValue({
      userId: 'user-2',
      username: 'testuser',
    });

    const { AuthError } = await import('../../../src/modules/auth/auth.errors.js');

    mockedAuthorizeRepositoryAccess.mockRejectedValue(
      new AuthError('Repository access denied', 403, 'REPOSITORY_ACCESS_DENIED'),
    );

    const credentials = Buffer.from('testuser:gzp_testtoken').toString('base64');

    const response = await request(app)
      .get('/asil/demo.git/info/refs?service=git-receive-pack')
      .set('Authorization', `Basic ${credentials}`);

    expect(response.status).toBe(403);

    expect(response.body).toMatchObject({
      success: false,
      code: 'REPOSITORY_ACCESS_DENIED',
      message: 'Repository access denied',
    });

    expect(mockedSpawn).not.toHaveBeenCalled();
  });

  it('returns 404 when repository does not exist', async () => {
    mockedFindRepository.mockResolvedValue(null);

    const response = await request(app).get('/asil/missing.git/info/refs?service=git-upload-pack');

    expect(response.status).toBe(404);

    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'REPOSITORY_NOT_FOUND',
        message: 'Repository not found',
      },
    });

    expect(mockedSpawn).not.toHaveBeenCalled();
  });

  it('passes correct CGI environment to git-http-backend', async () => {
    mockedFindRepository.mockResolvedValue(gitRepository as never);

    mockedAuthorizeRepositoryAccess.mockResolvedValue({
      permission: 'PUBLIC',
    } as never);

    mockSuccessfulGitBackend();

    const response = await request(app).get('/asil/demo.git/info/refs?service=git-upload-pack');

    expect(response.status).toBe(200);

    expect(mockedSpawn).toHaveBeenCalledWith(
      '/usr/lib/git-core/git-http-backend',
      [],
      expect.objectContaining({
        env: expect.objectContaining({
          GIT_HTTP_EXPORT_ALL: '1',
          PATH_INFO: '/asil/demo.git/info/refs',
          REQUEST_METHOD: 'GET',
          QUERY_STRING: 'service=git-upload-pack',
          REMOTE_USER: 'asil',
        }),
      }),
    );
  });
});
