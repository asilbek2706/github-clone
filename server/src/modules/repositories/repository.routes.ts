import { Router } from 'express';

import { authMiddleware } from '../../middleware/auth.middleware.js';
import {
  create,
  getOne,
  listByUsername,
  remove,
  update,
} from './repository.controller.js';

const router = Router();

router.post('/', authMiddleware, create);
router.get('/:username', listByUsername);
router.get('/:username/:name', getOne);
router.patch('/:username/:name', authMiddleware, update);
router.delete('/:username/:name', authMiddleware, remove);

export default router;