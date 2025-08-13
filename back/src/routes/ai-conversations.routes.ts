import express from 'express';
import {
  saveAIConversation,
  getAIConversationsByProject,
  getLatestAIConversation
} from '@/controllers/ai-conversations.controller';

const router = express.Router();

/**
 * Sauvegarde une URL de conversation IA liée à un projet
 * @route POST /api/ai-conversations
 * @param {SaveConversationInput} body - Données de la conversation IA
 * @returns {ConversationResponse} Conversation IA sauvegardée
 * @access Public (pour les outils externes IA)
 */
router.post('/', saveAIConversation);

/**
 * Récupère toutes les conversations IA liées à un projet
 * @route GET /api/ai-conversations/project/:projectUniqueId
 * @param {string} projectUniqueId - Identifiant unique du projet
 * @returns {ConversationResponse[]} Liste des conversations IA
 * @access Public (temporaire)
 */
router.get('/project/:projectUniqueId', getAIConversationsByProject);

/**
 * Récupère la dernière conversation IA d'un projet
 * @route GET /api/ai-conversations/project/:projectUniqueId/latest
 * @param {string} projectUniqueId - Identifiant unique du projet
 * @returns {ConversationResponse | null} Dernière conversation IA ou null
 * @access Public (temporaire)
 */
router.get('/project/:projectUniqueId/latest', getLatestAIConversation);

export default router;
