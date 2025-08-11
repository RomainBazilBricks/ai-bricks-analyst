import { Request, Response } from 'express';
import { eq, desc, gt, lt, asc, and } from 'drizzle-orm';
import { db } from '@/db/index';
import { projects, documents, syntheses, CreateProjectSchema, GetDocumentsSchema, PostSynthesisSchema, UpdateConversationUrlSchema } from '@/db/schema';
import { uploadFileFromUrl, generatePresignedUrl, extractS3KeyFromUrl } from '@/lib/s3';
import type { 
  CreateProjectInput, 
  ProjectResponse, 
  DocumentResponse, 
  ProjectWithDocumentsResponse,
  PostSynthesisInput,
  SynthesisResponse,
  PaginatedProjectsResponse,
  AllProjectFilesResponse,
  SingleProjectFilesResponse,
  UpdateProjectConversationInput
} from '@shared/types/projects';

/**
 * Crée un nouveau projet et télécharge les fichiers depuis les URLs fournies
 * @route POST /api/projects
 * @param {CreateProjectInput} req.body - Données du projet (projectUniqueId, projectName et fileUrls)
 * @returns {ProjectWithDocumentsResponse} Projet créé avec ses documents
 */
export const createProject = async (req: Request, res: Response): Promise<any> => {
  try {
    // Validation des données d'entrée
    const validatedData = CreateProjectSchema.parse(req.body);
    const { projectUniqueId, projectName, fileUrls }: CreateProjectInput = validatedData;

    // Vérifier si le projet existe déjà
    const existingProject = await db
      .select()
      .from(projects)
      .where(eq(projects.projectUniqueId, projectUniqueId))
      .limit(1);

    let project;
    
    if (existingProject.length > 0) {
      // Le projet existe, on va juste ajouter les nouveaux documents
      project = existingProject[0];
      console.log(`Project ${projectUniqueId} already exists, adding documents...`);
    } else {
      // Créer le nouveau projet
      const newProjects = await db
        .insert(projects)
        .values({
          projectUniqueId,
          projectName,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      
      project = newProjects[0];
      console.log(`Created new project: ${projectUniqueId}`);
    }

    // Télécharger et sauvegarder chaque fichier
    const uploadedDocuments: DocumentResponse[] = [];
    const failedUploads: string[] = [];

    for (const fileUrl of fileUrls) {
      try {
        console.log(`Downloading file from: ${fileUrl}`);
        
        // Télécharger le fichier et l'uploader vers S3
        const uploadResult = await uploadFileFromUrl(fileUrl, projectUniqueId);
        
        // Vérifier si un document avec le même hash existe déjà pour ce projet
        const existingDocument = await db
          .select()
          .from(documents)
          .where(and(eq(documents.hash, uploadResult.hash), eq(documents.projectId, project.id)))
          .limit(1);

        if (existingDocument.length > 0) {
          console.log(`Document with hash ${uploadResult.hash} already exists, skipping...`);
          uploadedDocuments.push(existingDocument[0] as DocumentResponse);
          continue;
        }

        // Sauvegarder le document en base de données
        const newDocuments = await db
          .insert(documents)
          .values({
            projectId: project.id,
            fileName: uploadResult.fileName,
            url: uploadResult.s3Url,
            hash: uploadResult.hash,
            mimeType: uploadResult.mimeType,
            size: uploadResult.size,
            uploadedAt: new Date(),
          })
          .returning();

        uploadedDocuments.push(newDocuments[0] as DocumentResponse);
        console.log(`Successfully uploaded: ${uploadResult.fileName}`);
        
      } catch (error) {
        console.error(`Failed to upload file from ${fileUrl}:`, error);
        failedUploads.push(fileUrl);
      }
    }

    // Mettre à jour la date de modification du projet
    await db
      .update(projects)
      .set({ updatedAt: new Date() })
      .where(eq(projects.id, project.id));

    // Récupérer les synthèses existantes
    const existingSyntheses = await db
      .select()
      .from(syntheses)
      .where(eq(syntheses.projectId, project.id))
      .orderBy(desc(syntheses.createdAt));

    const response: ProjectWithDocumentsResponse = {
      ...project,
      documents: uploadedDocuments,
      syntheses: existingSyntheses as SynthesisResponse[],
    };

    // Log des résultats
    if (failedUploads.length > 0) {
      console.warn(`Some files failed to upload: ${failedUploads.join(', ')}`);
    }

    res.status(existingProject.length > 0 ? 200 : 201).json({
      ...response,
      uploadSummary: {
        totalFiles: fileUrls.length,
        successfulUploads: uploadedDocuments.length,
        failedUploads: failedUploads.length,
        failedUrls: failedUploads,
      },
    });
    
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
    
    const response: PaginatedProjectsResponse = {
      items: items as ProjectResponse[],
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
 * Récupère les documents d'un projet avec URLs pré-signées
 * @route GET /api/projects/:projectUniqueId/documents
 * @param {string} projectUniqueId - Identifiant unique du projet
 * @returns {DocumentResponse[]} Liste des documents avec URLs pré-signées
 */
export const getProjectDocuments = async (req: Request, res: Response): Promise<any> => {
  try {
    const { projectUniqueId } = req.params;
    
    // Validation
    GetDocumentsSchema.parse({ projectUniqueId });

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

    // Récupérer les documents
    const projectDocuments = await db
      .select()
      .from(documents)
      .where(eq(documents.projectId, project[0].id))
      .orderBy(desc(documents.uploadedAt));

    // Générer des URLs pré-signées pour l'accès sécurisé
    const documentsWithPresignedUrls = await Promise.all(
      projectDocuments.map(async (doc) => {
        try {
          const s3Key = extractS3KeyFromUrl(doc.url);
          const presignedUrl = await generatePresignedUrl(s3Key, 3600); // 1 heure
          
          return {
            ...doc,
            url: presignedUrl, // URL pré-signée pour l'accès
            originalUrl: doc.url, // URL S3 originale pour référence
          };
        } catch (error) {
          console.error(`Failed to generate presigned URL for document ${doc.id}:`, error);
          return doc; // Retourner le document avec l'URL originale en cas d'erreur
        }
      })
    );

    res.json(documentsWithPresignedUrls);
    
  } catch (error) {
    console.error('Error fetching project documents:', error);
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'FETCH_DOCUMENTS_ERROR'
    });
  }
};

/**
 * Reçoit une synthèse de ManusAI et l'associe au projet
 * @route POST /api/projects/synthesis
 * @param {PostSynthesisInput} req.body - Données de la synthèse
 * @returns {SynthesisResponse} Synthèse créée
 */
export const postSynthesis = async (req: Request, res: Response): Promise<any> => {
  try {
    // Validation des données d'entrée
    const validatedData = PostSynthesisSchema.parse(req.body);
    const { projectUniqueId, synthesis, manusConversationUrl }: PostSynthesisInput = validatedData;

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

    // Créer la synthèse
    const newSyntheses = await db
      .insert(syntheses)
      .values({
        projectId: project[0].id,
        content: synthesis,
        manusConversationUrl: manusConversationUrl || null,
        createdAt: new Date(),
      })
      .returning();

    // Mettre à jour la date de modification du projet
    await db
      .update(projects)
      .set({ updatedAt: new Date() })
      .where(eq(projects.id, project[0].id));

    const response: SynthesisResponse = newSyntheses[0] as SynthesisResponse;

    res.status(201).json(response);
    
  } catch (error) {
    console.error('Error posting synthesis:', error);
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'SYNTHESIS_POST_ERROR'
    });
  }
}; 

/**
 * Récupère les URLs des fichiers d'un projet spécifique ou de tous les projets
 * @route GET /api/files
 * @param {string} projectUniqueId - Identifiant unique du projet (optionnel)
 * @returns {AllProjectFilesResponse | SingleProjectFilesResponse} URLs des fichiers
 */
export const getProjectFiles = async (req: Request, res: Response): Promise<any> => {
  try {
    const { projectUniqueId } = req.query;

    if (projectUniqueId) {
      // Récupérer les fichiers d'un projet spécifique
      const project = await db
        .select()
        .from(projects)
        .where(eq(projects.projectUniqueId, String(projectUniqueId)))
        .limit(1);

      if (project.length === 0) {
        return res.status(404).json({ 
          error: 'Project not found',
          code: 'PROJECT_NOT_FOUND'
        });
      }

      // Récupérer les documents du projet
      const projectDocuments = await db
        .select()
        .from(documents)
        .where(eq(documents.projectId, project[0].id))
        .orderBy(desc(documents.uploadedAt));

      // Générer des URLs pré-signées pour l'accès aux documents
      const filesWithPresignedUrls = await Promise.all(
        projectDocuments.map(async (doc) => {
          try {
            const s3Key = extractS3KeyFromUrl(doc.url);
            const presignedUrl = await generatePresignedUrl(s3Key, 3600); // 1 heure
            
            return {
              fileName: doc.fileName,
              url: presignedUrl, // URL pré-signée pour l'accès
              mimeType: doc.mimeType,
              size: doc.size,
              uploadedAt: doc.uploadedAt,
            };
          } catch (error) {
            console.error(`Failed to generate presigned URL for document ${doc.id}:`, error);
            return {
              fileName: doc.fileName,
              url: doc.url, // URL originale en cas d'erreur
              mimeType: doc.mimeType,
              size: doc.size,
              uploadedAt: doc.uploadedAt,
            };
          }
        })
      );

      const response: SingleProjectFilesResponse = {
        projectUniqueId: project[0].projectUniqueId,
        files: filesWithPresignedUrls
      };

      res.json(response);
    } else {
      // Récupérer les fichiers de tous les projets
      const allProjects = await db
        .select()
        .from(projects)
        .orderBy(desc(projects.createdAt));

      const projectsWithFiles: AllProjectFilesResponse = [];

      for (const project of allProjects) {
        const projectDocuments = await db
          .select()
          .from(documents)
          .where(eq(documents.projectId, project.id))
          .orderBy(desc(documents.uploadedAt));

        // Générer des URLs pré-signées pour chaque document
        const filesWithPresignedUrls = await Promise.all(
          projectDocuments.map(async (doc) => {
            try {
              const s3Key = extractS3KeyFromUrl(doc.url);
              const presignedUrl = await generatePresignedUrl(s3Key, 3600); // 1 heure
              
              return {
                fileName: doc.fileName,
                url: presignedUrl, // URL pré-signée pour l'accès
                mimeType: doc.mimeType,
                size: doc.size,
                uploadedAt: doc.uploadedAt,
              };
            } catch (error) {
              console.error(`Failed to generate presigned URL for document ${doc.id}:`, error);
              return {
                fileName: doc.fileName,
                url: doc.url, // URL originale en cas d'erreur
                mimeType: doc.mimeType,
                size: doc.size,
                uploadedAt: doc.uploadedAt,
              };
            }
          })
        );

        projectsWithFiles.push({
          projectUniqueId: project.projectUniqueId,
          files: filesWithPresignedUrls
        });
      }

      res.json(projectsWithFiles);
    }
    
  } catch (error) {
    console.error('Error fetching project files:', error);
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'FETCH_FILES_ERROR'
    });
  }
}; 

/**
 * Récupère un projet spécifique avec tous ses détails (documents et synthèses)
 * @route GET /api/projects/:projectUniqueId
 * @param {string} projectUniqueId - Identifiant unique du projet
 * @returns {ProjectWithDocumentsResponse} Projet avec documents et synthèses
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

    // Récupérer les documents du projet
    const projectDocuments = await db
      .select()
      .from(documents)
      .where(eq(documents.projectId, project[0].id))
      .orderBy(desc(documents.uploadedAt));

    // Générer des URLs pré-signées pour l'accès sécurisé aux documents
    const documentsWithPresignedUrls = await Promise.all(
      projectDocuments.map(async (doc) => {
        try {
          const s3Key = extractS3KeyFromUrl(doc.url);
          const presignedUrl = await generatePresignedUrl(s3Key, 3600); // 1 heure
          
          return {
            ...doc,
            url: presignedUrl, // URL pré-signée pour l'accès
          } as DocumentResponse;
        } catch (error) {
          console.error(`Failed to generate presigned URL for document ${doc.id}:`, error);
          return doc as DocumentResponse; // Retourner le document avec l'URL originale en cas d'erreur
        }
      })
    );

    // Récupérer les synthèses du projet
    const projectSyntheses = await db
      .select()
      .from(syntheses)
      .where(eq(syntheses.projectId, project[0].id))
      .orderBy(desc(syntheses.createdAt));

    const response: ProjectWithDocumentsResponse = {
      ...project[0],
      documents: documentsWithPresignedUrls,
      syntheses: projectSyntheses as SynthesisResponse[],
    };

    res.json(response);
    
  } catch (error) {
    console.error('Error fetching project by ID:', error);
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'FETCH_PROJECT_ERROR'
    });
  }
}; 

/**
 * Met à jour l'URL de conversation d'un projet
 * @route POST /api/projects/conversation-url
 * @param {UpdateProjectConversationInput} req.body - Données de mise à jour
 * @returns {ProjectResponse} Projet mis à jour
 */
export const updateProjectConversationUrl = async (req: Request, res: Response): Promise<any> => {
  try {
    // Validation des données d'entrée
    const validatedData = UpdateConversationUrlSchema.parse(req.body);
    const { projectUniqueId, conversationUrl }: UpdateProjectConversationInput = validatedData;

    // Trouver le projet
    const existingProject = await db
      .select()
      .from(projects)
      .where(eq(projects.projectUniqueId, projectUniqueId))
      .limit(1);

    if (existingProject.length === 0) {
      return res.status(404).json({ 
        error: 'Project not found',
        code: 'PROJECT_NOT_FOUND'
      });
    }

    // Mettre à jour l'URL de conversation
    const updatedProjects = await db
      .update(projects)
      .set({ 
        conversationUrl,
        updatedAt: new Date() 
      })
      .where(eq(projects.id, existingProject[0].id))
      .returning();

    const response: ProjectResponse = updatedProjects[0] as ProjectResponse;

    res.json(response);
    
  } catch (error) {
    console.error('Error updating conversation URL:', error);
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'UPDATE_CONVERSATION_URL_ERROR'
    });
  }
}; 