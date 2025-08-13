import { Request, Response } from 'express';
import { eq, desc, gt, lt, asc } from 'drizzle-orm';
import { db } from '@/db/index';
import { projects, sessions, documents, CreateProjectSchema } from '@/db/schema';
import { initiateWorkflowForProject } from '@/controllers/workflow.controller';
import type { 
  CreateProjectInput, 
  ProjectResponse, 
  PaginatedProjectsResponse,
  ProjectWithDocumentsResponse,
  DocumentResponse
} from '@shared/types/projects';

/**
 * Crée un nouveau projet
 * @route POST /api/projects
 * @param {CreateProjectInput} req.body - Données du projet
 * @returns {ProjectResponse} Projet créé
 */
export const createProject = async (req: Request, res: Response): Promise<any> => {
  try {
    // Validation des données d'entrée
    const validatedData = CreateProjectSchema.parse(req.body);
    const projectData: CreateProjectInput = validatedData;

    // Créer le projet
    const newProject = await db
      .insert(projects)
      .values({
        projectUniqueId: projectData.projectUniqueId,
        projectName: projectData.projectName,
        description: projectData.description,
        budgetTotal: projectData.budgetTotal.toString(),
        estimatedRoi: projectData.estimatedRoi.toString(),
        startDate: new Date(projectData.startDate),
        fundingExpectedDate: new Date(projectData.fundingExpectedDate),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    const response: ProjectResponse = {
      ...newProject[0],
      budgetTotal: parseFloat(newProject[0].budgetTotal),
      estimatedRoi: parseFloat(newProject[0].estimatedRoi),
    } as ProjectResponse;

    // Initier automatiquement le workflow d'analyse
    try {
      const workflowResult = await initiateWorkflowForProject(projectData.projectUniqueId);
      if (workflowResult.success) {
        console.log(`✅ Workflow initié automatiquement pour le projet ${projectData.projectUniqueId} avec ${workflowResult.stepsCreated} étapes`);
      } else {
        console.warn(`⚠️ Impossible d'initier le workflow pour le projet ${projectData.projectUniqueId}: ${workflowResult.error}`);
      }
    } catch (workflowError) {
      // Ne pas faire échouer la création du projet si le workflow échoue
      console.error(`❌ Erreur lors de l'initiation automatique du workflow pour le projet ${projectData.projectUniqueId}:`, workflowError);
    }

    res.status(201).json(response);
    
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'PROJECT_CREATION_ERROR'
    });
  }
};

/**
 * Récupère tous les projets avec pagination par cursor
 * @route GET /api/projects
 * @param {string} cursor - Cursor pour la pagination
 * @param {number} limit - Nombre d'éléments par page (max 100)
 * @param {string} direction - Direction de pagination ('next' | 'prev')
 * @returns {PaginatedProjectsResponse} Liste paginée des projets
 */
export const getPaginatedProjects = async (req: Request, res: Response): Promise<any> => {
  const { cursor, limit = 10, direction = 'next' } = req.query;
  
  try {
    const query = db.select().from(projects);
    
    if (cursor) {
      const condition = direction === 'next' 
        ? gt(projects.projectUniqueId, String(cursor))
        : lt(projects.projectUniqueId, String(cursor));
      query.where(condition);
    }
    
    const results = await query
      .orderBy(direction === 'next' ? asc(projects.projectUniqueId) : desc(projects.projectUniqueId))
      .limit(Number(limit) + 1);
    
    const hasMore = results.length > Number(limit);
    const items = hasMore ? results.slice(0, -1) : results;
    const nextCursor = hasMore ? items[items.length - 1].projectUniqueId : null;
    
    // Convertir les types numériques
    const formattedItems: ProjectResponse[] = items.map(item => ({
      ...item,
      budgetTotal: parseFloat(item.budgetTotal),
      estimatedRoi: parseFloat(item.estimatedRoi),
    } as ProjectResponse));
    
    const response: PaginatedProjectsResponse = {
      items: formattedItems,
      nextCursor,
      hasMore
    };
    
    res.json(response);
  } catch (error) {
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};

/**
 * Récupère un projet spécifique par son ID
 * @route GET /api/projects/:projectUniqueId
 * @param {string} projectUniqueId - Identifiant unique du projet
 * @returns {ProjectResponse} Projet trouvé
 */
export const getProjectById = async (req: Request, res: Response): Promise<any> => {
  try {
    const { projectUniqueId } = req.params;

    // Trouver le projet
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.projectUniqueId, projectUniqueId))
      .limit(1);

    if (project.length === 0) {
      return res.status(404).json({ 
        error: 'Project not found',
        code: 'PROJECT_NOT_FOUND'
      });
    }

    const response: ProjectResponse = {
      ...project[0],
      budgetTotal: parseFloat(project[0].budgetTotal),
      estimatedRoi: parseFloat(project[0].estimatedRoi),
    } as ProjectResponse;

    res.json(response);
    
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'FETCH_PROJECT_ERROR'
    });
  }
};

/**
 * Récupère les documents d'un projet spécifique
 * @route GET /api/projects/:projectUniqueId/documents
 * @param {string} projectUniqueId - Identifiant unique du projet
 * @returns {DocumentResponse[]} Liste des documents du projet
 */
export const getProjectDocuments = async (req: Request, res: Response): Promise<any> => {
  try {
    const { projectUniqueId } = req.params;

    // Vérifier que le projet existe
    const project = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.projectUniqueId, projectUniqueId))
      .limit(1);

    if (project.length === 0) {
      return res.status(404).json({ 
        error: 'Project not found',
        code: 'PROJECT_NOT_FOUND'
      });
    }

    // Récupérer les documents via les sessions (temporairement vide si erreur)
    let projectDocuments: any[] = [];
    
    try {
      projectDocuments = await db
        .select({
          id: documents.id,
          fileName: documents.fileName,
          url: documents.url,
          hash: documents.hash,
          mimeType: documents.mimeType,
          size: documents.size,
          uploadedAt: documents.uploadedAt,
        })
        .from(documents)
        .innerJoin(sessions, eq(documents.sessionId, sessions.id))
        .where(eq(sessions.projectId, project[0].id));
    } catch (dbError) {
      console.warn('Error fetching documents (returning empty array):', dbError);
      // Retourner un tableau vide si les tables n'existent pas encore
    }

    const response: DocumentResponse[] = projectDocuments.map(doc => ({
      ...doc,
      projectId: project[0].id, // Ajouter projectId pour compatibilité avec le type
    })) as DocumentResponse[];

    res.json(response);
    
  } catch (error) {
    console.error('Error fetching project documents:', error);
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'FETCH_DOCUMENTS_ERROR'
    });
  }
}; 