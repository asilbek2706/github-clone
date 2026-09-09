import type { Request, Response } from 'express';

import { AuthError } from '../auth/auth.errors.js';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import {
  createRepository,
  deleteRepository,
  getRepositoryByUsernameAndName,
  getUserRepositories,
  updateRepository,
} from './repository.service.js';
import {
  createRepositorySchema,
  updateRepositorySchema,
} from './repository.validation.js';

export const create = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const authenticatedReq = req as AuthenticatedRequest;

  const parsed = createRepositorySchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AuthError(
      'Invalid repository data',
      400,
      'INVALID_REPOSITORY_DATA',
    );
  }

  const repository = await createRepository(
    authenticatedReq.userId,
    parsed.data,
  );

  res.status(201).json({
    success: true,
    data: {
      repository,
    },
  });
};

export const listMine = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const authenticatedReq = req as AuthenticatedRequest;

  const repositories = await getUserRepositories(
    authenticatedReq.userId,
  );

  res.status(200).json({
    success: true,
    data: {
      repositories,
    },
  });
};

export const getOne = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { username, name } = req.params;

  if (
    typeof username !== 'string' ||
    typeof name !== 'string'
  ) {
    throw new AuthError(
      'Username and repository name are required',
      400,
      'INVALID_REPOSITORY_PARAMS',
    );
  }

  const repository = await getRepositoryByUsernameAndName(
    username,
    name,
  );

  res.status(200).json({
    success: true,
    data: {
      repository,
    },
  });
};

export const update = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const authenticatedReq = req as AuthenticatedRequest;
  const { id } = req.params;

  if (typeof id !== 'string') {
    throw new AuthError(
      'Repository id is required',
      400,
      'INVALID_REPOSITORY_ID',
    );
  }

  const parsed = updateRepositorySchema.safeParse(req.body);

  if (!parsed.success) {
    throw new AuthError(
      'Invalid repository data',
      400,
      'INVALID_REPOSITORY_DATA',
    );
  }

  const repository = await updateRepository(
    authenticatedReq.userId,
    id,
    parsed.data,
  );

  res.status(200).json({
    success: true,
    data: {
      repository,
    },
  });
};

export const remove = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const authenticatedReq = req as AuthenticatedRequest;
  const { id } = req.params;

  if (typeof id !== 'string') {
    throw new AuthError(
      'Repository id is required',
      400,
      'INVALID_REPOSITORY_ID',
    );
  }

  await deleteRepository(
    authenticatedReq.userId,
    id,
  );

  res.status(200).json({
    success: true,
    message: 'Repository deleted successfully',
  });
};
