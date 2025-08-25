/**
 * Routes pour tester les notifications Slack
 */

import { Router } from 'express';
import { 
  testSlackConnection, 
  sendTestMessage, 
  testAllAlerts, 
  testSpecificAlert 
} from '@/controllers/slack-test.controller';
import { authenticateJWT, requireAdmin } from '@/middlewares/auth.middleware';

const router = Router();

// Appliquer l'authentification et l'autorisation admin à toutes les routes
router.use(authenticateJWT, requireAdmin);

/**
 * @route GET /api/slack/test-connection
 * @desc Teste la connexion Slack
 * @access Public (pour tests)
 */
router.get('/test-connection', testSlackConnection);

/**
 * @route POST /api/slack/test-message
 * @desc Envoie un message de test
 * @body { message: string, channel?: string }
 * @access Public (pour tests)
 */
router.post('/test-message', sendTestMessage);

/**
 * @route POST /api/slack/test-alerts
 * @desc Teste toutes les alertes critiques
 * @access Public (pour tests)
 */
router.post('/test-alerts', testAllAlerts);

/**
 * @route POST /api/slack/test-alert/:alertType
 * @desc Teste une alerte spécifique
 * @param alertType - Type d'alerte à tester
 * @body { projectId?: string, projectName?: string, message?: string }
 * @access Public (pour tests)
 */
router.post('/test-alert/:alertType', testSpecificAlert);

export default router;
