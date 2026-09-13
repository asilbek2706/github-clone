import { Router } from 'express';

import { authMiddleware } from '../../middleware/auth.middleware.js';
import {
  createToken,
  listTokens,
  login,
  logout,
  me,
  refresh,
  register,
  revokeToken,
} from './auth.controller.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh', refresh);
router.get('/me', authMiddleware, me);

router.get('/tokens', authMiddleware, listTokens);
router.post('/tokens', authMiddleware, createToken);
router.delete('/tokens/:tokenId', authMiddleware, revokeToken);

export default router;
