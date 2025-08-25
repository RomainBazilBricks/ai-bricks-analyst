import { Router } from 'express';
import { 
  getPaginatedApiConfigs,
  getApiConfigById,
  getActivePythonApiConfig,
  createApiConfig,
  updateApiConfig,
  deleteApiConfig,
  updatePythonApiConfig
} from '../controllers/api-config.controller';
import { authenticateJWT, requireAdmin } from '../middlewares/auth.middleware';

const router = Router();

// Toutes les routes nécessitent une authentification et autorisation admin
router.use(authenticateJWT, requireAdmin);

/**
 * @route GET /api/api-configs
 * @description Récupère toutes les configurations d'API avec pagination par cursor
 * @access Privé (authentification requise)
 */
router.get('/', getPaginatedApiConfigs);

/**
 * @route GET /api/api-configs/python/active
 * @description Récupère la configuration d'API Python active
 * @access Privé (authentification requise)
 */
router.get('/python/active', getActivePythonApiConfig);

/**
 * @route GET /api/api-configs/:id
 * @description Récupère une configuration d'API par son ID
 * @access Privé (authentification requise)
 */
router.get('/:id', getApiConfigById);

/**
 * @route POST /api/api-configs
 * @description Crée une nouvelle configuration d'API
 * @access Privé (authentification requise)
 */
router.post('/', createApiConfig);

/**
 * @route POST /api/api-configs/python/update
 * @description Met à jour la configuration de l'API Python
 * @access Privé (authentification requise)
 */
router.post('/python/update', updatePythonApiConfig);

/**
 * @route POST /api/api-configs/:id/update
 * @description Met à jour une configuration d'API
 * @access Privé (authentification requise)
 */
router.post('/:id/update', updateApiConfig);

/**
 * @route POST /api/api-configs/:id/delete
 * @description Supprime une configuration d'API (soft delete)
 * @access Privé (authentification requise)
 */
router.post('/:id/delete', deleteApiConfig);

export default router;
