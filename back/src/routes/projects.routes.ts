import { Router } from 'express';
import { 
  createProject, 
  getPaginatedProjects, 
  getProjectById, 
  getProjectDocuments,
  getProjectDocumentUrls,
  getProjectDocumentsListPage,
  downloadDocument,
  getConsolidatedData,
  deleteProject
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

/**
 * @route GET /api/projects/:projectUniqueId/document-urls
 * @description Récupère uniquement les URLs des documents d'un projet spécifique (pour les prompts d'IA)
 * @param projectUniqueId - Identifiant unique du projet
 * @returns {ProjectDocumentUrls} Liste des URLs des documents du projet
 */
router.get('/:projectUniqueId/document-urls', getProjectDocumentUrls);

/**
 * @route GET /api/projects/:projectUniqueId/documents-list
 * @description Génère une page HTML listant les documents d'un projet (pour l'IA)
 * @param projectUniqueId - Identifiant unique du projet
 * @returns {string} Page HTML avec la liste des documents
 */
router.get('/:projectUniqueId/documents-list', getProjectDocumentsListPage);

/**
 * @route GET /api/projects/:projectUniqueId/documents/:documentId/download
 * @description Télécharge un document directement depuis S3 (endpoint proxy pour Manus)
 */
router.get('/:projectUniqueId/documents/:documentId/download', downloadDocument);

/**
 * @route GET /api/projects/:projectUniqueId/consolidated-data
 * @description Récupère les données consolidées d'un projet
 */
router.get('/:projectUniqueId/consolidated-data', getConsolidatedData);

/**
 * @route POST /api/projects/delete
 * @description Supprime un projet et toutes ses données associées
 * @body { projectUniqueId: string }
 * @returns {DeleteProjectResponse} Résultat de la suppression
 */
router.post('/delete', deleteProject);

export default router; 