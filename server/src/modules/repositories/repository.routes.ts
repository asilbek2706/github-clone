import { Router } from 'express';

import { authMiddleware } from '../../middleware/auth.middleware.js';
import {
  create,
  getOne,
  listMine,
  remove,
  update,
} from './repository.controller.js';

const router = Router();

router.post('/', authMiddleware, create);
router.get('/', authMiddleware, listMine);
router.get('/:username/:name', getOne);
router.patch('/:id', authMiddleware, update);
router.delete('/:id', authMiddleware, remove);

export default router;

