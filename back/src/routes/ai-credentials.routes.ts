import { Router } from 'express';
import { 
  getPaginatedAiCredentials,
  getAiCredentialById,
  createAiCredential,
  updateAiCredential,
  deleteAiCredential,
  getCredentialByPlatformAndUser
} from '../controllers/ai-credentials.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router();

// Routes protégées par authentification JWT
router.use(authenticateJWT);

// GET /api/ai-credentials - Liste tous les credentials avec pagination
router.get('/', getPaginatedAiCredentials);

// GET /api/ai-credentials/:id - Récupère un credential spécifique
router.get('/:id', getAiCredentialById);

// POST /api/ai-credentials - Crée un nouveau credential
router.post('/', createAiCredential);

// POST /api/ai-credentials/:id/update - Met à jour un credential
router.post('/:id/update', updateAiCredential);

// POST /api/ai-credentials/:id/delete - Supprime (désactive) un credential
router.post('/:id/delete', deleteAiCredential);

// GET /api/ai-credentials/platform/:platform/user/:userIdentifier - Récupère le credential actif pour une plateforme et un utilisateur
router.get('/platform/:platform/user/:userIdentifier', getCredentialByPlatformAndUser);

export default router; 