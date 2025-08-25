import { Router } from 'express';
import { getAllUsers } from '@/controllers/users.controller';
import { authenticateJWT, requireAdmin } from '@/middlewares/auth.middleware';

const router = Router();

router.get('/', authenticateJWT, requireAdmin, getAllUsers);

export default router; 