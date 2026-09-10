import type { Request, Response } from 'express';
import { spawn } from 'node:child_process';
import path from 'node:path';

const storagePath = process.env.GIT_STORAGE_PATH;

if (!storagePath) {
  throw new Error('GIT_STORAGE_PATH is not defined');
}

const GIT_PROJECT_ROOT = path.resolve(process.cwd(), storagePath);

export const gitHttpController = (
  req: Request,
  res: Response,
): void => {
  const { username, repository } = req.params;

  const pathInfo = `/${username}/${repository}.git${req.path}`;

  console.log('[Git HTTP]', {
  method: req.method,
  path: req.path,
  originalUrl: req.originalUrl,
  username,
  repository,
  pathInfo,
  gitProjectRoot: GIT_PROJECT_ROOT,
});

  const child = spawn('/usr/lib/git-core/git-http-backend', [], {
    env: {
      ...process.env,
      GIT_PROJECT_ROOT,
      PATH_INFO: pathInfo,
      REQUEST_METHOD: req.method,
      QUERY_STRING: req.originalUrl.split('?')[1] ?? '',
      CONTENT_TYPE: req.headers['content-type'] ?? '',
      CONTENT_LENGTH: req.headers['content-length'] ?? '',
      REMOTE_USER: '',
    },
  });

  let headersSent = false;
  let headerBuffer = '';

  child.stdout.on('data', (chunk: Buffer) => {
    if (headersSent) {
      res.write(chunk);
      return;
    }

    headerBuffer += chunk.toString();

    const headerEnd = headerBuffer.indexOf('\r\n\r\n');

    if (headerEnd === -1) {
      return;
    }

    const rawHeaders = headerBuffer.slice(0, headerEnd);
    const body = Buffer.from(
      headerBuffer.slice(headerEnd + 4),
    );

    const headers = rawHeaders.split('\r\n');

    for (const header of headers) {
      const separatorIndex = header.indexOf(':');

      if (separatorIndex === -1) {
        continue;
      }

      const name = header.slice(0, separatorIndex).trim();
      const value = header.slice(separatorIndex + 1).trim();

      if (name.toLowerCase() === 'status') {
        const statusCode = Number.parseInt(value, 10);

        if (!Number.isNaN(statusCode)) {
          res.status(statusCode);
        }
      } else {
        res.setHeader(name, value);
      }
    }

    headersSent = true;

    if (body.length > 0) {
      res.write(body);
    }
  });

  child.stderr.on('data', (chunk: Buffer) => {
    console.error(
      '[git-http-backend]',
      chunk.toString(),
    );
  });

  child.on('error', (error) => {
    console.error(
      '[git-http-backend] process error:',
      error,
    );

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Git HTTP backend error',
      });
    }
  });

  child.on('close', (code) => {
    if (!res.writableEnded) {
      if (code !== 0 && !res.headersSent) {
        res.status(500);
      }

      res.end();
    }
  });

  req.pipe(child.stdin);
};
