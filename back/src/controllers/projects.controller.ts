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
  strengths_and_weaknesses,
  conversations,
  project_analysis_progress,
  consolidated_data
} from '@/db/schema';
import { initiateWorkflowForProject, uploadZipFromUrl } from '@/controllers/workflow.controller';
import { uploadFileFromUrl, s3Client, extractS3KeyFromUrl, extractS3KeyFromUrlRaw, generatePresignedUrlFromS3Url, downloadFileFromS3 } from '@/lib/s3';
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
 * Nettoie une URL en supprimant les duplications de protocole
 * @param url URL à nettoyer
 * @returns URL nettoyée
 */
function cleanUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return url;
  }
  
  // Supprimer les duplications de protocole comme "https:https://" -> "https://"
  const cleanedUrl = url.replace(/^(https?:)+(https?:\/\/)/, '$2');
  
  console.log(`🧹 URL nettoyée: "${url}" -> "${cleanedUrl}"`);
  
  return cleanedUrl;
}

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
      // Le projet existe déjà, mettre à jour les champs conversation et fiche si fournis
      const updateData: any = {
        updatedAt: new Date(),
      };
      
      // Seulement ajouter conversation si elle est définie et non vide
      // Prioriser le champ 'conversations' (Bubble) puis 'conversation'
      const conversationData = projectData.conversations || projectData.conversation;
      if (conversationData && conversationData.trim() !== '') {
        updateData.conversation = conversationData.trim();
      }
      
      // Seulement ajouter fiche si elle est définie et non vide
      if (projectData.fiche && projectData.fiche.trim() !== '') {
        updateData.fiche = projectData.fiche.trim();
      }
      
      // Mettre à jour le projet existant si des champs valides sont fournis
      if (updateData.conversation || updateData.fiche) {
        const updatedProject = await db
          .update(projects)
          .set(updateData)
          .where(eq(projects.projectUniqueId, projectData.projectUniqueId))
          .returning();
        
        project = updatedProject[0];
        console.log(`📝 Projet existant mis à jour: ${projectData.projectUniqueId} (conversation: ${updateData.conversation ? 'oui' : 'non'}, fiche: ${updateData.fiche ? 'oui' : 'non'})`);
      } else {
        project = existingProject[0];
        console.log(`📁 Projet existant trouvé: ${projectData.projectUniqueId} (aucune mise à jour de conversation/fiche)`);
      }
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
          conversation: (() => {
            const conversationData = projectData.conversations || projectData.conversation;
            return (conversationData && conversationData.trim() !== '') ? conversationData.trim() : null;
          })(),
          fiche: (projectData.fiche && projectData.fiche.trim() !== '') ? projectData.fiche.trim() : null,
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
      
      // Récupérer les documents existants pour TOUT LE PROJET pour éviter les doublons (par nom de fichier)
      const existingDocuments = await db
        .select({ 
          hash: documents.hash,
          fileName: documents.fileName 
        })
        .from(documents)
        .innerJoin(sessions, eq(documents.sessionId, sessions.id))
        .where(eq(sessions.projectId, project.id));
      
      const existingHashes = new Set(existingDocuments.map(doc => doc.hash));
      const existingFileNames = new Set(existingDocuments.map(doc => doc.fileName));
      
      for (let index = 0; index < projectData.fileUrls.length; index++) {
        const rawBubbleUrl = projectData.fileUrls[index];
        
        // Nettoyer l'URL en cas de duplication du protocole
        const bubbleUrl = cleanUrl(rawBubbleUrl);
        
        try {
          console.log(`📥 Conversion S3 du document ${index + 1}/${projectData.fileUrls.length}: ${bubbleUrl}`);
          
          // Convertir l'URL Bubble vers S3 en préservant le nom original
          const s3Result = await uploadFileFromUrl(
            bubbleUrl,
            projectData.projectUniqueId
            // Ne pas passer de nom de fichier pour laisser la fonction extraire le nom original
          );
          
          // Si c'est un ZIP avec des fichiers extraits, traiter chaque fichier extrait
          if (s3Result.extractedFiles && s3Result.extractedFiles.length > 0) {
            console.log(`📦 ZIP dézippé avec ${s3Result.extractedFiles.length} fichiers extraits (ZIP original non stocké)`);
            
            // ⚠️ Ne plus stocker le ZIP original, seulement les fichiers extraits
            
            // Ajouter chaque fichier extrait avec déduplication par hash ET nom
            for (const extractedFile of s3Result.extractedFiles) {
              const isDuplicateByName = existingFileNames.has(extractedFile.fileName);
              const isDuplicateByHash = existingHashes.has(extractedFile.hash);
              
              if (!isDuplicateByName && !isDuplicateByHash) {
                documentsToInsert.push({
                  sessionId: newSession[0].id,
                  fileName: extractedFile.fileName,
                  url: extractedFile.s3Url,
                  hash: extractedFile.hash,
                  mimeType: extractedFile.mimeType,
                  size: extractedFile.size,
                  status: 'PROCESSED' as const,
                  uploadedAt: new Date(),
                });
                existingFileNames.add(extractedFile.fileName);
                existingHashes.add(extractedFile.hash);
                console.log(`✅ Fichier extrait ajouté: ${extractedFile.fileName}`);
              } else {
                console.log(`⚠️ Fichier extrait ignoré (dupliqué): ${extractedFile.fileName}`);
                console.log(`   - Dupliqué par nom: ${isDuplicateByName ? 'OUI' : 'NON'}`);
                console.log(`   - Dupliqué par hash: ${isDuplicateByHash ? 'OUI' : 'NON'}`);
              }
            }
          } else {
            // Traitement normal pour les fichiers non-ZIP
            // Vérifier si ce document existe déjà (par nom ET hash)
            const isDuplicateByName = existingFileNames.has(s3Result.fileName);
            const isDuplicateByHash = existingHashes.has(s3Result.hash);
            
            if (isDuplicateByName || isDuplicateByHash) {
              console.log(`⚠️ Document ${index + 1} ignoré (dupliqué): ${s3Result.fileName}`);
              console.log(`   - Dupliqué par nom: ${isDuplicateByName ? 'OUI' : 'NON'}`);
              console.log(`   - Dupliqué par hash: ${isDuplicateByHash ? 'OUI' : 'NON'}`);
              continue;
            }
            
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
            
            // Ajouter le nom de fichier ET hash à nos sets pour éviter les doublons dans cette même requête
            existingFileNames.add(s3Result.fileName);
            existingHashes.add(s3Result.hash);
            
            console.log(`✅ Document ${index + 1} converti vers S3: ${s3Result.s3Url}`);
          }
          
        } catch (error) {
          console.error(`❌ Erreur conversion S3 document ${index + 1}:`, error);
          
          // En cas d'erreur, stocker l'URL Bubble nettoyée avec statut ERROR
          const errorHash = `error-${Date.now()}-${index}`;
          
          // Vérifier si ce nom de fichier d'erreur existe déjà (peu probable mais sécurise)
          const errorFileName = `Document_${index + 1}_ERROR`;
          if (!existingFileNames.has(errorFileName)) {
            documentsToInsert.push({
              sessionId: newSession[0].id,
              fileName: errorFileName,
              url: bubbleUrl, // URL Bubble nettoyée en fallback
              hash: errorHash,
              mimeType: 'application/pdf',
              size: 0,
              status: 'ERROR' as const,
              uploadedAt: new Date(),
            });
            
            existingFileNames.add(errorFileName);
          }
        }
      }

      if (documentsToInsert.length > 0) {
        const insertedDocuments = await db
          .insert(documents)
          .values(documentsToInsert)
          .returning();

        const successCount = insertedDocuments.filter(doc => doc.status === 'PROCESSED').length;
        const errorCount = insertedDocuments.filter(doc => doc.status === 'ERROR').length;
        
        console.log(`📎 ${insertedDocuments.length} nouveau(x) fichier(s) ajouté(s) à la session ${newSession[0].id}`);
        console.log(`✅ ${successCount} converti(s) vers S3, ❌ ${errorCount} en erreur`);
      } else {
        console.log(`ℹ️ Aucun nouveau document à insérer (tous les documents sont des doublons ou erreurs)`);
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
          
          // Si des documents ont été ajoutés avec succès, déclencher automatiquement l'étape 0 (Upload ZIP)
          if (projectData.fileUrls && projectData.fileUrls.length > 0) {
            console.log(`🚀 Déclenchement automatique de l'étape 0 (Upload ZIP) pour le projet ${projectData.projectUniqueId}`);
            // Déclencher l'étape 0 de manière asynchrone sans bloquer la réponse
            setTimeout(async () => {
              try {
                // Créer un objet Request/Response mockés pour appeler la fonction
                const mockReq = {
                  body: { projectUniqueId: projectData.projectUniqueId }
                } as Request;
                const mockRes = {
                  status: (code: number) => ({
                    json: (data: any) => {
                      console.log(`✅ Étape 0 déclenchée avec succès pour le projet ${projectData.projectUniqueId}:`, data);
                    }
                  })
                } as Response;
                
                await uploadZipFromUrl(mockReq, mockRes);
              } catch (error) {
                console.error(`❌ Erreur lors du déclenchement de l'étape 0 pour le projet ${projectData.projectUniqueId}:`, error);
              }
            }, 2000); // Délai de 2 secondes pour laisser le temps à la création de se finaliser
          }
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

    // Générer la liste avec les URLs S3 directes (affichage des URLs complètes)
    const documentsList = projectDocuments.length > 0 
      ? projectDocuments.map(doc => {
          return `<li><a href="${doc.url}" target="_blank">${doc.url}</a></li>`;
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
            margin-bottom: 15px; 
            padding: 10px;
            background-color: #f5f5f5;
            border-radius: 5px;
            border-left: 4px solid #0066cc;
          }
          a { 
            color: #0066cc; 
            text-decoration: none;
            word-break: break-all;
            font-family: monospace;
            font-size: 14px;
          }
          a:hover { 
            text-decoration: underline;
            color: #004499;
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
 * Génère une URL pré-signée pour accéder à un document
 * @route GET /api/projects/:projectUniqueId/documents/:documentId/url
 * @param {string} projectUniqueId - Identifiant unique du projet
 * @param {string} documentId - ID du document
 * @returns {Object} URL pré-signée pour accéder au document
 */
export const getDocumentUrl = async (req: Request, res: Response): Promise<any> => {
  try {
    const { projectUniqueId, documentId } = req.params;
    const { expiresIn = 3600 } = req.query; // Durée d'expiration en secondes (défaut: 1h)

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
        status: documents.status,
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
    
    // Vérifier que le document est traité
    if (doc.status !== 'PROCESSED') {
      return res.status(400).json({ 
        error: 'Document not processed yet',
        code: 'DOCUMENT_NOT_PROCESSED',
        status: doc.status
      });
    }

    // Générer l'URL pré-signée
    try {
      const presignedUrl = await generatePresignedUrlFromS3Url(doc.url, Number(expiresIn));
      
      console.log(`🔗 URL pré-signée générée pour ${doc.fileName} (expire dans ${expiresIn}s)`);
      
      // Retourner l'URL complète du serveur proxy au lieu de l'URL pré-signée qui ne fonctionne pas
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const proxyUrl = `${baseUrl}/api/projects/${projectUniqueId}/documents/${documentId}/download`;
      
      res.json({
        url: proxyUrl,
        fileName: doc.fileName,
        mimeType: doc.mimeType,
        size: doc.size,
        expiresIn: Number(expiresIn),
        expiresAt: new Date(Date.now() + Number(expiresIn) * 1000).toISOString()
      });
      
    } catch (urlError) {
      console.error(`❌ Erreur génération URL pré-signée pour ${doc.fileName}:`, urlError);
      return res.status(500).json({ 
        error: 'Failed to generate document URL',
        code: 'URL_GENERATION_ERROR',
        details: (urlError as Error).message
      });
    }
    
  } catch (error) {
    console.error('Error generating document URL:', error);
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'DOCUMENT_URL_ERROR'
    });
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
    
    // Extraire la clé S3 depuis l'URL en utilisant la fonction utilitaire
    const s3Url = doc.url;
    
    let s3Key: string;
    try {
      // Essayer d'abord avec la version décodée
      s3Key = extractS3KeyFromUrl(s3Url);
    } catch (error) {
      console.error(`❌ Erreur extraction clé S3 pour ${doc.fileName}:`, error);
      return res.status(400).json({ 
        error: 'Invalid S3 URL format',
        code: 'INVALID_S3_URL',
        details: (error as Error).message
      });
    }
    
    console.log(`📥 Téléchargement document: ${doc.fileName} (${s3Key})`);
    
    // Récupérer le fichier depuis S3
    const bucketName = process.env.AWS_S3_BUCKET_NAME!;
    
    let s3Response;
    let finalS3Key = s3Key;
    
    // Essayer d'abord avec la clé décodée
    try {
      const getCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
      });
      s3Response = await s3Client.send(getCommand);
    } catch (s3Error: any) {
      console.error(`❌ Erreur S3 avec clé décodée (${s3Key}):`, s3Error.name);
      
      if (s3Error.name === 'NoSuchKey') {
        // Essayer avec la clé brute (non décodée)
        try {
          const rawS3Key = extractS3KeyFromUrlRaw(s3Url);
          console.log(`🔄 Tentative avec clé brute: ${rawS3Key}`);
          
          const getCommandRaw = new GetObjectCommand({
            Bucket: bucketName,
            Key: rawS3Key,
          });
          s3Response = await s3Client.send(getCommandRaw);
          finalS3Key = rawS3Key;
          console.log(`✅ Succès avec clé brute: ${rawS3Key}`);
        } catch (rawError: any) {
          console.error(`❌ Erreur S3 avec clé brute (${extractS3KeyFromUrlRaw(s3Url)}):`, rawError.name);
          
          return res.status(404).json({ 
            error: 'Document not found in storage',
            code: 'DOCUMENT_NOT_FOUND_IN_STORAGE',
            details: `File not found with decoded key: ${s3Key} or raw key: ${extractS3KeyFromUrlRaw(s3Url)}`
          });
        }
      } else if (s3Error.name === 'AccessDenied') {
        return res.status(403).json({ 
          error: 'Access denied to document',
          code: 'DOCUMENT_ACCESS_DENIED',
          details: `Access denied for: ${s3Key}`
        });
      } else {
        return res.status(500).json({ 
          error: 'Storage error',
          code: 'STORAGE_ERROR',
          details: s3Error.message
        });
      }
    }
    
    if (!s3Response.Body) {
      return res.status(404).json({ 
        error: 'Document content not found',
        code: 'DOCUMENT_CONTENT_NOT_FOUND'
      });
    }
    
    // Configurer les headers de réponse
    res.setHeader('Content-Type', doc.mimeType);
    
    // Pour l'affichage : utiliser inline, pour le téléchargement : utiliser attachment
    const disposition = req.query.download === 'true' ? 'attachment' : 'inline';
    
    // Encoder correctement le nom de fichier pour éviter les erreurs avec les caractères spéciaux
    const encodedFileName = encodeURIComponent(doc.fileName);
    res.setHeader('Content-Disposition', `${disposition}; filename*=UTF-8''${encodedFileName}`);
    
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
      financialAcquisitionPricePerSqm: consolidatedData[0].financialAcquisitionPricePerSqm ? parseFloat(consolidatedData[0].financialAcquisitionPricePerSqm) : null,
      financialMarketPricePerSqm: consolidatedData[0].financialMarketPricePerSqm ? parseFloat(consolidatedData[0].financialMarketPricePerSqm) : null,
      financialWorksCost: consolidatedData[0].financialWorksCost ? parseFloat(consolidatedData[0].financialWorksCost) : null,
      financialPlannedResalePrice: consolidatedData[0].financialPlannedResalePrice ? parseFloat(consolidatedData[0].financialPlannedResalePrice) : null,
      financialPersonalContribution: consolidatedData[0].financialPersonalContribution ? parseFloat(consolidatedData[0].financialPersonalContribution) : null,
      propertyLivingArea: consolidatedData[0].propertyLivingArea ? parseFloat(consolidatedData[0].propertyLivingArea) : null,
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
 * Récupère les documents manquants d'un projet
 * @route GET /api/projects/:projectUniqueId/missing-documents
 * @param {string} projectUniqueId - Identifiant unique du projet
 * @returns {MissingDocument[]} Documents manquants du projet
 */
export const getMissingDocuments = async (req: Request, res: Response): Promise<any> => {
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

    // Récupérer les documents manquants
    const missingDocs = await db
      .select()
      .from(missing_documents)
      .where(eq(missing_documents.projectId, project[0].id))
      .orderBy(asc(missing_documents.createdAt));

    res.json(missingDocs);
    
  } catch (error) {
    console.error('Error fetching missing documents:', error);
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'FETCH_MISSING_DOCUMENTS_ERROR'
    });
  }
};

/**
 * Met à jour le statut d'un document manquant
 * @route PATCH /api/projects/:projectUniqueId/missing-documents/:documentId
 * @param {string} projectUniqueId - Identifiant unique du projet
 * @param {string} documentId - Identifiant du document manquant
 * @body {status: 'resolved' | 'irrelevant' | 'pending', whyStatus?: string}
 * @returns {MissingDocument} Document manquant mis à jour
 */
export const updateMissingDocumentStatus = async (req: Request, res: Response): Promise<any> => {
  try {
    const { projectUniqueId, documentId } = req.params;
    const { status, whyStatus } = req.body;

    // Validation des paramètres
    if (!status || !['resolved', 'irrelevant', 'pending'].includes(status)) {
      return res.status(400).json({
        error: 'Status must be one of: resolved, irrelevant, pending',
        code: 'INVALID_STATUS'
      });
    }

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

    // Vérifier que le document manquant existe et appartient au projet
    const existingDoc = await db
      .select()
      .from(missing_documents)
      .where(and(
        eq(missing_documents.id, documentId),
        eq(missing_documents.projectId, project[0].id)
      ))
      .limit(1);

    if (existingDoc.length === 0) {
      return res.status(404).json({
        error: 'Missing document not found',
        code: 'MISSING_DOCUMENT_NOT_FOUND'
      });
    }

    // Mettre à jour le statut
    const updatedDoc = await db
      .update(missing_documents)
      .set({
        status: status as 'resolved' | 'irrelevant' | 'pending',
        whyStatus: whyStatus || null,
        updatedAt: new Date()
      })
      .where(eq(missing_documents.id, documentId))
      .returning();

    console.log(`📋 Document manquant ${documentId} mis à jour: ${status}`);

    res.json(updatedDoc[0]);
    
  } catch (error) {
    console.error('Error updating missing document status:', error);
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'UPDATE_MISSING_DOCUMENT_ERROR'
    });
  }
};

/**
 * Récupère les points de vigilance d'un projet
 * @route GET /api/projects/:projectUniqueId/vigilance-points
 * @param {string} projectUniqueId - Identifiant unique du projet
 * @returns {VigilancePointResponse[]} Liste des points de vigilance
 */
export const getVigilancePoints = async (req: Request, res: Response): Promise<any> => {
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

    // Récupérer les points de vigilance (uniquement les weaknesses)
    const vigilancePoints = await db
      .select()
      .from(strengths_and_weaknesses)
      .where(
        and(
          eq(strengths_and_weaknesses.projectId, project[0].id),
          eq(strengths_and_weaknesses.type, 'weakness')
        )
      )
      .orderBy(desc(strengths_and_weaknesses.createdAt));

    console.log(`📋 Points de vigilance récupérés pour le projet ${projectUniqueId}: ${vigilancePoints.length} points`);

    res.json(vigilancePoints);
    
  } catch (error) {
    console.error('Error fetching vigilance points:', error);
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'FETCH_VIGILANCE_POINTS_ERROR'
    });
  }
};

/**
 * Met à jour le statut d'un point de vigilance
 * @route PATCH /api/projects/:projectUniqueId/vigilance-points/:pointId
 * @param {string} projectUniqueId - Identifiant unique du projet
 * @param {string} pointId - Identifiant du point de vigilance
 * @body {status: 'resolved' | 'irrelevant' | 'pending', whyStatus?: string}
 * @returns {VigilancePoint} Point de vigilance mis à jour
 */
export const updateVigilancePointStatus = async (req: Request, res: Response): Promise<any> => {
  try {
    const { projectUniqueId, pointId } = req.params;
    const { status, whyStatus } = req.body;

    // Validation des paramètres
    if (!status || !['resolved', 'irrelevant', 'pending'].includes(status)) {
      return res.status(400).json({
        error: 'Status must be one of: resolved, irrelevant, pending',
        code: 'INVALID_STATUS'
      });
    }

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

    // Vérifier que le point de vigilance existe et appartient au projet
    const existingPoint = await db
      .select()
      .from(strengths_and_weaknesses)
      .where(and(
        eq(strengths_and_weaknesses.id, pointId),
        eq(strengths_and_weaknesses.projectId, project[0].id)
      ))
      .limit(1);

    if (existingPoint.length === 0) {
      return res.status(404).json({
        error: 'Vigilance point not found',
        code: 'VIGILANCE_POINT_NOT_FOUND'
      });
    }

    // Mettre à jour le statut
    const updatedPoint = await db
      .update(strengths_and_weaknesses)
      .set({
        status: status as 'resolved' | 'irrelevant' | 'pending',
        whyStatus: whyStatus || null,
        updatedAt: new Date()
      })
      .where(eq(strengths_and_weaknesses.id, pointId))
      .returning();

    console.log(`📋 Point de vigilance ${pointId} mis à jour: ${status}`);

    res.json(updatedPoint[0]);
    
  } catch (error) {
    console.error('Error updating vigilance point status:', error);
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'UPDATE_VIGILANCE_POINT_ERROR'
    });
  }
};

/**
 * Récupère les conversations d'un projet
 * @route GET /api/projects/:projectUniqueId/conversations
 * @param {string} projectUniqueId - Identifiant unique du projet
 * @returns {ConversationMessage[]} Liste des conversations
 */
export const getProjectConversations = async (req: Request, res: Response): Promise<any> => {
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

    // Récupérer toutes les conversations via les sessions
    const projectConversations = await db
      .select({
        id: conversations.id,
        sessionId: conversations.sessionId,
        sessionDate: conversations.sessionDate,
        sender: conversations.sender,
        message: conversations.message,
        attachments: conversations.attachments,
        createdAt: conversations.createdAt,
      })
      .from(conversations)
      .leftJoin(sessions, eq(conversations.sessionId, sessions.id))
      .where(eq(sessions.projectId, project[0].id))
      .orderBy(desc(conversations.createdAt));

    console.log(`📋 Conversations récupérées pour le projet ${projectUniqueId}: ${projectConversations.length} messages`);

    res.json(projectConversations);
    
  } catch (error) {
    console.error('Error fetching project conversations:', error);
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'FETCH_CONVERSATIONS_ERROR'
    });
  }
};

/**
 * Crée ou met à jour un draft de message pour un projet
 * @route POST /api/projects/:projectUniqueId/conversations/draft
 * @param {string} projectUniqueId - Identifiant unique du projet
 * @body {message: string, sender?: string}
 * @returns {ConversationMessage} Draft de message créé/mis à jour
 */
export const createOrUpdateDraft = async (req: Request, res: Response): Promise<any> => {
  try {
    const { projectUniqueId } = req.params;
    const { message, sender = 'L\'équipe d\'analyse' } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'Message is required and must be a string',
        code: 'INVALID_MESSAGE'
      });
    }

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

    // Vérifier s'il existe une session pour ce projet
    let projectSession = await db
      .select()
      .from(sessions)
      .where(eq(sessions.projectId, project[0].id))
      .limit(1);

    if (projectSession.length === 0) {
      // Créer une session automatiquement
      const newSession = await db
        .insert(sessions)
        .values({
          projectId: project[0].id,
          name: `Session - ${new Date().toLocaleDateString('fr-FR')}`,
          description: 'Session créée pour les messages du projet',
          status: 'open',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      projectSession = newSession;
    }

    // Créer le message dans la conversation
    const newMessage = await db
      .insert(conversations)
      .values({
        sessionId: projectSession[0].id,
        sessionDate: new Date(),
        sender: sender,
        message: message,
        attachments: [],
        createdAt: new Date(),
      })
      .returning();

    console.log(`📋 Draft de message créé pour le projet ${projectUniqueId}`);

    res.status(201).json(newMessage[0]);
    
  } catch (error) {
    console.error('Error creating draft message:', error);
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'CREATE_DRAFT_ERROR'
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
      .delete(strengths_and_weaknesses)
      .where(eq(strengths_and_weaknesses.projectId, projectId));

    // Supprimer le workflow d'analyse
    const workflowDeleted = await db
      .delete(project_analysis_progress)
      .where(eq(project_analysis_progress.projectId, projectId));
    
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

/**
 * Supprime un document d'un projet
 * @route POST /api/projects/:projectUniqueId/documents/:documentId/delete
 * @param {string} projectUniqueId - Identifiant unique du projet
 * @param {string} documentId - Identifiant du document à supprimer
 * @returns {object} Résultat de la suppression
 */
export const deleteDocument = async (req: Request, res: Response): Promise<any> => {
  try {
    const { projectUniqueId, documentId } = req.params;

    console.log(`🗑️ Tentative de suppression du document ${documentId} du projet ${projectUniqueId}`);

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

    // Vérifier que le document existe et appartient au projet
    const document = await db
      .select({ 
        id: documents.id, 
        fileName: documents.fileName,
        sessionId: documents.sessionId 
      })
      .from(documents)
      .innerJoin(sessions, eq(documents.sessionId, sessions.id))
      .where(
        and(
          eq(documents.id, documentId),
          eq(sessions.projectId, project[0].id)
        )
      )
      .limit(1);

    if (document.length === 0) {
      return res.status(404).json({ 
        error: 'Document not found in this project',
        code: 'DOCUMENT_NOT_FOUND'
      });
    }

    // Supprimer le document de la base de données
    const deletedDocument = await db
      .delete(documents)
      .where(eq(documents.id, documentId))
      .returning();

    if (deletedDocument.length === 0) {
      return res.status(500).json({ 
        error: 'Failed to delete document',
        code: 'DELETE_DOCUMENT_ERROR'
      });
    }

    console.log(`✅ Document ${document[0].fileName} supprimé avec succès`);

    res.json({
      success: true,
      message: `Document ${document[0].fileName} supprimé avec succès`,
      deletedDocument: {
        id: documentId,
        fileName: document[0].fileName
      }
    });
    
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'DELETE_DOCUMENT_ERROR'
    });
  }
};

/**
 * Supprime tous les documents d'un projet
 * @route POST /api/projects/:projectUniqueId/documents/delete-all
 * @param {string} projectUniqueId - Identifiant unique du projet
 * @returns {object} Résultat de la suppression
 */
export const deleteAllDocuments = async (req: Request, res: Response): Promise<any> => {
  try {
    const { projectUniqueId } = req.params;

    console.log(`🗑️ Tentative de suppression de tous les documents du projet ${projectUniqueId}`);

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

    // Récupérer tous les documents du projet via les sessions
    const projectDocuments = await db
      .select({ 
        id: documents.id, 
        fileName: documents.fileName 
      })
      .from(documents)
      .innerJoin(sessions, eq(documents.sessionId, sessions.id))
      .where(eq(sessions.projectId, project[0].id));

    if (projectDocuments.length === 0) {
      return res.json({
        success: true,
        message: 'Aucun document à supprimer',
        deletedCount: 0,
        deletedDocuments: []
      });
    }

    // Supprimer tous les documents du projet
    const documentIds = projectDocuments.map(doc => doc.id);
    
    // Supprimer les documents un par un car la jointure ne fonctionne pas avec DELETE
    const deletedDocuments = [];
    for (const doc of projectDocuments) {
      const deleted = await db
        .delete(documents)
        .where(eq(documents.id, doc.id))
        .returning();
      deletedDocuments.push(...deleted);
    }

    console.log(`✅ ${deletedDocuments.length} documents supprimés du projet ${projectUniqueId}`);

    res.json({
      success: true,
      message: `${deletedDocuments.length} documents supprimés avec succès`,
      deletedCount: deletedDocuments.length,
      deletedDocuments: projectDocuments.map(doc => ({
        id: doc.id,
        fileName: doc.fileName
      }))
    });
    
  } catch (error) {
    console.error('Error deleting all documents:', error);
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'DELETE_ALL_DOCUMENTS_ERROR'
    });
  }
};

/**
 * Récupère tous les points forts d'un projet
 * @route GET /api/projects/:projectUniqueId/strengths
 * @param {string} projectUniqueId - ID unique du projet
 * @returns {StrengthPoint[]} Liste des points forts du projet
 */
export const getProjectStrengths = async (req: Request, res: Response): Promise<any> => {
  try {
    const { projectUniqueId } = req.params;

    // Vérifier que le projet existe
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.projectUniqueId, projectUniqueId))
      .limit(1);

    if (project.length === 0) {
      return res.status(404).json({ 
        error: 'Projet non trouvé',
        code: 'PROJECT_NOT_FOUND'
      });
    }

    // Récupérer tous les points forts du projet
    const strengths = await db
      .select()
      .from(strengths_and_weaknesses)
      .where(and(
        eq(strengths_and_weaknesses.projectId, project[0].id),
        eq(strengths_and_weaknesses.type, 'strength')
      ))
      .orderBy(desc(strengths_and_weaknesses.createdAt));

    // Transformer les données pour l'API
    const strengthsResponse = strengths.map(strength => ({
      id: strength.id,
      title: strength.title,
      description: strength.description,
      riskLevel: strength.riskLevel,
      potentialImpact: strength.potentialImpact,
      recommendations: strength.recommendations as string[],
      status: strength.status,
      whyStatus: strength.whyStatus || null,
      createdAt: strength.createdAt,
      updatedAt: strength.updatedAt
    }));

    res.json(strengthsResponse);
  } catch (error) {
    console.error('Error fetching project strengths:', error);
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'GET_PROJECT_STRENGTHS_ERROR'
    });
  }
};

/**
 * Met à jour le statut d'un point fort
 * @route PATCH /api/projects/:projectUniqueId/strengths/:pointId
 * @param {string} projectUniqueId - Identifiant unique du projet
 * @param {string} pointId - Identifiant du point fort
 * @body {status: 'resolved' | 'irrelevant' | 'pending', whyStatus?: string}
 * @returns {StrengthPoint} Point fort mis à jour
 */
export const updateStrengthStatus = async (req: Request, res: Response): Promise<any> => {
  try {
    const { projectUniqueId, pointId } = req.params;
    const { status, whyStatus } = req.body;

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

    // Vérifier que le point fort existe et appartient au projet
    const existingPoint = await db
      .select()
      .from(strengths_and_weaknesses)
      .where(and(
        eq(strengths_and_weaknesses.id, pointId),
        eq(strengths_and_weaknesses.projectId, project[0].id),
        eq(strengths_and_weaknesses.type, 'strength')
      ))
      .limit(1);

    if (existingPoint.length === 0) {
      return res.status(404).json({
        error: 'Strength point not found',
        code: 'STRENGTH_POINT_NOT_FOUND'
      });
    }

    // Mettre à jour le statut
    const updatedPoint = await db
      .update(strengths_and_weaknesses)
      .set({
        status: status as 'resolved' | 'irrelevant' | 'pending',
        whyStatus: whyStatus || null,
        updatedAt: new Date()
      })
      .where(eq(strengths_and_weaknesses.id, pointId))
      .returning();

    console.log(`📋 Point fort ${pointId} mis à jour: ${status}`);

    res.json(updatedPoint[0]);
    
  } catch (error) {
    console.error('Error updating strength status:', error);
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'UPDATE_STRENGTH_STATUS_ERROR'
    });
  }
};

/**
 * Télécharge le ZIP d'un projet via proxy serveur
 * @route GET /api/projects/:projectUniqueId/zip/download
 */
export const downloadProjectZip = async (req: Request, res: Response): Promise<any> => {
  try {
    const { projectUniqueId } = req.params;

    console.log(`📦 Téléchargement ZIP pour projet: ${projectUniqueId}`);

    // Récupérer le projet
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

    // Vérifier que le projet a un ZIP
    if (!project[0].zipUrl) {
      return res.status(404).json({
        error: 'No ZIP file found for this project',
        code: 'ZIP_NOT_FOUND'
      });
    }

    console.log(`📦 Téléchargement ZIP depuis: ${project[0].zipUrl}`);
    console.log(`🔍 DEBUG: URL ZIP en base pour projet ${projectUniqueId}: ${project[0].zipUrl}`);
    console.log(`🔍 DEBUG: Taille attendue si URL récente: ~113MB, si ancienne URL: ~180MB`);

    // Télécharger le fichier depuis S3
    let fileBuffer: Buffer;
    try {
      fileBuffer = await downloadFileFromS3(project[0].zipUrl);
    } catch (error: any) {
      console.error('Erreur téléchargement ZIP S3:', error);
      
      if (error.name === 'NoSuchKey') {
        return res.status(404).json({
          error: 'ZIP file not found in storage',
          code: 'ZIP_NOT_FOUND_IN_STORAGE'
        });
      }
      
      if (error.name === 'AccessDenied') {
        return res.status(403).json({
          error: 'Access denied to ZIP file',
          code: 'ZIP_ACCESS_DENIED'
        });
      }
      
      throw error;
    }

    // Définir les headers pour le téléchargement
    const fileName = `projet-${projectUniqueId}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', fileBuffer.length);

    console.log(`📦 ZIP téléchargé avec succès: ${fileName} (${fileBuffer.length} bytes)`);

    // Envoyer le fichier
    res.send(fileBuffer);

  } catch (error) {
    console.error('Error downloading project ZIP:', error);
    res.status(500).json({
      error: (error as Error).message,
      code: 'DOWNLOAD_ZIP_ERROR'
    });
  }
};

/**
 * Récupère les détails complets d'un projet avec porteur et société
 * @route GET /api/projects/:projectUniqueId/details
 * @param {string} projectUniqueId - Identifiant unique du projet
 * @returns {ProjectVisualizationType} Projet avec détails complets
 */
export const getProjectDetails = async (req: Request, res: Response): Promise<any> => {
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

    const projectData = project[0];

    // Récupérer le porteur de projet
    const projectOwner = await db
      .select()
      .from(project_owners)
      .where(eq(project_owners.projectId, projectData.id))
      .limit(1);

    // Récupérer la société
    const company = await db
      .select()
      .from(companies)
      .where(eq(companies.projectId, projectData.id))
      .limit(1);

    // Construire la réponse
    const response = {
      ...projectData,
      budgetTotal: parseFloat(projectData.budgetTotal),
      estimatedRoi: parseFloat(projectData.estimatedRoi),
      company: company.length > 0 ? {
        name: company[0].name,
        siret: company[0].siret,
        reputationScore: company[0].reputationScore,
        reputationJustification: company[0].reputationJustification,
      } : undefined,
      projectOwner: projectOwner.length > 0 ? {
        name: projectOwner[0].name,
        experienceYears: projectOwner[0].experienceYears,
        reputationScore: projectOwner[0].reputationScore,
        reputationJustification: projectOwner[0].reputationJustification,
      } : undefined,
    };

    res.json(response);
    
  } catch (error) {
    console.error('Error fetching project details:', error);
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'FETCH_PROJECT_DETAILS_ERROR'
    });
  }
}; 