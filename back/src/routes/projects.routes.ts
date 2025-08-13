import { Router } from 'express';
import { 
  createProject, 
  getPaginatedProjects, 
  getProjectById,
  getProjectDocuments
} from '@/controllers/projects.controller';

const router = Router();

/**
 * @route POST /api/projects
 * @description Crée un nouveau projet
 * @body { projectUniqueId: string, projectName: string, description: string, budgetTotal: number, estimatedRoi: number, startDate: string, fundingExpectedDate: string, fileUrls: string[] }
 * @returns {ProjectResponse} Projet créé
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
 * @route GET /api/projects/:projectUniqueId
 * @description Récupère un projet spécifique par son ID
 * @param projectUniqueId - Identifiant unique du projet
 * @returns {ProjectResponse} Projet trouvé
 */
router.get('/:projectUniqueId', getProjectById);

/**
 * @route GET /api/projects/:projectUniqueId/documents
 * @description Récupère les documents d'un projet spécifique
 * @param projectUniqueId - Identifiant unique du projet
 * @returns {DocumentResponse[]} Liste des documents du projet
 */
router.get('/:projectUniqueId/documents', getProjectDocuments);

export default router; 