import { Router } from 'express';
import { getAllUsers } from '@/controllers/users.controller';
import { authenticateJWT } from '@/middlewares/auth.middleware';

const router = Router();

router.get('/', authenticateJWT, getAllUsers);

export default router; 