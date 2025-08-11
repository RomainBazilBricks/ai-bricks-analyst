import { Router } from 'express';
import { 
  createProject, 
  getPaginatedProjects, 
  getProjectDocuments, 
  postSynthesis,
  getProjectFiles,
  getProjectById,
  updateProjectConversationUrl
} from '@/controllers/projects.controller';

const router = Router();

/**
 * @route POST /api/projects
 * @description Crée un nouveau projet et télécharge les fichiers depuis les URLs fournies
 * @body { projectUniqueId: string, fileUrls: string[] }
 * @returns {ProjectWithDocumentsResponse} Projet créé avec ses documents
 */
router.post('/', createProject);

/**
 * @route GET /api/projects
 * @description Récupère tous les projets avec pagination par cursor
 * @query cursor?: string, limit?: number, direction?: 'next' | 'prev'
 * @returns {PaginatedProjectsResponse} Liste paginée des projets
 */
router.get('/', getPaginatedProjects);

/**
 * @route GET /api/projects/files
 * @description Récupère les URLs des fichiers d'un projet spécifique ou de tous les projets
 * @query projectUniqueId?: string - Identifiant unique du projet (optionnel)
 * @returns {AllProjectFilesResponse | SingleProjectFilesResponse} URLs des fichiers
 */
router.get('/files', getProjectFiles);

/**
 * @route POST /api/projects/synthesis
 * @description Reçoit une synthèse de ManusAI et l'associe au projet
 * @body { projectUniqueId: string, synthesis: string, manusConversationUrl?: string }
 * @returns {SynthesisResponse} Synthèse créée
 */
router.post('/synthesis', postSynthesis);

/**
 * @route POST /api/projects/conversation-url
 * @description Met à jour l'URL de conversation d'un projet
 * @body { projectUniqueId: string, conversationUrl: string }
 * @returns {ProjectResponse} Projet mis à jour
 */
router.post('/conversation-url', updateProjectConversationUrl);

/**
 * @route GET /api/projects/:projectUniqueId
 * @description Récupère un projet spécifique avec tous ses détails
 * @param projectUniqueId - Identifiant unique du projet
 * @returns {ProjectWithDocumentsResponse} Projet avec documents et synthèses
 */
router.get('/:projectUniqueId', getProjectById);

/**
 * @route GET /api/projects/:projectUniqueId/documents
 * @description Récupère les documents d'un projet avec URLs pré-signées pour ManusAI
 * @param projectUniqueId - Identifiant unique du projet
 * @returns {DocumentResponse[]} Liste des documents avec URLs pré-signées
 */
router.get('/:projectUniqueId/documents', getProjectDocuments);

export default router; 