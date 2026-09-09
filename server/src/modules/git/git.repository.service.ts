import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

import { AuthError } from '../auth/auth.errors.js';

const execFileAsync = promisify(execFile);

const GIT_STORAGE_PATH = path.resolve(
  process.cwd(),
  'storage',
  'repositories',
);

const getRepositoryPath = (
  username: string,
  repositoryName: string,
): string => {
  return path.join(
    GIT_STORAGE_PATH,
    username,
    `${repositoryName}.git`,
  );
};

export const createGitRepository = async (
  username: string,
  repositoryName: string,
): Promise<string> => {
  const repositoryPath = getRepositoryPath(
    username,
    repositoryName,
  );

  try {
    await execFileAsync('git', ['init', '--bare', repositoryPath]);
  } catch {
    throw new AuthError(
      'Failed to create Git repository',
      500,
      'GIT_REPOSITORY_CREATE_FAILED',
    );
  }

  return repositoryPath;
};
