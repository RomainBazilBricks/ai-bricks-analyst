import { Request, Response } from 'express';
import { eq, desc, gt, lt, asc, and } from 'drizzle-orm';
import { db } from '@/db/index';
import { 
  projects, 
  sessions, 
  documents, 
  CreateProjectSchema,
  conversations_with_ai,
  project_owners,
  companies,
  missing_documents,
  vigilance_points,
  conversations,
  project_analysis_workflow,
  consolidated_data
} from '@/db/schema';
import { initiateWorkflowForProject } from '@/controllers/workflow.controller';
import { uploadFileFromUrl, s3Client } from '@/lib/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import type { 
  CreateProjectInput, 
  ProjectResponse, 
  PaginatedProjectsResponse,
  ProjectWithDocumentsResponse,
  DocumentResponse,
  ProjectDocumentUrls,
  DeleteProjectInput,
  DeleteProjectResponse
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

    // Vérifier si le projet existe déjà
    let existingProject = await db
      .select()
      .from(projects)
      .where(eq(projects.projectUniqueId, projectData.projectUniqueId))
      .limit(1);

    let project;
    let isNewProject = false;

    if (existingProject.length > 0) {
      // Le projet existe déjà, on l'utilise
      project = existingProject[0];
      console.log(`📁 Projet existant trouvé: ${projectData.projectUniqueId}`);
    } else {
      // Créer le nouveau projet
      const newProject = await db
        .insert(projects)
        .values({
          projectUniqueId: projectData.projectUniqueId,
          projectName: projectData.projectName,
          description: projectData.description || '',
          budgetTotal: (projectData.budgetTotal || 0).toString(),
          estimatedRoi: (projectData.estimatedRoi || 0).toString(),
          startDate: new Date(projectData.startDate || new Date().toISOString()),
          fundingExpectedDate: new Date(projectData.fundingExpectedDate || new Date().toISOString()),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      
      project = newProject[0];
      isNewProject = true;
      console.log(`✅ Nouveau projet créé: ${projectData.projectUniqueId}`);
    }

    // Créer une nouvelle session (que le projet soit nouveau ou existant)
    const newSession = await db
      .insert(sessions)
      .values({
        projectId: project.id,
        name: `Session ${new Date().toLocaleString('fr-FR')}`,
        description: `Session créée automatiquement avec ${projectData.fileUrls.length} fichier(s)`,
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    console.log(`📝 Nouvelle session créée: ${newSession[0].id}`);

    // Ajouter les fichiers à la nouvelle session avec conversion S3
    if (projectData.fileUrls && projectData.fileUrls.length > 0) {
      const documentsToInsert = [];
      
      for (let index = 0; index < projectData.fileUrls.length; index++) {
        const bubbleUrl = projectData.fileUrls[index];
        
        try {
          console.log(`📥 Conversion S3 du document ${index + 1}/${projectData.fileUrls.length}: ${bubbleUrl}`);
          
          // Convertir l'URL Bubble vers S3
          const s3Result = await uploadFileFromUrl(
            bubbleUrl,
            projectData.projectUniqueId,
            `Document_${index + 1}`
          );
          
          documentsToInsert.push({
            sessionId: newSession[0].id,
            fileName: s3Result.fileName,
            url: s3Result.s3Url, // ✅ URL S3 au lieu de Bubble
            hash: s3Result.hash,
            mimeType: s3Result.mimeType,
            size: s3Result.size,
            status: 'PROCESSED' as const, // Statut PROCESSED car converti vers S3
            uploadedAt: new Date(),
          });
          
          console.log(`✅ Document ${index + 1} converti vers S3: ${s3Result.s3Url}`);
          
        } catch (error) {
          console.error(`❌ Erreur conversion S3 document ${index + 1}:`, error);
          
          // En cas d'erreur, stocker l'URL Bubble avec statut ERROR
          documentsToInsert.push({
            sessionId: newSession[0].id,
            fileName: `Document_${index + 1}_ERROR`,
            url: bubbleUrl, // URL Bubble en fallback
            hash: `error-${Date.now()}-${index}`,
            mimeType: 'application/pdf',
            size: 0,
            status: 'ERROR' as const,
            uploadedAt: new Date(),
          });
        }
      }

      if (documentsToInsert.length > 0) {
        const insertedDocuments = await db
          .insert(documents)
          .values(documentsToInsert)
          .returning();

        const successCount = insertedDocuments.filter(doc => doc.status === 'PROCESSED').length;
        const errorCount = insertedDocuments.filter(doc => doc.status === 'ERROR').length;
        
        console.log(`📎 ${insertedDocuments.length} fichier(s) ajouté(s) à la session ${newSession[0].id}`);
        console.log(`✅ ${successCount} converti(s) vers S3, ❌ ${errorCount} en erreur`);
      }
    }

    const response: ProjectResponse = {
      ...project,
      budgetTotal: parseFloat(project.budgetTotal),
      estimatedRoi: parseFloat(project.estimatedRoi),
    } as ProjectResponse;

    // Initier automatiquement le workflow d'analyse seulement pour les nouveaux projets
    if (isNewProject) {
      try {
        const workflowResult = await initiateWorkflowForProject(projectData.projectUniqueId);
        if (workflowResult.success) {
          console.log(`✅ Workflow initié automatiquement pour le nouveau projet ${projectData.projectUniqueId} avec ${workflowResult.stepsCreated} étapes`);
        } else {
          console.warn(`⚠️ Impossible d'initier le workflow pour le projet ${projectData.projectUniqueId}: ${workflowResult.error}`);
        }
      } catch (workflowError) {
        // Ne pas faire échouer la création du projet si le workflow échoue
        console.error(`❌ Erreur lors de l'initiation automatique du workflow pour le projet ${projectData.projectUniqueId}:`, workflowError);
      }
    } else {
      console.log(`📁 Projet existant: pas d'initiation de workflow`);
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
          status: documents.status,
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

/**
 * Récupère uniquement les URLs des documents d'un projet spécifique (pour les prompts d'IA)
 * @route GET /api/projects/:projectUniqueId/document-urls
 * @param {string} projectUniqueId - Identifiant unique du projet
 * @returns {ProjectDocumentUrls} Liste des URLs des documents du projet
 */
export const getProjectDocumentUrls = async (req: Request, res: Response): Promise<any> => {
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

    // Récupérer uniquement les URLs des documents via les sessions
    let documentUrls: string[] = [];
    
    try {
      const projectDocuments = await db
        .select({
          url: documents.url,
        })
        .from(documents)
        .innerJoin(sessions, eq(documents.sessionId, sessions.id))
        .where(eq(sessions.projectId, project[0].id));

      documentUrls = projectDocuments.map(doc => doc.url);
    } catch (dbError) {
      console.warn('Error fetching document URLs (returning empty array):', dbError);
      // Retourner un tableau vide si les tables n'existent pas encore
    }

    const response: ProjectDocumentUrls = {
      projectUniqueId,
      documentUrls
    };

    res.json(response);
    
  } catch (error) {
    console.error('Error fetching project document URLs:', error);
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'FETCH_DOCUMENT_URLS_ERROR'
    });
  }
};

/**
 * Génère une page HTML simple listant les documents d'un projet (pour l'IA)
 * @route GET /api/projects/:projectUniqueId/documents-list
 * @param {string} projectUniqueId - Identifiant unique du projet
 * @returns {string} Page HTML avec la liste des documents
 */
export const getProjectDocumentsListPage = async (req: Request, res: Response): Promise<any> => {
  try {
    const { projectUniqueId } = req.params;

    // Vérifier que le projet existe
    const project = await db
      .select({ id: projects.id, projectName: projects.projectName })
      .from(projects)
      .where(eq(projects.projectUniqueId, projectUniqueId))
      .limit(1);

    if (project.length === 0) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Projet non trouvé</title>
          <meta charset="utf-8">
        </head>
        <body>
          <h1>Erreur 404</h1>
          <p>Le projet "${projectUniqueId}" n'existe pas.</p>
        </body>
        </html>
      `);
    }

    // Récupérer les documents du projet
    let projectDocuments: any[] = [];
    
    try {
      projectDocuments = await db
        .select({
          id: documents.id,
          fileName: documents.fileName,
          url: documents.url,
          mimeType: documents.mimeType,
          size: documents.size,
          uploadedAt: documents.uploadedAt,
        })
        .from(documents)
        .innerJoin(sessions, eq(documents.sessionId, sessions.id))
        .where(eq(sessions.projectId, project[0].id))
        .orderBy(asc(documents.uploadedAt));
    } catch (dbError) {
      console.warn('Error fetching documents for list page:', dbError);
    }

    // Générer la liste avec les endpoints proxy (plus fiables pour Manus)
    const baseUrl = process.env.API_BASE_URL || 'https://ai-bricks-analyst-production.up.railway.app';
    const documentsList = projectDocuments.length > 0 
      ? projectDocuments.map(doc => {
          const proxyUrl = `${baseUrl}/api/projects/${projectUniqueId}/documents/${doc.id}/download`;
          return `<li><a href="${proxyUrl}" target="_blank">${doc.fileName} (${doc.mimeType})</a></li>`;
        }).join('')
      : '<li>Aucun document disponible pour ce projet.</li>';

    const htmlPage = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <title>Documents - ${project[0].projectName}</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            line-height: 1.6;
          }
          ul { 
            list-style-type: none; 
            padding: 0; 
          }
          li { 
            margin-bottom: 10px; 
          }
          a { 
            color: #0066cc; 
            text-decoration: none;
            word-break: break-all;
          }
          a:hover { 
            text-decoration: underline; 
          }
        </style>
      </head>
      <body>
        <ul>
          ${documentsList}
        </ul>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(htmlPage);
    
  } catch (error) {
    console.error('Error generating documents list page:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Erreur</title>
        <meta charset="utf-8">
      </head>
      <body>
        <h1>Erreur 500</h1>
        <p>Une erreur est survenue lors de la génération de la page.</p>
        <p>Détails: ${(error as Error).message}</p>
      </body>
      </html>
    `);
  }
};

/**
 * Sert un document directement depuis S3 (endpoint proxy pour Manus)
 * @route GET /api/projects/:projectUniqueId/documents/:documentId/download
 * @param {string} projectUniqueId - Identifiant unique du projet
 * @param {string} documentId - Identifiant du document
 * @returns Document binaire avec les bons headers
 */
export const downloadDocument = async (req: Request, res: Response): Promise<any> => {
  try {
    const { projectUniqueId, documentId } = req.params;

    // Vérifier que le projet existe
    const project = await db
      .select({ id: projects.id, projectName: projects.projectName })
      .from(projects)
      .where(eq(projects.projectUniqueId, projectUniqueId))
      .limit(1);

    if (project.length === 0) {
      return res.status(404).json({ 
        error: 'Project not found',
        code: 'PROJECT_NOT_FOUND'
      });
    }

    // Récupérer le document spécifique
    const document = await db
      .select({
        id: documents.id,
        fileName: documents.fileName,
        url: documents.url,
        mimeType: documents.mimeType,
        size: documents.size,
      })
      .from(documents)
      .innerJoin(sessions, eq(documents.sessionId, sessions.id))
      .where(and(
        eq(sessions.projectId, project[0].id),
        eq(documents.id, documentId)
      ))
      .limit(1);

    if (document.length === 0) {
      return res.status(404).json({ 
        error: 'Document not found',
        code: 'DOCUMENT_NOT_FOUND'
      });
    }

    const doc = document[0];
    
    // Extraire la clé S3 depuis l'URL
    const s3Url = doc.url;
    const bucketName = process.env.AWS_S3_BUCKET_NAME!;
    const region = process.env.AWS_S3_REGION || 'eu-north-1';
    
    // Pattern: https://bucket.s3.region.amazonaws.com/key
    const s3UrlPattern = new RegExp(`https://${bucketName}\\.s3\\.${region}\\.amazonaws\\.com/(.+)`);
    const match = s3Url.match(s3UrlPattern);
    
    if (!match) {
      return res.status(400).json({ 
        error: 'Invalid S3 URL format',
        code: 'INVALID_S3_URL'
      });
    }
    
    const s3Key = match[1];
    
    console.log(`📥 Téléchargement document: ${doc.fileName} (${s3Key})`);
    
    // Récupérer le fichier depuis S3
    const getCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
    });
    
    const s3Response = await s3Client.send(getCommand);
    
    if (!s3Response.Body) {
      return res.status(404).json({ 
        error: 'Document content not found',
        code: 'DOCUMENT_CONTENT_NOT_FOUND'
      });
    }
    
    // Configurer les headers de réponse
    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${doc.fileName}"`);
    res.setHeader('Content-Length', doc.size.toString());
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache 1h
    
    // Stream le contenu
    const stream = s3Response.Body as any;
    stream.pipe(res);
    
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'DOCUMENT_DOWNLOAD_ERROR'
    });
  }
};

/**
 * Récupère les données consolidées d'un projet
 * @route GET /api/projects/:projectUniqueId/consolidated-data
 * @param {string} projectUniqueId - Identifiant unique du projet
 * @returns {ConsolidatedData} Données consolidées du projet
 */
export const getConsolidatedData = async (req: Request, res: Response): Promise<any> => {
  try {
    const { projectUniqueId } = req.params;

    // Vérifier que le projet existe
    const project = await db
      .select({ id: projects.id, projectName: projects.projectName })
      .from(projects)
      .where(eq(projects.projectUniqueId, projectUniqueId))
      .limit(1);

    if (project.length === 0) {
      return res.status(404).json({ 
        error: 'Project not found',
        code: 'PROJECT_NOT_FOUND'
      });
    }

    // Récupérer les données consolidées
    const consolidatedData = await db
      .select()
      .from(consolidated_data)
      .where(eq(consolidated_data.projectId, project[0].id))
      .limit(1);

    if (consolidatedData.length === 0) {
      return res.status(404).json({ 
        error: 'Consolidated data not found for this project',
        code: 'CONSOLIDATED_DATA_NOT_FOUND'
      });
    }

    // Convertir les types numériques
    const formattedData = {
      ...consolidatedData[0],
      financialAcquisitionPrice: consolidatedData[0].financialAcquisitionPrice ? parseFloat(consolidatedData[0].financialAcquisitionPrice) : null,
      financialWorksCost: consolidatedData[0].financialWorksCost ? parseFloat(consolidatedData[0].financialWorksCost) : null,
      financialPlannedResalePrice: consolidatedData[0].financialPlannedResalePrice ? parseFloat(consolidatedData[0].financialPlannedResalePrice) : null,
      financialPersonalContribution: consolidatedData[0].financialPersonalContribution ? parseFloat(consolidatedData[0].financialPersonalContribution) : null,
      propertyLivingArea: consolidatedData[0].propertyLivingArea ? parseFloat(consolidatedData[0].propertyLivingArea) : null,
      propertyMarketReferencePrice: consolidatedData[0].propertyMarketReferencePrice ? parseFloat(consolidatedData[0].propertyMarketReferencePrice) : null,
      propertyMonthlyRentExcludingTax: consolidatedData[0].propertyMonthlyRentExcludingTax ? parseFloat(consolidatedData[0].propertyMonthlyRentExcludingTax) : null,
      propertyPreMarketingRate: consolidatedData[0].propertyPreMarketingRate ? parseFloat(consolidatedData[0].propertyPreMarketingRate) : null,
      companyNetResultYear1: consolidatedData[0].companyNetResultYear1 ? parseFloat(consolidatedData[0].companyNetResultYear1) : null,
      companyNetResultYear2: consolidatedData[0].companyNetResultYear2 ? parseFloat(consolidatedData[0].companyNetResultYear2) : null,
      companyNetResultYear3: consolidatedData[0].companyNetResultYear3 ? parseFloat(consolidatedData[0].companyNetResultYear3) : null,
      companyTotalDebt: consolidatedData[0].companyTotalDebt ? parseFloat(consolidatedData[0].companyTotalDebt) : null,
      companyEquity: consolidatedData[0].companyEquity ? parseFloat(consolidatedData[0].companyEquity) : null,
      companyDebtRatio: consolidatedData[0].companyDebtRatio ? parseFloat(consolidatedData[0].companyDebtRatio) : null,
    };

    res.json(formattedData);
    
  } catch (error) {
    console.error('Error fetching consolidated data:', error);
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'FETCH_CONSOLIDATED_DATA_ERROR'
    });
  }
};

/**
 * Supprime un projet et toutes ses données associées
 * @route POST /api/projects/delete
 * @param {DeleteProjectInput} req.body - Données de suppression du projet
 * @returns {DeleteProjectResponse} Résultat de la suppression
 */
export const deleteProject = async (req: Request, res: Response): Promise<any> => {
  try {
    const { projectUniqueId }: DeleteProjectInput = req.body;

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

    const projectId = project[0].id;
    const deletedItems = {
      project: false,
      sessions: 0,
      documents: 0,
      workflow: 0,
      conversations: 0,
    };

    console.log(`🗑️ Début de la suppression du projet ${projectUniqueId} (ID: ${projectId})`);

    // 1. Supprimer les sessions et leurs données associées
    const projectSessions = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.projectId, projectId));

    for (const session of projectSessions) {
      // Supprimer les conversations avec IA de cette session
      const aiConversationsDeleted = await db
        .delete(conversations_with_ai)
        .where(eq(conversations_with_ai.sessionId, session.id));
      
      // Supprimer les conversations de cette session
      const conversationsDeleted = await db
        .delete(conversations)
        .where(eq(conversations.sessionId, session.id));
      
      // Supprimer les documents de cette session
      const documentsDeleted = await db
        .delete(documents)
        .where(eq(documents.sessionId, session.id));
      
      deletedItems.documents += documentsDeleted.rowCount || 0;
      deletedItems.conversations += (aiConversationsDeleted.rowCount || 0) + (conversationsDeleted.rowCount || 0);
    }

    // Supprimer les sessions
    const sessionsDeleted = await db
      .delete(sessions)
      .where(eq(sessions.projectId, projectId));
    
    deletedItems.sessions = sessionsDeleted.rowCount || 0;

    // 2. Supprimer les données directement liées au projet
    
    // Supprimer les propriétaires du projet
    await db
      .delete(project_owners)
      .where(eq(project_owners.projectId, projectId));

    // Supprimer les entreprises du projet
    await db
      .delete(companies)
      .where(eq(companies.projectId, projectId));

    // Supprimer les documents manquants
    await db
      .delete(missing_documents)
      .where(eq(missing_documents.projectId, projectId));

    // Supprimer les points de vigilance
    await db
      .delete(vigilance_points)
      .where(eq(vigilance_points.projectId, projectId));

    // Supprimer le workflow d'analyse
    const workflowDeleted = await db
      .delete(project_analysis_workflow)
      .where(eq(project_analysis_workflow.projectId, projectId));
    
    deletedItems.workflow = workflowDeleted.rowCount || 0;

    // 3. Finalement, supprimer le projet lui-même
    const projectDeleted = await db
      .delete(projects)
      .where(eq(projects.id, projectId));
    
    deletedItems.project = (projectDeleted.rowCount || 0) > 0;

    console.log(`✅ Projet ${projectUniqueId} supprimé avec succès:`, deletedItems);

    const response: DeleteProjectResponse = {
      success: true,
      message: `Projet ${projectUniqueId} supprimé avec succès`,
      deletedItems,
    };

    res.json(response);
    
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'DELETE_PROJECT_ERROR'
    });
  }
}; 