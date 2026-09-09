import { Router } from 'express';

import { authMiddleware } from '../../middleware/auth.middleware.js';
import {
  login,
  me,
  refresh,
  register,
} from './auth.controller.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.get('/me', authMiddleware, me);

export default router;
