import { Router } from 'express';
import {
  checkOpenRouterHealth,
  getAvailableModels,
  testModel,
  callGPT4o,
  quickTestGPT4o
} from '../controllers/openrouter.controller';
import { authenticateJWT, requireAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Appliquer l'authentification et l'autorisation admin à toutes les routes
router.use(authenticateJWT, requireAdmin);

/**
 * Routes OpenRouter
 */

// Test de connectivité
router.get('/health', checkOpenRouterHealth);

// Liste des modèles disponibles
router.get('/models', getAvailableModels);

// Test d'un modèle avec prompt personnalisé
router.post('/test', testModel);

// Appel spécifique à GPT-4o
router.post('/gpt4o', callGPT4o);

// Test rapide GPT-4o
router.get('/gpt4o/quick-test', quickTestGPT4o);

export default router;
