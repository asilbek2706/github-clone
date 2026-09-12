import { Router } from 'express';

import { authMiddleware } from '../../middleware/auth.middleware.js';
import { createToken, login, logout, me, refresh, register } from './auth.controller.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh', refresh);
router.get('/me', authMiddleware, me);
router.post('/tokens', authMiddleware, createToken);

export default router;
