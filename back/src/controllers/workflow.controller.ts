import { Request, Response } from 'express';
import axios from 'axios';
import { db } from '@/db/index';
import { 
  projects, 
  analysis_steps, 
  project_analysis_progress,
  missing_documents,
  strengths_and_weaknesses,
  conversations_with_ai,
  sessions,
  documents,
  conversations,
  CreateAnalysisStepSchema,
  UpdateWorkflowStepSchema,
  InitiateWorkflowSchema,
  GetWorkflowStatusSchema,
  AnalysisMacroPayloadSchema,
  AnalysisDescriptionPayloadSchema,
  MissingDocumentsPayloadSchema,
  StrengthsWeaknessesPayloadSchema,
  FinalMessagePayloadSchema,
  ConsolidatedDataPayloadSchema,
  ReputationAnalysisPayloadSchema,
  consolidated_data,
  project_owners,
  companies,
  WorkflowStatus,
  api_configurations
} from '@/db/schema';
import { createZipFromDocuments } from '@/lib/s3';
import { eq, and, asc, desc } from 'drizzle-orm';
import type { 
  CreateAnalysisStepInput,
  UpdateWorkflowStepInput,
  InitiateWorkflowInput,
  ProjectWorkflowStatusResponse,
  AnalysisStepDefinitionResponse,
  ProjectAnalysisProgressResponse,
  WorkflowStepEndpointInput
} from '@shared/types/projects';

/**
 * Fonction utilitaire pour envoyer un prompt à l'IA externe
 */
const sendPromptToAI = async (prompt: string, projectUniqueId: string, stepId: number, stepName: string, conversationUrl?: string): Promise<{ success: boolean; error?: string; conversationUrl?: string }> => {
  try {
    // Récupérer la configuration API Python active
    let pythonApiUrl = process.env.AI_INTERFACE_ACTION_URL || process.env.AI_INTERFACE_URL;
    
    if (!pythonApiUrl) {
      try {
        // Récupérer la configuration depuis la base de données
        const [config] = await db
          .select()
          .from(api_configurations)
          .where(and(
            eq(api_configurations.name, 'Python API'),
            eq(api_configurations.isActive, true)
          ));
        
        pythonApiUrl = config?.url || 'http://localhost:8000';
      } catch (configError) {
        console.warn('⚠️ Impossible de récupérer la configuration API Python, utilisation de l\'URL par défaut');
        pythonApiUrl = 'http://localhost:8000';
      }
    }
    
    console.log(`🚀 Envoi automatique du prompt à l'IA pour l'étape: ${stepName}`);
    if (conversationUrl) {
      console.log(`🔗 Continuation de la conversation: ${conversationUrl}`);
    }
    
    // Remplacer les placeholders dans le prompt
    let processedPrompt = prompt.replace(/{projectUniqueId}/g, projectUniqueId);
    
    // Remplacer {documentListUrl} par l'URL de la page des documents
    if (processedPrompt.includes('{documentListUrl}')) {
      const baseUrl = process.env.API_BASE_URL || 'https://ai-bricks-analyst-production.up.railway.app';
      const documentListUrl = `${baseUrl}/api/projects/${projectUniqueId}/documents-list`;
      processedPrompt = processedPrompt.replace(/{documentListUrl}/g, documentListUrl);
    }
    
    // Préparer le payload (même format que le frontend)
    const payload: any = {
      message: processedPrompt,
      platform: 'manus',
      projectUniqueId,
    };

    // Ajouter conversation_url si disponible pour continuer la même session
    if (conversationUrl) {
      payload.conversation_url = conversationUrl;
    }
    
    console.log(`📡 Envoi vers l'API Python: ${pythonApiUrl}`);
    
    // Utiliser directement l'API Python externe
    const response = await axios.post(`${pythonApiUrl}/send-message`, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 secondes de timeout pour les tâches IA
    });

    if (response.data && response.data.conversation_url) {
      console.log(`✅ Prompt envoyé avec succès à l'IA pour l'étape: ${stepName}`);
      console.log(`🔗 URL conversation retournée: ${response.data.conversation_url}`);
      return {
        success: true,
        conversationUrl: response.data.conversation_url
      };
    } else {
      console.error(`❌ Réponse inattendue de l'API Python pour l'étape ${stepName}:`, response.data);
      return {
        success: false,
        error: 'Réponse inattendue de l\'API Python'
      };
    }
  } catch (error: any) {
    console.error(`❌ Erreur lors de l'envoi du prompt à l'IA pour l'étape ${stepName}:`, error.message);
    return {
      success: false,
      error: error.message || 'Erreur de connexion à l\'API Python'
    };
  }
};

/**
 * Fonction utilitaire pour déclencher automatiquement l'étape suivante du workflow
 */
const triggerNextWorkflowStep = async (projectUniqueId: string, currentStepId: number): Promise<{ success: boolean; error?: string; conversationUrl?: string }> => {
  try {
    console.log(`🔄 Déclenchement automatique de l'étape suivante pour le projet: ${projectUniqueId}, étape courante: ${currentStepId}`);
    
    // Récupérer le projet
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.projectUniqueId, projectUniqueId))
      .limit(1);

    if (project.length === 0) {
      return { success: false, error: 'Projet non trouvé' };
    }

    // Récupérer l'étape suivante (order = currentStepId + 1)
    const nextStep = await db
      .select()
      .from(analysis_steps)
      .where(and(
        eq(analysis_steps.order, currentStepId + 1),
        eq(analysis_steps.isActive, 1)
      ))
      .limit(1);

    if (nextStep.length === 0) {
      console.log(`✅ Aucune étape suivante trouvée pour l'ordre ${currentStepId + 1}. Workflow terminé.`);
      return { success: true };
    }

    // Vérifier que l'étape suivante existe dans le workflow du projet
    const nextWorkflowStep = await db
      .select()
      .from(project_analysis_progress)
      .where(and(
        eq(project_analysis_progress.projectId, project[0].id),
        eq(project_analysis_progress.stepId, nextStep[0].id)
      ))
      .limit(1);

    if (nextWorkflowStep.length === 0) {
      return { success: false, error: 'Étape suivante non trouvée dans le workflow du projet' };
    }

    // Vérifier que l'étape suivante est en statut 'pending'
    if (nextWorkflowStep[0].status !== 'pending') {
      console.log(`⚠️ L'étape suivante n'est pas en statut 'pending' (statut actuel: ${nextWorkflowStep[0].status})`);
      return { success: true }; // Pas d'erreur, mais pas de déclenchement
    }

    // Mettre l'étape suivante en statut 'in_progress'
    await db
      .update(project_analysis_progress)
      .set({
        status: 'in_progress',
        updatedAt: new Date(),
      })
      .where(eq(project_analysis_progress.id, nextWorkflowStep[0].id));

    // Récupérer l'URL de conversation de l'étape précédente si disponible
    // Note: Pour l'instant, nous utilisons la conversation la plus récente du projet
    const previousConversation = await db
      .select()
      .from(conversations_with_ai)
      .innerJoin(sessions, eq(conversations_with_ai.sessionId, sessions.id))
      .where(eq(sessions.projectId, project[0].id))
      .orderBy(desc(conversations_with_ai.createdAt))
      .limit(1);

    const conversationUrl = previousConversation.length > 0 ? previousConversation[0].conversations_with_ai.url : undefined;

    // Envoyer le prompt à l'IA pour l'étape suivante
    const aiResult = await sendPromptToAI(
      nextStep[0].prompt,
      projectUniqueId,
      nextStep[0].id,
      nextStep[0].name,
      conversationUrl
    );

    if (aiResult.success) {
      console.log(`✅ Étape suivante "${nextStep[0].name}" déclenchée avec succès`);
      
      // Sauvegarder l'URL de conversation si disponible
      if (aiResult.conversationUrl) {
        console.log(`💾 URL de conversation disponible: ${aiResult.conversationUrl}`);
        await db
          .update(project_analysis_progress)
          .set({
            manusConversationUrl: aiResult.conversationUrl,
            updatedAt: new Date(),
          })
          .where(eq(project_analysis_progress.id, nextWorkflowStep[0].id));
      }
    } else {
      console.error(`❌ Erreur lors du déclenchement de l'étape suivante: ${aiResult.error}`);
      
      // Marquer l'étape comme échouée avec le message d'erreur
      await db
        .update(project_analysis_progress)
        .set({
          status: 'failed',
          content: `Erreur lors de l'envoi du prompt à l'API Python: ${aiResult.error}`,
          updatedAt: new Date(),
        })
        .where(eq(project_analysis_progress.id, nextWorkflowStep[0].id));
    }

    return aiResult;
  } catch (error) {
    console.error(`❌ Erreur lors du déclenchement automatique de l'étape suivante:`, error);
    return { success: false, error: (error as Error).message };
  }
};

/**
 * Initialise les étapes d'analyse par défaut dans la base de données
 * Cette fonction doit être appelée au démarrage de l'application
 */
export const initializeDefaultAnalysisSteps = async (): Promise<void> => {
  try {
    // Vérifier si les étapes existent déjà
    const existingSteps = await db.select().from(analysis_steps).limit(1);
    
    if (existingSteps.length === 0) {
      // Créer les 5 étapes par défaut
          // Les prompts sont gérés par l'interface AI et mis à jour via des scripts dédiés
    // Ne pas définir de prompts ici pour éviter les confusions
    const defaultSteps = [
      {
        name: 'Upload des documents',
        description: 'Génère un fichier ZIP contenant tous les documents du projet et l\'envoie à Manus pour analyse',
        prompt: 'PROMPT_MANAGED_BY_AI_INTERFACE', // Géré par l'interface AI
        order: 0,
        isActive: 1
      },
      {
        name: 'Analyse globale',
        description: 'Une analyse détaillée et approfondie du projet avec vue d\'ensemble',
        prompt: 'PROMPT_MANAGED_BY_AI_INTERFACE', // Géré par l'interface AI
        order: 1,
        isActive: 1
      },
      {
        name: 'Consolidation des données',
        description: 'Récupère et structure toutes les données clés nécessaires à l\'analyse',
        prompt: 'PROMPT_MANAGED_BY_AI_INTERFACE', // Géré par l'interface AI
        order: 2,
        isActive: 1
      },
      {
        name: 'Récupération des documents manquants',
        description: 'Liste des documents attendus en complément pour approfondir l\'analyse',
        prompt: 'PROMPT_MANAGED_BY_AI_INTERFACE', // Géré par l'interface AI
        order: 3,
        isActive: 1
      },
      {
        name: 'Points de vigilance',
        description: 'Identification des risques critiques qui pourraient compromettre le financement',
        prompt: 'PROMPT_MANAGED_BY_AI_INTERFACE', // Géré par l'interface AI
        order: 4,
        isActive: 1
      },
      {
        name: 'Rédaction d\'un message',
        description: 'Un message qui récapitule le projet et liste les documents manquants',
        prompt: 'PROMPT_MANAGED_BY_AI_INTERFACE', // Géré par l'interface AI
        order: 5,
        isActive: 1
      }
    ];

      await db.insert(analysis_steps).values(defaultSteps);
      console.log('✅ Étapes d\'analyse par défaut créées avec succès');
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation des étapes d\'analyse:', error);
  }
};

/**
 * Crée une nouvelle étape d'analyse
 * @route POST /api/workflow/steps
 */
export const createAnalysisStep = async (req: Request, res: Response): Promise<any> => {
  try {
    const validatedData = CreateAnalysisStepSchema.parse(req.body);
    const stepData: CreateAnalysisStepInput = validatedData;

    const newStep = await db
      .insert(analysis_steps)
      .values({
        name: stepData.name,
        description: stepData.description,
        prompt: stepData.prompt,
        order: stepData.order,
        isActive: stepData.isActive ?? 1,
        createdAt: new Date(),
      })
      .returning();

    res.status(201).json(newStep[0]);
  } catch (error) {
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'CREATE_ANALYSIS_STEP_ERROR'
    });
  }
};

/**
 * Met à jour une étape d'analyse existante
 * @route PUT /api/workflow/steps/:id
 */
export const updateAnalysisStepDefinition = async (req: Request, res: Response): Promise<any> => {
  try {
    const stepId = parseInt(req.params.id);
    const validatedData = CreateAnalysisStepSchema.parse(req.body);
    const stepData: CreateAnalysisStepInput = validatedData;

    // Vérifier que l'étape existe
    const existingStep = await db
      .select()
      .from(analysis_steps)
      .where(eq(analysis_steps.id, stepId))
      .limit(1);

    if (existingStep.length === 0) {
      return res.status(404).json({ 
        error: 'Étape d\'analyse non trouvée',
        code: 'ANALYSIS_STEP_NOT_FOUND'
      });
    }

    // Mettre à jour l'étape
    const updatedStep = await db
      .update(analysis_steps)
      .set({
        name: stepData.name,
        description: stepData.description,
        prompt: stepData.prompt,
        order: stepData.order,
        isActive: stepData.isActive ?? 1,
      })
      .where(eq(analysis_steps.id, stepId))
      .returning();

    res.json(updatedStep[0]);
  } catch (error) {
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'UPDATE_ANALYSIS_STEP_ERROR'
    });
  }
};

/**
 * Récupère toutes les étapes d'analyse actives
 * @route GET /api/workflow/steps
 */
export const getAllAnalysisSteps = async (req: Request, res: Response): Promise<any> => {
  try {
    const steps = await db
      .select()
      .from(analysis_steps)
      .where(eq(analysis_steps.isActive, 1))
      .orderBy(asc(analysis_steps.order));

    res.json(steps);
  } catch (error) {
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'GET_ANALYSIS_STEPS_ERROR'
    });
  }
};

/**
 * Fonction utilitaire pour initier le workflow d'un projet
 * Peut être utilisée par l'API et par d'autres fonctions internes
 */
export const initiateWorkflowForProject = async (projectUniqueId: string): Promise<{ success: boolean; stepsCreated?: number; error?: string }> => {
  try {
    // Vérifier que le projet existe
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.projectUniqueId, projectUniqueId))
      .limit(1);

    if (project.length === 0) {
      return { success: false, error: 'Projet non trouvé' };
    }

    // Récupérer toutes les étapes actives
    const steps = await db
      .select()
      .from(analysis_steps)
      .where(eq(analysis_steps.isActive, 1))
      .orderBy(asc(analysis_steps.order));

    // Vérifier si le workflow existe déjà
    const existingWorkflow = await db
      .select()
      .from(project_analysis_progress)
      .where(eq(project_analysis_progress.projectId, project[0].id))
      .limit(1);

    if (existingWorkflow.length > 0) {
      return { success: false, error: 'Le workflow d\'analyse est déjà initié pour ce projet' };
    }

    // Créer les entrées de workflow pour chaque étape
    const workflowEntries = steps.map(step => ({
      projectId: project[0].id,
      stepId: step.id,
      status: 'pending' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const createdWorkflow = await db
      .insert(project_analysis_progress)
      .values(workflowEntries)
      .returning();

    return { success: true, stepsCreated: createdWorkflow.length };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
};

/**
 * Initie le workflow d'analyse pour un projet
 * @route POST /api/workflow/initiate
 */
export const initiateWorkflow = async (req: Request, res: Response): Promise<any> => {
  try {
    const validatedData = InitiateWorkflowSchema.parse(req.body);
    const { projectUniqueId }: InitiateWorkflowInput = validatedData;

    const result = await initiateWorkflowForProject(projectUniqueId);

    if (!result.success) {
      const statusCode = result.error?.includes('non trouvé') ? 404 : 
                        result.error?.includes('déjà initié') ? 409 : 500;
      return res.status(statusCode).json({ 
        error: result.error,
        code: statusCode === 404 ? 'PROJECT_NOT_FOUND' : 
              statusCode === 409 ? 'WORKFLOW_ALREADY_EXISTS' : 'INITIATE_WORKFLOW_ERROR'
      });
    }

    res.status(201).json({
      message: 'Workflow d\'analyse initié avec succès',
      projectUniqueId,
      stepsCreated: result.stepsCreated
    });
  } catch (error) {
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'INITIATE_WORKFLOW_ERROR'
    });
  }
};

/**
 * Récupère le statut du workflow d'analyse pour un projet
 * @route GET /api/workflow/status/:projectUniqueId
 */
export const getWorkflowStatus = async (req: Request, res: Response): Promise<any> => {
  try {
    const { projectUniqueId } = req.params;
    const validatedData = GetWorkflowStatusSchema.parse({ projectUniqueId });

    // Récupérer le projet
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.projectUniqueId, validatedData.projectUniqueId))
      .limit(1);

    if (project.length === 0) {
      return res.status(404).json({ 
        error: 'Projet non trouvé',
        code: 'PROJECT_NOT_FOUND'
      });
    }

    // Récupérer le workflow avec les étapes
    const workflowSteps = await db
      .select({
        workflow: project_analysis_progress,
        step: analysis_steps
      })
      .from(project_analysis_progress)
      .leftJoin(analysis_steps, eq(project_analysis_progress.stepId, analysis_steps.id))
      .where(eq(project_analysis_progress.projectId, project[0].id))
      .orderBy(asc(analysis_steps.order));

    if (workflowSteps.length === 0) {
      return res.status(404).json({ 
        error: 'Workflow non initié pour ce projet',
        code: 'WORKFLOW_NOT_FOUND'
      });
    }

    // Calculer le statut global
    const completedSteps = workflowSteps.filter(ws => ws.workflow.status === 'completed').length;
    const failedSteps = workflowSteps.filter(ws => ws.workflow.status === 'failed').length;
    const inProgressSteps = workflowSteps.filter(ws => ws.workflow.status === 'in_progress').length;

    let overallStatus: 'not_started' | 'in_progress' | 'completed' | 'failed';
    if (failedSteps > 0) {
      overallStatus = 'failed';
    } else if (completedSteps === workflowSteps.length) {
      overallStatus = 'completed';
    } else if (inProgressSteps > 0 || completedSteps > 0) {
      overallStatus = 'in_progress';
    } else {
      overallStatus = 'not_started';
    }

    // Trouver l'étape courante (première étape non complétée)
    const currentStepData = workflowSteps.find(ws => 
      ws.workflow.status === 'pending' || ws.workflow.status === 'in_progress'
    );

    const response: ProjectWorkflowStatusResponse = {
      projectUniqueId: validatedData.projectUniqueId,
      projectId: project[0].id,
      steps: workflowSteps.map(ws => ({
        ...ws.workflow,
        status: ws.workflow.status as 'pending' | 'in_progress' | 'completed' | 'failed',
        step: ws.step!
      })),
      overallStatus,
      completedSteps,
      totalSteps: workflowSteps.length,
      currentStep: currentStepData ? {
        ...currentStepData.workflow,
        status: currentStepData.workflow.status as 'pending' | 'in_progress' | 'completed' | 'failed',
        step: currentStepData.step!
      } : null
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'GET_WORKFLOW_STATUS_ERROR'
    });
  }
};

/**
 * Met à jour le statut d'une étape de workflow
 * @route POST /api/workflow/update-step
 */
export const updateWorkflowStep = async (req: Request, res: Response): Promise<any> => {
  try {
    const validatedData = UpdateWorkflowStepSchema.parse(req.body);
    const stepData: UpdateWorkflowStepInput = validatedData;

    // Récupérer le projet
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.projectUniqueId, stepData.projectUniqueId))
      .limit(1);

    if (project.length === 0) {
      return res.status(404).json({ 
        error: 'Projet non trouvé',
        code: 'PROJECT_NOT_FOUND'
      });
    }

    // Vérifier que l'étape de workflow existe
    const workflowStep = await db
      .select()
      .from(project_analysis_progress)
      .where(
        and(
          eq(project_analysis_progress.projectId, project[0].id),
          eq(project_analysis_progress.stepId, stepData.stepId)
        )
      )
      .limit(1);

    if (workflowStep.length === 0) {
      return res.status(404).json({ 
        error: 'Étape de workflow non trouvée',
        code: 'WORKFLOW_STEP_NOT_FOUND'
      });
    }

    // Préparer les données de mise à jour
    const updateData: any = {
      status: stepData.status,
      updatedAt: new Date(),
    };

    if (stepData.content !== undefined) {
      updateData.content = stepData.content;
    }

    if (stepData.manusConversationUrl !== undefined) {
      updateData.manusConversationUrl = stepData.manusConversationUrl;
    }

    if (stepData.status === 'in_progress' && !workflowStep[0].startedAt) {
      updateData.startedAt = new Date();
    }

    if (stepData.status === 'completed' || stepData.status === 'failed') {
      updateData.completedAt = new Date();
    }

    // Mettre à jour l'étape
    const updatedStep = await db
      .update(project_analysis_progress)
      .set(updateData)
      .where(eq(project_analysis_progress.id, workflowStep[0].id))
      .returning();

    // ✅ NOUVEAU: Déclencher automatiquement l'étape suivante si l'étape est marquée comme 'completed'
    let nextStepTriggered = false;
    if (stepData.status === 'completed') {
      try {
        // Récupérer l'ordre de l'étape courante pour déclencher la suivante
        const currentStep = await db
          .select()
          .from(analysis_steps)
          .where(eq(analysis_steps.id, stepData.stepId))
          .limit(1);

        if (currentStep.length > 0) {
          const triggerResult = await triggerNextWorkflowStep(stepData.projectUniqueId, currentStep[0].order);
          nextStepTriggered = triggerResult.success;
          
          if (!triggerResult.success) {
            console.warn(`⚠️ Échec du déclenchement automatique de l'étape suivante: ${triggerResult.error}`);
          } else {
            console.log(`✅ Étape suivante déclenchée automatiquement après completion de l'étape ${currentStep[0].order}`);
          }
        }
      } catch (triggerError) {
        console.error('❌ Erreur lors du déclenchement automatique de l\'étape suivante:', triggerError);
        // Ne pas faire échouer la mise à jour principale
      }
    }

    res.json({
      message: 'Étape de workflow mise à jour avec succès',
      step: updatedStep[0],
      nextStepTriggered
    });
  } catch (error) {
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'UPDATE_WORKFLOW_STEP_ERROR'
    });
  }
};

// Endpoints structurés pour les analyses IA avec déclenchement automatique

/**
 * Endpoint pour recevoir les données consolidées de l'IA (Étape 2)
 * @route POST /api/workflow/consolidated-data/:projectUniqueId
 */
export const receiveConsolidatedData = async (req: Request, res: Response): Promise<any> => {
  try {
    const { projectUniqueId } = req.params;
    const { skipAutoTrigger } = req.query; // ✅ Nouveau paramètre pour le mode debug
    const validatedData = ConsolidatedDataPayloadSchema.parse({ 
      ...req.body, 
      projectUniqueId 
    });

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

    // Trouver l'étape de consolidation des données (étape avec order = 2)
    const workflowStep = await db
      .select({
        workflow: project_analysis_progress,
        step: analysis_steps
      })
      .from(project_analysis_progress)
      .leftJoin(analysis_steps, eq(project_analysis_progress.stepId, analysis_steps.id))
      .where(
        and(
          eq(project_analysis_progress.projectId, project[0].id),
          eq(analysis_steps.order, 2) // Étape avec order = 2 = consolidation des données
        )
      )
      .limit(1);

    if (workflowStep.length === 0) {
      return res.status(404).json({ 
        error: 'Étape de workflow non trouvée. Initialisez d\'abord le workflow.',
        code: 'WORKFLOW_STEP_NOT_FOUND'
      });
    }

    // Préparer les données à insérer/mettre à jour
    const consolidatedDataToInsert = {
      projectId: project[0].id,
      // Données Financières
      financialAcquisitionPrice: validatedData.consolidatedData.financial?.acquisitionPrice?.toString(),
      financialAcquisitionPricePerSqm: validatedData.consolidatedData.financial?.acquisitionPricePerSqm?.toString(),
      financialMarketPricePerSqm: validatedData.consolidatedData.financial?.marketPricePerSqm?.toString(),
      financialWorksCost: validatedData.consolidatedData.financial?.worksCost?.toString(),
      financialPlannedResalePrice: validatedData.consolidatedData.financial?.plannedResalePrice?.toString(),
      financialPersonalContribution: validatedData.consolidatedData.financial?.personalContribution?.toString(),
      // Données du Bien
      propertyLivingArea: validatedData.consolidatedData.property?.livingArea?.toString(),
      propertyMonthlyRentExcludingTax: validatedData.consolidatedData.property?.monthlyRentExcludingTax?.toString(),
      propertyPresoldUnits: validatedData.consolidatedData.property?.presoldUnits,
      propertyTotalUnits: validatedData.consolidatedData.property?.totalUnits,
      propertyPreMarketingRate: validatedData.consolidatedData.property?.preMarketingRate?.toString(),
      // Données Porteur
      carrierExperienceYears: validatedData.consolidatedData.carrier?.experienceYears,
      carrierSuccessfulOperations: validatedData.consolidatedData.carrier?.successfulOperations,
      carrierHasActiveLitigation: validatedData.consolidatedData.carrier?.hasActiveLitigation,
      // Société Porteuse
      companyYearsOfExistence: validatedData.consolidatedData.company?.yearsOfExistence,
      companyNetResultYear1: validatedData.consolidatedData.company?.netResultYear1?.toString(),
      companyNetResultYear2: validatedData.consolidatedData.company?.netResultYear2?.toString(),
      companyNetResultYear3: validatedData.consolidatedData.company?.netResultYear3?.toString(),
      companyTotalDebt: validatedData.consolidatedData.company?.totalDebt?.toString(),
      companyEquity: validatedData.consolidatedData.company?.equity?.toString(),
      companyDebtRatio: validatedData.consolidatedData.company?.debtRatio?.toString(),
      updatedAt: new Date(),
    };

    // Insérer ou mettre à jour les données consolidées (upsert)
    await db
      .insert(consolidated_data)
      .values({
        ...consolidatedDataToInsert,
        createdAt: new Date(),
      })
      .onConflictDoUpdate({
        target: consolidated_data.projectId,
        set: consolidatedDataToInsert
      });

    // Mettre à jour l'étape du workflow
    const updatedStep = await db
      .update(project_analysis_progress)
      .set({
        status: 'completed',
        content: JSON.stringify(validatedData.consolidatedData),
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(project_analysis_progress.id, workflowStep[0].workflow.id))
      .returning();

    // ✅ Déclencher automatiquement l'étape suivante seulement si pas en mode debug
    let nextStepTriggered = false;
    let nextStepError;
    if (skipAutoTrigger !== 'true') {
      console.log(`✅ Étape 2 terminée, déclenchement automatique de l'étape 3 pour le projet: ${projectUniqueId}`);
      const nextStepResult = await triggerNextWorkflowStep(projectUniqueId, workflowStep[0].step?.order || 2);
      nextStepTriggered = nextStepResult.success;
      nextStepError = nextStepResult.error;
      
      if (nextStepResult.success) {
        console.log(`🚀 Étape suivante déclenchée automatiquement avec succès`);
      } else {
        console.warn(`⚠️ Impossible de déclencher l'étape suivante automatiquement: ${nextStepResult.error}`);
      }
    } else {
      console.log(`🔧 Mode debug activé - étape suivante non déclenchée automatiquement`);
    }

    res.status(200).json({
      success: true,
      message: 'Données consolidées reçues et enregistrées avec succès',
      workflowStepId: updatedStep[0].id,
      data: validatedData.consolidatedData,
      nextStepTriggered,
      nextStepError,
      debugMode: skipAutoTrigger === 'true'
    });
  } catch (error) {
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'RECEIVE_CONSOLIDATED_DATA_ERROR'
    });
  }
};

/**
 * Endpoint pour recevoir l'analyse de réputation de l'IA (Étape 3)
 * @route POST /api/workflow/reputation-analysis/:projectUniqueId
 * @param {ReputationAnalysisPayload} body - Données d'analyse de réputation
 * @returns {ReputationAnalysisResponse} Confirmation et données sauvegardées
 * @access Public (pour IA)
 */
export const receiveReputationAnalysis = async (req: Request, res: Response): Promise<any> => {
  try {
    const { projectUniqueId } = req.params;
    const { skipAutoTrigger } = req.query; // Paramètre pour le mode debug
    const validatedData = ReputationAnalysisPayloadSchema.parse({ 
      ...req.body,
      projectUniqueId 
    });

    console.log(`📊 Réception de l'analyse de réputation pour le projet: ${projectUniqueId}`);

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

    // Traiter les porteurs de projet
    const createdOwners = [];
    for (const owner of validatedData.reputationAnalysis.projectOwners) {
      // Vérifier si le porteur existe déjà
      const existingOwner = await db
        .select()
        .from(project_owners)
        .where(and(
          eq(project_owners.projectId, project[0].id),
          eq(project_owners.name, owner.name)
        ))
        .limit(1);

      if (existingOwner.length > 0) {
        // Mettre à jour le porteur existant
        const updatedOwner = await db
          .update(project_owners)
          .set({
            experienceYears: owner.experienceYears,
            reputationScore: owner.reputationScore,
            reputationJustification: owner.reputationJustification,
          })
          .where(eq(project_owners.id, existingOwner[0].id))
          .returning();
        
        createdOwners.push(updatedOwner[0]);
      } else {
        // Créer un nouveau porteur
        const newOwner = await db
          .insert(project_owners)
          .values({
            projectId: project[0].id,
            name: owner.name,
            experienceYears: owner.experienceYears,
            reputationScore: owner.reputationScore,
            reputationJustification: owner.reputationJustification,
          })
          .returning();
        
        createdOwners.push(newOwner[0]);
      }
    }

    // Traiter les sociétés
    const createdCompanies = [];
    for (const company of validatedData.reputationAnalysis.companies) {
      // Vérifier si la société existe déjà
      const existingCompany = await db
        .select()
        .from(companies)
        .where(and(
          eq(companies.projectId, project[0].id),
          eq(companies.name, company.name)
        ))
        .limit(1);

      if (existingCompany.length > 0) {
        // Mettre à jour la société existante
        const updatedCompany = await db
          .update(companies)
          .set({
            reputationScore: company.reputationScore,
            reputationJustification: company.reputationJustification,
            ...(company.siret && { siret: company.siret }),
          })
          .where(eq(companies.id, existingCompany[0].id))
          .returning();
        
        createdCompanies.push(updatedCompany[0]);
      } else {
        // Créer une nouvelle société
        const newCompany = await db
          .insert(companies)
          .values({
            projectId: project[0].id,
            name: company.name,
            siret: company.siret || `TEMP${Date.now()}`, // SIRET temporaire si non fourni
            reputationScore: company.reputationScore,
            reputationJustification: company.reputationJustification,
          })
          .returning();
        
        createdCompanies.push(newCompany[0]);
      }
    }

    console.log(`✅ ${createdOwners.length} porteurs et ${createdCompanies.length} sociétés traités pour le projet ${projectUniqueId}`);

    // Récupérer l'étape d'analyse avec order = 3 (analyse de réputation)
    const analysisStep = await db
      .select()
      .from(analysis_steps)
      .where(and(
        eq(analysis_steps.order, 3),
        eq(analysis_steps.isActive, 1)
      ))
      .limit(1);

    if (analysisStep.length === 0) {
      return res.status(404).json({ 
        error: 'Étape d\'analyse non trouvée (order = 3)',
        code: 'ANALYSIS_STEP_NOT_FOUND'
      });
    }

    // Mettre à jour l'étape du workflow
    const workflowStep = await db
      .select({
        workflow: project_analysis_progress,
        step: analysis_steps
      })
      .from(project_analysis_progress)
      .leftJoin(analysis_steps, eq(project_analysis_progress.stepId, analysis_steps.id))
      .where(
        and(
          eq(project_analysis_progress.projectId, project[0].id),
          eq(project_analysis_progress.stepId, analysisStep[0].id)
        )
      )
      .limit(1);

    if (workflowStep.length === 0) {
      return res.status(404).json({ 
        error: 'Étape de workflow non trouvée',
        code: 'WORKFLOW_STEP_NOT_FOUND'
      });
    }

    // Marquer l'étape comme terminée
    const updatedStep = await db
      .update(project_analysis_progress)
      .set({
        status: 'completed',
        content: `Analyse de réputation terminée: ${createdOwners.length} porteurs et ${createdCompanies.length} sociétés analysés`,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(project_analysis_progress.id, workflowStep[0].workflow.id))
      .returning();

    // Déclencher automatiquement l'étape suivante seulement si pas en mode debug
    let nextStepTriggered = false;
    let nextStepError;
    if (skipAutoTrigger !== 'true') {
      console.log(`✅ Étape 3 terminée, déclenchement automatique de l'étape 4 pour le projet: ${projectUniqueId}`);
      const nextStepResult = await triggerNextWorkflowStep(projectUniqueId, workflowStep[0].step?.order || 3);
      nextStepTriggered = nextStepResult.success;
      nextStepError = nextStepResult.error;
      
      if (nextStepResult.success) {
        console.log(`🚀 Étape suivante déclenchée automatiquement avec succès`);
      } else {
        console.warn(`⚠️ Impossible de déclencher l'étape suivante automatiquement: ${nextStepResult.error}`);
      }
    } else {
      console.log(`🔧 Mode debug activé - étape suivante non déclenchée automatiquement`);
    }

    res.status(200).json({
      success: true,
      message: 'Analyse de réputation reçue et enregistrée avec succès',
      workflowStepId: updatedStep[0].id,
      data: {
        projectOwners: createdOwners,
        companies: createdCompanies
      },
      nextStepTriggered,
      nextStepError,
      debugMode: skipAutoTrigger === 'true'
    });
  } catch (error) {
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'RECEIVE_REPUTATION_ANALYSIS_ERROR'
    });
  }
};

// Endpoints spécifiques pour chaque étape (appelés par Manus)

/**
 * Endpoint pour l'étape 1: Vue d'ensemble du projet
 * @route POST /api/workflow/step-1-overview
 */
export const updateOverviewStep = async (req: Request, res: Response): Promise<any> => {
  try {
    const { projectUniqueId, content, manusConversationUrl }: WorkflowStepEndpointInput = req.body;

    // Récupérer le vrai stepId de l'étape avec order = 1
    const step = await db
      .select()
      .from(analysis_steps)
      .where(and(
        eq(analysis_steps.order, 1),
        eq(analysis_steps.isActive, 1)
      ))
      .limit(1);

    if (step.length === 0) {
      return res.status(404).json({ 
        error: 'Étape d\'analyse non trouvée (order = 1)',
        code: 'ANALYSIS_STEP_NOT_FOUND'
      });
    }

    const updateData: UpdateWorkflowStepInput = {
      projectUniqueId,
      stepId: step[0].id, // Utiliser le vrai ID au lieu de l'order
      status: 'completed',
      content,
      manusConversationUrl
    };

    // Réutiliser la logique de updateWorkflowStep
    req.body = updateData;
    return await updateWorkflowStep(req, res);
  } catch (error) {
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'UPDATE_OVERVIEW_STEP_ERROR'
    });
  }
};

/**
 * Endpoint pour l'étape 2: Analyse globale
 * @route POST /api/workflow/step-2-analysis
 */
export const updateAnalysisStep = async (req: Request, res: Response): Promise<any> => {
  try {
    const { projectUniqueId, content, manusConversationUrl }: WorkflowStepEndpointInput = req.body;

    // Récupérer le vrai stepId de l'étape avec order = 2
    const step = await db
      .select()
      .from(analysis_steps)
      .where(and(
        eq(analysis_steps.order, 2),
        eq(analysis_steps.isActive, 1)
      ))
      .limit(1);

    if (step.length === 0) {
      return res.status(404).json({ 
        error: 'Étape d\'analyse non trouvée (order = 2)',
        code: 'ANALYSIS_STEP_NOT_FOUND'
      });
    }

    const updateData: UpdateWorkflowStepInput = {
      projectUniqueId,
      stepId: step[0].id, // Utiliser le vrai ID au lieu de l'order
      status: 'completed',
      content,
      manusConversationUrl
    };

    req.body = updateData;
    return await updateWorkflowStep(req, res);
  } catch (error) {
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'UPDATE_ANALYSIS_STEP_ERROR'
    });
  }
};

/**
 * Endpoint pour l'étape 3: Analyse de réputation
 * @route POST /api/workflow/step-3-reputation
 */
export const updateReputationStep = async (req: Request, res: Response): Promise<any> => {
  try {
    const { projectUniqueId, content, manusConversationUrl }: WorkflowStepEndpointInput = req.body;

    // Récupérer le vrai stepId de l'étape avec order = 3 (analyse de réputation)
    const step = await db
      .select()
      .from(analysis_steps)
      .where(and(
        eq(analysis_steps.order, 3),
        eq(analysis_steps.isActive, 1)
      ))
      .limit(1);

    if (step.length === 0) {
      return res.status(404).json({ 
        error: 'Étape d\'analyse non trouvée (order = 3)',
        code: 'ANALYSIS_STEP_NOT_FOUND'
      });
    }

    const updateData: UpdateWorkflowStepInput = {
      projectUniqueId,
      stepId: step[0].id, // Utiliser le vrai ID au lieu de l'order
      status: 'completed',
      content: content || '',
      manusConversationUrl: manusConversationUrl || undefined,
    };

    req.body = updateData;
    return await updateWorkflowStep(req, res);
  } catch (error) {
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'UPDATE_REPUTATION_STEP_ERROR'
    });
  }
};

/**
 * Endpoint pour l'étape 4: Récupération des documents manquants
 * @route POST /api/workflow/step-4-documents
 */
export const updateDocumentsStep = async (req: Request, res: Response): Promise<any> => {
  try {
    const { projectUniqueId, content, manusConversationUrl }: WorkflowStepEndpointInput = req.body;

    // Récupérer le vrai stepId de l'étape avec order = 4 (documents manquants)
    const step = await db
      .select()
      .from(analysis_steps)
      .where(and(
        eq(analysis_steps.order, 4),
        eq(analysis_steps.isActive, 1)
      ))
      .limit(1);

    if (step.length === 0) {
      return res.status(404).json({ 
        error: 'Étape d\'analyse non trouvée (order = 4)',
        code: 'ANALYSIS_STEP_NOT_FOUND'
      });
    }

    const updateData: UpdateWorkflowStepInput = {
      projectUniqueId,
      stepId: step[0].id, // Utiliser le vrai ID au lieu de l'order
      status: 'completed',
      content,
      manusConversationUrl
    };

    req.body = updateData;
    return await updateWorkflowStep(req, res);
  } catch (error) {
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'UPDATE_DOCUMENTS_STEP_ERROR'
    });
  }
};

/**
 * Endpoint pour l'étape 5: Points de vigilance
 * @route POST /api/workflow/step-5-vigilance
 */
export const updateVigilanceStep = async (req: Request, res: Response): Promise<any> => {
  try {
    const { projectUniqueId, content, manusConversationUrl }: WorkflowStepEndpointInput = req.body;

    // Récupérer le vrai stepId de l'étape avec order = 5 (points de vigilance)
    const step = await db
      .select()
      .from(analysis_steps)
      .where(and(
        eq(analysis_steps.order, 5),
        eq(analysis_steps.isActive, 1)
      ))
      .limit(1);

    if (step.length === 0) {
      return res.status(404).json({ 
        error: 'Étape d\'analyse non trouvée (order = 5)',
        code: 'ANALYSIS_STEP_NOT_FOUND'
      });
    }

    const updateData: UpdateWorkflowStepInput = {
      projectUniqueId,
      stepId: step[0].id, // Utiliser le vrai ID au lieu de l'order
      status: 'completed',
      content,
      manusConversationUrl
    };

    req.body = updateData;
    return await updateWorkflowStep(req, res);
  } catch (error) {
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'UPDATE_VIGILANCE_STEP_ERROR'
    });
  }
};

/**
 * Endpoint pour l'étape 6: Rédaction d'un message
 * @route POST /api/workflow/step-6-message
 */
export const updateMessageStep = async (req: Request, res: Response): Promise<any> => {
  try {
    const { projectUniqueId, content, manusConversationUrl }: WorkflowStepEndpointInput = req.body;

    // Récupérer le vrai stepId de l'étape avec order = 6 (rédaction message)
    const step = await db
      .select()
      .from(analysis_steps)
      .where(and(
        eq(analysis_steps.order, 6),
        eq(analysis_steps.isActive, 1)
      ))
      .limit(1);

    if (step.length === 0) {
      return res.status(404).json({ 
        error: 'Étape d\'analyse non trouvée (order = 6)',
        code: 'ANALYSIS_STEP_NOT_FOUND'
      });
    }

    const updateData: UpdateWorkflowStepInput = {
      projectUniqueId,
      stepId: step[0].id, // Utiliser le vrai ID au lieu de l'order
      status: 'completed',
      content,
      manusConversationUrl
    };

    req.body = updateData;
    return await updateWorkflowStep(req, res);
  } catch (error) {
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'UPDATE_MESSAGE_STEP_ERROR'
    });
  }
};

// Nouveaux endpoints pour les analyses IA structurées

/**
 * Endpoint pour recevoir l'analyse macro de l'IA (Étape 1)
 * @route POST /api/workflow/analysis-macro/:projectUniqueId
 */
export const receiveAnalysisMacro = async (req: Request, res: Response): Promise<any> => {
  try {
    const { projectUniqueId } = req.params;
    const { skipAutoTrigger } = req.query; // ✅ Nouveau paramètre pour le mode debug
    const validatedData = AnalysisMacroPayloadSchema.parse({ 
      ...req.body, 
      projectUniqueId 
    });

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

    // Trouver l'étape d'analyse macro (étape avec order = 1, qui est "Analyse globale")
    const workflowStep = await db
      .select({
        workflow: project_analysis_progress,
        step: analysis_steps
      })
      .from(project_analysis_progress)
      .leftJoin(analysis_steps, eq(project_analysis_progress.stepId, analysis_steps.id))
      .where(
        and(
          eq(project_analysis_progress.projectId, project[0].id),
          eq(analysis_steps.order, 1) // Étape avec order = 1 = analyse macro
        )
      )
      .limit(1);

    if (workflowStep.length === 0) {
      return res.status(404).json({ 
        error: 'Étape de workflow non trouvée. Initialisez d\'abord le workflow.',
        code: 'WORKFLOW_STEP_NOT_FOUND'
      });
    }

    // Mettre à jour l'étape avec les données de l'analyse macro
    const updatedStep = await db
      .update(project_analysis_progress)
      .set({
        status: 'completed',
        content: JSON.stringify(validatedData.macroAnalysis),
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(project_analysis_progress.id, workflowStep[0].workflow.id))
      .returning();

    // Mettre à jour la description du projet avec l'analyse macro
    await db
      .update(projects)
      .set({
        description: validatedData.macroAnalysis,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, project[0].id));

    // ✅ Déclencher automatiquement l'étape suivante seulement si pas en mode debug
    let nextStepTriggered = false;
    let nextStepError;
    if (skipAutoTrigger !== 'true') {
      console.log(`✅ Étape 1 terminée, déclenchement automatique de l'étape 2 pour le projet: ${projectUniqueId}`);
      const nextStepResult = await triggerNextWorkflowStep(projectUniqueId, workflowStep[0].step?.order || 1);
      nextStepTriggered = nextStepResult.success;
      nextStepError = nextStepResult.error;
      
      if (nextStepResult.success) {
        console.log(`🚀 Étape suivante déclenchée automatiquement avec succès`);
      } else {
        console.warn(`⚠️ Impossible de déclencher l'étape suivante automatiquement: ${nextStepResult.error}`);
      }
    } else {
      console.log(`🔧 Mode debug activé - étape suivante non déclenchée automatiquement`);
    }

    res.status(200).json({
      success: true,
      message: 'Analyse macro reçue et enregistrée avec succès',
      workflowStepId: updatedStep[0].id,
      data: validatedData.macroAnalysis,
      nextStepTriggered,
      nextStepError,
      debugMode: skipAutoTrigger === 'true'
    });
  } catch (error) {
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'RECEIVE_ANALYSIS_MACRO_ERROR'
    });
  }
};

/**
 * Endpoint pour recevoir les documents manquants de l'IA (Étape 3)
 * @route POST /api/workflow/missing-documents/:projectUniqueId
 */
export const receiveMissingDocuments = async (req: Request, res: Response): Promise<any> => {
  try {
    const { projectUniqueId } = req.params;
    const { skipAutoTrigger } = req.query; // ✅ Nouveau paramètre pour le mode debug
    const validatedData = MissingDocumentsPayloadSchema.parse({ 
      ...req.body, 
      projectUniqueId 
    });

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

    // ✅ ÉCRASEMENT : Supprimer les documents manquants existants pour ce projet
    await db
      .delete(missing_documents)
      .where(eq(missing_documents.projectId, project[0].id));

    console.log(`🗑️ Documents manquants existants supprimés pour le projet ${projectUniqueId}`);

    // Créer les nouveaux documents manquants
    const documentsToCreate = validatedData.missingDocuments.map(doc => ({
      projectId: project[0].id,
      name: doc.name,
      whyMissing: doc.whyMissing,
      impactOnProject: doc.impactOnProject || doc.whyMissing, // Utiliser whyMissing si impactOnProject n'est pas fourni
      status: 'pending' as const,
      whyStatus: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const createdDocuments = await db
      .insert(missing_documents)
      .values(documentsToCreate)
      .returning();

    console.log(`✅ ${createdDocuments.length} nouveaux documents manquants créés pour le projet ${projectUniqueId}`);

    // Récupérer l'étape d'analyse avec order = 4 (documents manquants)
    const analysisStep = await db
      .select()
      .from(analysis_steps)
      .where(and(
        eq(analysis_steps.order, 4),
        eq(analysis_steps.isActive, 1)
      ))
      .limit(1);

    if (analysisStep.length === 0) {
      return res.status(404).json({ 
        error: 'Étape d\'analyse non trouvée (order = 4)',
        code: 'ANALYSIS_STEP_NOT_FOUND'
      });
    }

    // Mettre à jour l'étape du workflow
    const workflowStep = await db
      .select()
      .from(project_analysis_progress)
      .where(
        and(
          eq(project_analysis_progress.projectId, project[0].id),
          eq(project_analysis_progress.stepId, analysisStep[0].id) // Utiliser le vrai stepId
        )
      )
      .limit(1);

    if (workflowStep.length > 0) {
      await db
        .update(project_analysis_progress)
        .set({
          status: 'completed',
          content: JSON.stringify(validatedData.missingDocuments),
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(project_analysis_progress.id, workflowStep[0].id));
    }

    // ✅ Déclencher automatiquement l'étape suivante seulement si pas en mode debug
    let nextStepTriggered = false;
    if (skipAutoTrigger !== 'true') {
      // ✅ CORRECTION: Utiliser l'ordre correct de l'étape qui vient d'être terminée (order = 4)
      const triggerResult = await triggerNextWorkflowStep(projectUniqueId, analysisStep[0].order);
      nextStepTriggered = triggerResult.success;
      if (!triggerResult.success) {
        console.warn(`⚠️ Échec du déclenchement automatique de l'étape suivante: ${triggerResult.error}`);
      } else {
        console.log(`✅ Étape suivante déclenchée automatiquement (mode normal)`);
      }
    } else {
      console.log(`🔧 Mode debug activé - étape suivante non déclenchée automatiquement`);
    }

    res.status(200).json({
      success: true,
      message: 'Documents manquants reçus et enregistrés avec succès',
      workflowStepId: workflowStep.length > 0 ? workflowStep[0].id : null,
      documentsCreated: createdDocuments.length,
      data: createdDocuments.map(doc => ({
        id: doc.id,
        name: doc.name,
        status: doc.status
      })),
      nextStepTriggered,
      debugMode: skipAutoTrigger === 'true'
    });
  } catch (error) {
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'RECEIVE_MISSING_DOCUMENTS_ERROR'
    });
  }
};

/**
 * Endpoint de test pour voir comment les placeholders sont remplacés dans un prompt
 * @route GET /api/workflow/test-prompt/:projectUniqueId
 */
export const testPromptProcessing = async (req: Request, res: Response): Promise<any> => {
  try {
    const { projectUniqueId } = req.params;
    const { prompt } = req.query;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ 
        error: 'Le paramètre "prompt" est requis',
        code: 'MISSING_PROMPT'
      });
    }

    // Générer l'URL de la page des documents si le placeholder {documentListUrl} est présent
    let documentListUrl = '';
    if (prompt.includes('{documentListUrl}')) {
      // URL de base de l'API (à configurer selon l'environnement)
      const baseUrl = process.env.API_BASE_URL || 'https://ai-bricks-analyst-production.up.railway.app';
      documentListUrl = `${baseUrl}/api/projects/${projectUniqueId}/documents-list`;
    }
    
    // Remplacer les placeholders dans le prompt
    let processedPrompt = prompt.replace(/{projectUniqueId}/g, projectUniqueId);
    processedPrompt = processedPrompt.replace(/{documentListUrl}/g, documentListUrl);

    res.json({
      originalPrompt: prompt,
      processedPrompt: processedPrompt,
      replacements: {
        projectUniqueId: projectUniqueId,
        documentListUrl: documentListUrl || 'Non utilisé'
      }
    });

  } catch (error) {
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'TEST_PROMPT_ERROR'
    });
  }
};

/**
 * Endpoint pour recevoir les forces et faiblesses de l'IA (Étape 4)
 * @route POST /api/workflow/strengths-and-weaknesses/:projectUniqueId
 */
export const receiveStrengthsAndWeaknesses = async (req: Request, res: Response): Promise<any> => {
  try {
    const { projectUniqueId } = req.params;
    const { skipAutoTrigger } = req.query; // ✅ Nouveau paramètre pour le mode debug
    const validatedData = StrengthsWeaknessesPayloadSchema.parse({ 
      ...req.body, 
      projectUniqueId 
    });

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

    // ✅ ÉCRASEMENT : Supprimer les forces/faiblesses existantes pour ce projet
    await db
      .delete(strengths_and_weaknesses)
      .where(eq(strengths_and_weaknesses.projectId, project[0].id));

    console.log(`🗑️ Forces/faiblesses existantes supprimées pour le projet ${projectUniqueId}`);

    // Créer les nouvelles forces et faiblesses
    const itemsToCreate = validatedData.strengthsAndWeaknesses.map((item: any) => ({
      projectId: project[0].id,
      type: item.type,
      title: item.title,
      description: item.description,
      riskLevel: 'medium' as const, // Valeur par défaut
      potentialImpact: '',
      recommendations: [],
      status: 'pending' as const,
      whyStatus: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const createdItems = await db
      .insert(strengths_and_weaknesses)
      .values(itemsToCreate)
      .returning();

    console.log(`✅ ${createdItems.length} nouvelles forces/faiblesses créées pour le projet ${projectUniqueId}`);

    // Récupérer l'étape d'analyse avec order = 5 (points de vigilance)
    const analysisStep = await db
      .select()
      .from(analysis_steps)
      .where(and(
        eq(analysis_steps.order, 5),
        eq(analysis_steps.isActive, 1)
      ))
      .limit(1);

    if (analysisStep.length === 0) {
      return res.status(404).json({ 
        error: 'Étape d\'analyse non trouvée (order = 5)',
        code: 'ANALYSIS_STEP_NOT_FOUND'
      });
    }

    // Mettre à jour l'étape du workflow
    const workflowStep = await db
      .select()
      .from(project_analysis_progress)
      .where(
        and(
          eq(project_analysis_progress.projectId, project[0].id),
          eq(project_analysis_progress.stepId, analysisStep[0].id) // Utiliser le vrai stepId
        )
      )
      .limit(1);

    if (workflowStep.length > 0) {
      await db
        .update(project_analysis_progress)
        .set({
          status: 'completed',
          content: JSON.stringify(validatedData.strengthsAndWeaknesses),
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(project_analysis_progress.id, workflowStep[0].id));
    }

    // ✅ Déclencher automatiquement l'étape suivante seulement si pas en mode debug
    let nextStepTriggered = false;
    if (skipAutoTrigger !== 'true') {
      // ✅ CORRECTION: Utiliser l'ordre correct de l'étape qui vient d'être terminée (order = 5)
      const triggerResult = await triggerNextWorkflowStep(projectUniqueId, analysisStep[0].order);
      nextStepTriggered = triggerResult.success;
      if (!triggerResult.success) {
        console.warn(`⚠️ Échec du déclenchement automatique de l'étape suivante: ${triggerResult.error}`);
      } else {
        console.log(`✅ Étape suivante déclenchée automatiquement (mode normal)`);
      }
    } else {
      console.log(`🔧 Mode debug activé - étape suivante non déclenchée automatiquement`);
    }

    res.status(200).json({
      success: true,
      message: 'Forces et faiblesses reçues et enregistrées avec succès',
      workflowStepId: workflowStep.length > 0 ? workflowStep[0].id : null,
      itemsCreated: createdItems.length,
      data: createdItems.map((item: any) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        status: item.status
      })),
      nextStepTriggered,
      debugMode: skipAutoTrigger === 'true'
    });
  } catch (error) {
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'RECEIVE_STRENGTHS_WEAKNESSES_ERROR'
    });
  }
};

/**
 * Endpoint pour recevoir le message final de l'IA (Étape 5)
 * @route POST /api/workflow/final-message/:projectUniqueId
 */
export const receiveFinalMessage = async (req: Request, res: Response): Promise<any> => {
  try {
    const { projectUniqueId } = req.params;
    const validatedData = FinalMessagePayloadSchema.parse({ 
      ...req.body, 
      projectUniqueId 
    });

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

    // Récupérer la session la plus récente du projet pour y ajouter la conversation
    const recentSession = await db
      .select()
      .from(sessions)
      .where(eq(sessions.projectId, project[0].id))
      .orderBy(desc(sessions.createdAt))
      .limit(1);

    if (recentSession.length === 0) {
      return res.status(404).json({ 
        error: 'Aucune session trouvée pour ce projet',
        code: 'SESSION_NOT_FOUND'
      });
    }

    // ✅ GESTION MESSAGES : Logique draft vs nouveau message
    // Vérifier d'abord l'état du workflow step pour cette étape
    const analysisStep = await db
      .select()
      .from(analysis_steps)
      .where(and(
        eq(analysis_steps.order, 6),
        eq(analysis_steps.isActive, 1)
      ))
      .limit(1);

    let isDraftMode = false;
    if (analysisStep.length > 0) {
      const workflowStep = await db
        .select()
        .from(project_analysis_progress)
        .where(
          and(
            eq(project_analysis_progress.projectId, project[0].id),
            eq(project_analysis_progress.stepId, analysisStep[0].id)
          )
        )
        .limit(1);
      
      // Si l'étape est encore "in_progress", on est en mode draft
      isDraftMode = workflowStep.length > 0 && workflowStep[0].status === 'in_progress';
    }

    if (isDraftMode) {
      // MODE DRAFT : Supprimer les messages IA existants pour cette session et les remplacer
      await db
        .delete(conversations)
        .where(and(
          eq(conversations.sessionId, recentSession[0].id),
          eq(conversations.sender, 'IA')
        ));
      
      console.log(`🗑️ Messages IA existants supprimés (mode draft) pour le projet ${projectUniqueId}`);
    }

    // Créer le nouveau message (que ce soit en mode draft ou nouveau)
    await db
      .insert(conversations)
      .values({
        sessionId: recentSession[0].id,
        sessionDate: new Date(),
        sender: 'IA',
        message: validatedData.message,
        attachments: [],
      });

    console.log(`✅ ${isDraftMode ? 'Message draft mis à jour' : 'Nouveau message créé'} pour le projet ${projectUniqueId}`);

    // Utiliser l'étape d'analyse déjà récupérée plus haut (analysisStep)
    if (analysisStep.length === 0) {
      return res.status(404).json({ 
        error: 'Étape d\'analyse non trouvée (order = 6)',
        code: 'ANALYSIS_STEP_NOT_FOUND'
      });
    }

    const workflowStep = await db
      .select()
      .from(project_analysis_progress)
      .where(
        and(
          eq(project_analysis_progress.projectId, project[0].id),
          eq(project_analysis_progress.stepId, analysisStep[0].id) // Utiliser le vrai stepId
        )
      )
      .limit(1);

    if (workflowStep.length > 0) {
      await db
        .update(project_analysis_progress)
        .set({
          status: 'completed',
          content: 'Message final créé dans conversations',
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(project_analysis_progress.id, workflowStep[0].id));
    }

    // Pour l'étape 6 (dernière étape), pas de déclenchement automatique
    // Le workflow est maintenant terminé
    console.log(`✅ Workflow terminé pour le projet: ${projectUniqueId}`);

    res.status(200).json({
      success: true,
      message: 'Message final reçu et enregistré dans les conversations avec succès. Workflow terminé.',
      workflowStepId: workflowStep.length > 0 ? workflowStep[0].id : null,
      workflowCompleted: true
    });
  } catch (error) {
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'RECEIVE_FINAL_MESSAGE_ERROR'
    });
  }
};

/**
 * Génère un ZIP avec tous les documents d'un projet et l'envoie à Manus
 * @route POST /api/workflow/upload-zip-from-url
 */
export const uploadZipFromUrl = async (req: Request, res: Response): Promise<any> => {
  try {
    const { projectUniqueId } = req.body;

    console.log(`🚀🚀🚀 DEBUT uploadZipFromUrl - Fonction appelée !`);
    console.log(`📋 req.body complet:`, JSON.stringify(req.body, null, 2));
    console.log(`🔍 projectUniqueId extrait: ${projectUniqueId}`);

    if (!projectUniqueId) {
      console.log(`❌ ProjectUniqueId manquant dans req.body`);
      return res.status(400).json({
        error: 'ProjectUniqueId est requis',
        code: 'MISSING_PROJECT_UNIQUE_ID'
      });
    }

    console.log(`🚀 Début de l'upload ZIP pour le projet: ${projectUniqueId}`);
    console.log(`📋 Payload reçu:`, JSON.stringify(req.body, null, 2));

    // Récupérer le projet
    console.log(`🔍 Recherche du projet: ${projectUniqueId}`);
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.projectUniqueId, projectUniqueId))
      .limit(1);

    if (project.length === 0) {
      console.log(`❌ Projet non trouvé: ${projectUniqueId}`);
      return res.status(404).json({
        error: 'Projet non trouvé',
        code: 'PROJECT_NOT_FOUND'
      });
    }

    console.log(`✅ Projet trouvé: ${project[0].projectName} (ID: ${project[0].id})`);

    // Vérifier si un ZIP existe déjà pour ce projet
    let zipS3Url = project[0].zipUrl;
    let zipFileName = '';
    let zipSize = 0;
    let zipHash = '';
    let projectDocuments: any[] = []; // Initialiser pour éviter les erreurs
    
    if (zipS3Url) {
      console.log(`♻️ ZIP existant trouvé pour le projet: ${zipS3Url}`);
      console.log(`🚀 Réutilisation du ZIP existant au lieu d'en créer un nouveau`);
      
      // Extraire le nom du fichier de l'URL S3
      zipFileName = zipS3Url.split('/').pop() || 'existing-zip.zip';
      zipSize = 0; // Taille inconnue pour un ZIP existant
      zipHash = 'existing';
      
      // Pour un ZIP existant, on ne connaît pas le nombre exact de documents
      // On peut essayer de le récupérer ou utiliser une valeur par défaut
      console.log(`📄 Récupération du nombre de documents pour le ZIP existant...`);
      const allDocuments = await db
        .select({
          fileName: documents.fileName,
          url: documents.url,
          status: documents.status,
          sessionId: documents.sessionId,
        })
        .from(documents)
        .innerJoin(sessions, eq(documents.sessionId, sessions.id))
        .where(eq(sessions.projectId, project[0].id));
      
      projectDocuments = allDocuments.filter(doc => doc.status === 'PROCESSED');
      console.log(`📄 ${projectDocuments.length} documents PROCESSED trouvés pour le projet existant`);
    } else {
      console.log(`📦 Aucun ZIP existant trouvé, création d'un nouveau ZIP...`);
      
      // Récupérer tous les documents du projet via les sessions
      console.log(`🔍 Recherche des documents pour le projet ${project[0].id}...`);
      
      // D'abord, voir tous les documents (peu importe le statut)
      const allDocuments = await db
        .select({
          fileName: documents.fileName,
          url: documents.url,
          status: documents.status,
          sessionId: documents.sessionId,
        })
        .from(documents)
        .innerJoin(sessions, eq(documents.sessionId, sessions.id))
        .where(eq(sessions.projectId, project[0].id));
      
      console.log(`📊 Tous les documents du projet (${allDocuments.length} total):`);
      allDocuments.forEach((doc, index) => {
        console.log(`   ${index + 1}. ${doc.fileName} - Status: ${doc.status} - URL: ${doc.url}`);
      });
      
      // Maintenant, filtrer seulement les PROCESSED
      projectDocuments = allDocuments.filter(doc => doc.status === 'PROCESSED');
      console.log(`📄 Documents avec statut PROCESSED: ${projectDocuments.length}/${allDocuments.length}`);

      if (projectDocuments.length === 0) {
        console.log(`❌ Aucun document trouvé pour le projet ${projectUniqueId}`);
        return res.status(400).json({
          error: 'Aucun document trouvé pour ce projet',
          code: 'NO_DOCUMENTS_FOUND'
        });
      }

      console.log(`📄 ${projectDocuments.length} documents trouvés pour le projet ${projectUniqueId}`);
      projectDocuments.forEach((doc, index) => {
        console.log(`   ${index + 1}. ${doc.fileName} - ${doc.url}`);
      });

      // Créer le ZIP et l'uploader vers S3
      console.log(`📦 Création du ZIP à partir de ${projectDocuments.length} documents...`);
      
      // Préparer les données du projet pour inclure conversation.txt et fiche.txt
      const projectData = {
        conversation: project[0].conversation || undefined,
        fiche: project[0].fiche || undefined
      };
      
      const zipResult = await createZipFromDocuments(projectDocuments, projectUniqueId, projectData);
      console.log(`✅ ZIP créé avec succès:`, {
        fileName: zipResult.fileName,
        s3Url: zipResult.s3Url,
        size: zipResult.size,
        hash: zipResult.hash
      });

      // Sauvegarder l'URL du ZIP dans le projet pour la prochaine fois
      zipS3Url = zipResult.s3Url;
      zipFileName = zipResult.fileName;
      zipSize = zipResult.size;
      zipHash = zipResult.hash;
      
      await db
        .update(projects)
        .set({ zipUrl: zipS3Url })
        .where(eq(projects.projectUniqueId, projectUniqueId));
      
      console.log(`💾 URL du ZIP sauvegardée dans le projet: ${zipS3Url}`);
    }

    console.log(`🔥 DEBUG: ZIP S3 URL à utiliser = ${zipS3Url}`);
    console.log(`🔥 DEBUG: Continuons vers récupération étape 0...`);

    // Récupérer le prompt de l'étape 0 (Upload des documents)
    console.log(`🔍 Recherche de l'étape 0 dans analysis_steps...`);
    const step0 = await db
      .select()
      .from(analysis_steps)
      .where(and(
        eq(analysis_steps.order, 0),
        eq(analysis_steps.isActive, 1)
      ))
      .limit(1);

    if (step0.length === 0) {
      console.log(`❌ Étape 0 non trouvée dans analysis_steps`);
      return res.status(500).json({
        error: 'Étape 0 non trouvée dans le workflow. Exécutez le script add-step-0-upload-zip.ts',
        code: 'STEP_0_NOT_FOUND'
      });
    }

    console.log(`✅ Étape 0 trouvée: "${step0[0].name}" (ID: ${step0[0].id})`);
    console.log(`📝 Prompt original (premiers 200 chars): ${step0[0].prompt.substring(0, 200)}...`);

    // Récupérer le prompt dynamique depuis la base de données
    let dynamicMessage = step0[0].prompt;
    
    // Remplacer les variables dynamiques dans le message
    console.log(`🔄 Remplacement des variables dynamiques:`);
    console.log(`   - {projectUniqueId} → ${projectUniqueId}`);
    console.log(`   - {documentCount} → ${projectDocuments.length}`);
    
    dynamicMessage = dynamicMessage.replace(/{projectUniqueId}/g, projectUniqueId);
    dynamicMessage = dynamicMessage.replace(/{documentCount}/g, projectDocuments.length.toString());
    
    console.log(`📝 Message final (premiers 200 chars): ${dynamicMessage.substring(0, 200)}...`);

    // Utiliser l'infrastructure existante pour envoyer à l'API Python
    // Même format que external-tools.ts mais avec zip_url
    // Construire l'URL proxy au lieu d'utiliser l'URL S3 directe
    const baseUrl = process.env.API_BASE_URL || 'https://ai-bricks-analyst-production.up.railway.app';
    const proxyZipUrl = `${baseUrl}/api/projects/${projectUniqueId}/zip/download`;
    
    const payload = {
      zip_url: proxyZipUrl,
      message: dynamicMessage,
      platform: 'manus',
      projectUniqueId
    };

    console.log(`📦 Payload préparé pour l'API Python:`);
    console.log(`   - zip_url: ${payload.zip_url}`);
    console.log(`   - zip_url présent: ${!!payload.zip_url}`);
    console.log(`   - zip_url longueur: ${payload.zip_url ? payload.zip_url.length : 'N/A'}`);
    console.log(`   - platform: ${payload.platform}`);
    console.log(`   - projectUniqueId: ${payload.projectUniqueId}`);
    console.log(`   - message (premiers 200 chars): ${payload.message.substring(0, 200)}...`);
    console.log(`   - taille complète du message: ${payload.message.length} caractères`);
    console.log(`🔍 VERIFICATION PAYLOAD COMPLET:`, JSON.stringify(payload, null, 2));

    // Récupérer la configuration API Python
    let pythonApiUrl = process.env.AI_INTERFACE_ACTION_URL || process.env.AI_INTERFACE_URL;
    
    if (!pythonApiUrl) {
      console.log(`🔍 Recherche de la configuration API Python dans la base de données...`);
      const [config] = await db
        .select()
        .from(api_configurations)
        .where(and(
          eq(api_configurations.name, 'Python API'),
          eq(api_configurations.isActive, true)
        ));
      
      pythonApiUrl = config?.url || 'http://localhost:8000';
      console.log(`🔧 URL récupérée depuis la DB: ${pythonApiUrl}`);
    } else {
      console.log(`🔧 URL récupérée depuis les variables d'environnement: ${pythonApiUrl}`);
    }

    console.log(`📡 Envoi du ZIP à l'API Python: ${pythonApiUrl}/upload-zip-from-url`);
    console.log(`📄 Payload JSON complet:`);
    console.log(JSON.stringify(payload, null, 2));

    // L'URL du ZIP est déjà sauvegardée dans zipS3Url (soit existante, soit nouvellement créée)

    let response;
    try {
      console.log(`🔥 JUSTE AVANT APPEL API PYTHON:`);
      console.log(`   - URL: ${pythonApiUrl}/upload-zip-from-url`);
      console.log(`   - Payload zip_url: ${payload.zip_url}`);
      console.log(`   - Payload complet:`, JSON.stringify(payload, null, 2));
      
      response = await axios.post(`${pythonApiUrl}/upload-zip-from-url`, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 600000, // 10 minutes pour l'upload du ZIP (gros fichiers)
      });
    } catch (axiosError: any) {
      console.error(`❌ Erreur lors de l'appel à l'API Python:`, axiosError.message);
      console.error(`📊 Status:`, axiosError.response?.status);
      console.error(`📄 Response data:`, axiosError.response?.data);
      
      // Marquer l'étape 0 comme échouée
      await db
        .update(project_analysis_progress)
        .set({
          status: 'failed',
          content: `Erreur lors de l'envoi du ZIP à l'API Python: ${axiosError.message}`,
          updatedAt: new Date(),
        })
        .where(and(
          eq(project_analysis_progress.projectId, project[0].id),
          eq(project_analysis_progress.stepId, step0[0].id)
        ));

      return res.status(500).json({
        error: 'Échec de l\'envoi du ZIP à l\'API Python',
        details: axiosError.message,
        code: 'PYTHON_API_ERROR'
      });
    }

    console.log(`📨 Réponse reçue de l'API Python:`, response.status, response.statusText);
    console.log(`📄 Corps de la réponse:`, JSON.stringify(response.data, null, 2));

    // Vérifier que l'API Python a retourné une URL de conversation valide
    const conversationUrl = response.data?.conversation_url;
    if (!conversationUrl || typeof conversationUrl !== 'string' || conversationUrl.trim() === '') {
      console.error(`❌ L'API Python n'a pas retourné d'URL de conversation valide:`, conversationUrl);
      
      // Marquer l'étape 0 comme échouée
      await db
        .update(project_analysis_progress)
        .set({
          status: 'failed',
          content: `L'API Python n'a pas retourné d'URL de conversation valide`,
          updatedAt: new Date(),
        })
        .where(and(
          eq(project_analysis_progress.projectId, project[0].id),
          eq(project_analysis_progress.stepId, step0[0].id)
        ));

      return res.status(500).json({
        error: 'L\'API Python n\'a pas retourné d\'URL de conversation valide',
        details: 'conversation_url manquante ou invalide dans la réponse',
        code: 'INVALID_CONVERSATION_URL'
      });
    }

    // Mettre à jour l'étape 0 comme terminée
    await db
      .update(project_analysis_progress)
      .set({
        status: 'completed',
        content: `ZIP uploadé: ${zipFileName} (${zipSize} bytes)`,
        manusConversationUrl: conversationUrl,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(project_analysis_progress.projectId, project[0].id),
        eq(project_analysis_progress.stepId, step0[0].id)
      ));

    // Sauvegarder l'URL de conversation dans conversations_with_ai
    try {
      // Récupérer la session la plus récente du projet
      const projectSession = await db
        .select()
        .from(sessions)
        .where(eq(sessions.projectId, project[0].id))
        .orderBy(desc(sessions.createdAt))
        .limit(1);

      if (projectSession.length > 0) {
        // Vérifier si cette URL de conversation existe déjà
        const existingConversation = await db
          .select()
          .from(conversations_with_ai)
          .where(eq(conversations_with_ai.url, conversationUrl))
          .limit(1);

        if (existingConversation.length === 0) {
          // Sauvegarder la nouvelle conversation IA
          await db
            .insert(conversations_with_ai)
            .values({
              sessionId: projectSession[0].id,
              url: conversationUrl,
              model: 'manus',
              createdAt: new Date(),
            });
          
          console.log(`💾 URL de conversation sauvegardée dans conversations_with_ai: ${conversationUrl}`);
        } else {
          console.log(`ℹ️ URL de conversation déjà existante dans conversations_with_ai: ${conversationUrl}`);
        }
      }
    } catch (conversationError) {
      console.warn(`⚠️ Erreur lors de la sauvegarde de l'URL de conversation:`, conversationError);
      // Ne pas faire échouer le workflow pour cette erreur
    }

    // Note: zipUrl déjà sauvegardé en base avant l'appel API Python

    // Note: Pas de déclenchement automatique de l'étape suivante
    // C'est Manus qui déclenchera les étapes suivantes via les endpoints dédiés
    let triggerResult = { success: true };

    console.log(`✅ ZIP traité pour le projet: ${projectUniqueId}`);
    console.log(`🔗 URL conversation: ${conversationUrl}`);

    res.status(200).json({
      message: 'ZIP envoyé avec succès à Manus',
      projectUniqueId,
      zipUrl: zipS3Url,
      zipFileName: zipFileName,
      zipSize: zipSize,
      documentCount: zipS3Url === project[0].zipUrl ? 'réutilisé' : 'nouveau',
      conversationUrl,
      nextStepTriggered: triggerResult.success
    });

  } catch (error: any) {
    const { projectUniqueId } = req.body;
    console.error(`❌ Erreur lors de l'upload ZIP pour le projet ${projectUniqueId || 'INCONNU'}:`);
    console.error(`📄 Type d'erreur:`, error.constructor.name);
    console.error(`📄 Message d'erreur:`, error.message);
    
    if (error.response) {
      console.error(`📊 Status de l'erreur HTTP:`, error.response.status);
      console.error(`📋 Headers de l'erreur:`, error.response.headers);
      console.error(`📄 Corps de l'erreur:`, error.response.data);
    }
    
    if (error.request) {
      console.error(`📡 Requête qui a échoué:`, error.request);
    }
    
    console.error(`🔍 Stack trace:`, error.stack);
    
    res.status(500).json({
      error: error.message || 'Erreur lors de l\'upload ZIP',
      code: 'UPLOAD_ZIP_ERROR'
    });
  }
};

/**
 * Génère uniquement le ZIP des documents sans déclencher l'IA
 * @route POST /api/workflow/generate-zip-only
 */
export const generateZipOnly = async (req: Request, res: Response): Promise<any> => {
  try {
    const { projectUniqueId } = req.body;

    if (!projectUniqueId) {
      return res.status(400).json({
        error: 'ProjectUniqueId est requis',
        code: 'MISSING_PROJECT_UNIQUE_ID'
      });
    }

    console.log(`📦 Génération ZIP uniquement pour le projet: ${projectUniqueId}`);

    // Récupérer le projet
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.projectUniqueId, projectUniqueId))
      .limit(1);

    if (project.length === 0) {
      console.log(`❌ Projet non trouvé: ${projectUniqueId}`);
      return res.status(404).json({
        error: 'Projet non trouvé',
        code: 'PROJECT_NOT_FOUND'
      });
    }

    console.log(`✅ Projet trouvé: ${project[0].projectName} (ID: ${project[0].id})`);

    // Récupérer tous les documents du projet via les sessions
    console.log(`🔍 Recherche des documents pour le projet ${project[0].id}...`);
    
    // D'abord, voir tous les documents (peu importe le statut)
    const allDocuments = await db
      .select({
        fileName: documents.fileName,
        url: documents.url,
        status: documents.status,
        sessionId: documents.sessionId,
      })
      .from(documents)
      .innerJoin(sessions, eq(documents.sessionId, sessions.id))
      .where(eq(sessions.projectId, project[0].id));
    
    console.log(`📊 Tous les documents du projet (${allDocuments.length} total):`);
    allDocuments.forEach((doc, index) => {
      console.log(`   ${index + 1}. ${doc.fileName} - Status: ${doc.status} - URL: ${doc.url}`);
    });
    
    // Maintenant, filtrer seulement les PROCESSED
    const projectDocuments = allDocuments.filter(doc => doc.status === 'PROCESSED');
    console.log(`📄 Documents avec statut PROCESSED: ${projectDocuments.length}/${allDocuments.length}`);

    if (projectDocuments.length === 0) {
      console.log(`❌ Aucun document PROCESSED trouvé pour le projet ${projectUniqueId}`);
      return res.status(400).json({
        error: 'Aucun document traité trouvé pour ce projet',
        code: 'NO_PROCESSED_DOCUMENTS_FOUND'
      });
    }

    console.log(`📄 ${projectDocuments.length} documents trouvés pour le projet ${projectUniqueId}`);
    projectDocuments.forEach((doc, index) => {
      console.log(`   ${index + 1}. ${doc.fileName} - ${doc.url}`);
    });

    // Créer le ZIP et l'uploader vers S3
    console.log(`📦 Création du ZIP à partir de ${projectDocuments.length} documents...`);
    
    // Préparer les données du projet pour inclure conversation.txt et fiche.txt
    const projectData = {
      conversation: project[0].conversation || undefined,
      fiche: project[0].fiche || undefined
    };
    
    const zipResult = await createZipFromDocuments(projectDocuments, projectUniqueId, projectData);
    console.log(`✅ ZIP créé avec succès:`, {
      fileName: zipResult.fileName,
      s3Url: zipResult.s3Url,
      size: zipResult.size,
      hash: zipResult.hash
    });

    // Sauvegarder l'URL du ZIP dans la table projects
    console.log(`💾 Sauvegarde de l'URL du ZIP dans le projet: ${zipResult.s3Url}`);
    await db
      .update(projects)
      .set({
        zipUrl: zipResult.s3Url,
        updatedAt: new Date(),
      })
      .where(eq(projects.projectUniqueId, projectUniqueId));

    console.log(`✅ ZIP généré avec succès pour le projet: ${projectUniqueId}`);

    res.status(200).json({
      message: 'ZIP généré avec succès',
      projectUniqueId,
      zipUrl: zipResult.s3Url,
      zipFileName: zipResult.fileName,
      zipSize: zipResult.size,
      documentCount: projectDocuments.length
    });

  } catch (error: any) {
    const { projectUniqueId } = req.body;
    console.error(`❌ Erreur lors de la génération du ZIP pour le projet ${projectUniqueId || 'INCONNU'}:`);
    console.error(`📄 Type d'erreur:`, error.constructor.name);
    console.error(`📄 Message d'erreur:`, error.message);
    
    if (error.response) {
      console.error(`📊 Status de l'erreur HTTP:`, error.response.status);
      console.error(`📋 Headers de l'erreur:`, error.response.headers);
      console.error(`📄 Corps de l'erreur:`, error.response.data);
    }
    
    console.error(`🔍 Stack trace:`, error.stack);
    
    res.status(500).json({
      error: error.message || 'Erreur lors de la génération du ZIP',
      code: 'GENERATE_ZIP_ERROR'
    });
  }
};

/**
 * Déclenche manuellement l'étape 1 (Analyse globale) du workflow
 * @route POST /api/workflow/trigger-step-1/:projectUniqueId
 */
export const triggerStep1Analysis = async (req: Request, res: Response): Promise<any> => {
  try {
    const { projectUniqueId } = req.params;

    if (!projectUniqueId) {
      return res.status(400).json({
        error: 'ProjectUniqueId est requis',
        code: 'MISSING_PROJECT_UNIQUE_ID'
      });
    }

    console.log(`🚀 Déclenchement manuel de l'étape 1 pour le projet: ${projectUniqueId}`);

    // Récupérer le projet
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

    // Récupérer l'étape 1
    const step1 = await db
      .select()
      .from(analysis_steps)
      .where(and(
        eq(analysis_steps.order, 1),
        eq(analysis_steps.isActive, 1)
      ))
      .limit(1);

    if (step1.length === 0) {
      return res.status(500).json({
        error: 'Étape 1 non trouvée dans le workflow',
        code: 'STEP_1_NOT_FOUND'
      });
    }

    // Vérifier que l'étape 1 existe dans le workflow du projet
    const workflowStep1 = await db
      .select()
      .from(project_analysis_progress)
      .where(and(
        eq(project_analysis_progress.projectId, project[0].id),
        eq(project_analysis_progress.stepId, step1[0].id)
      ))
      .limit(1);

    if (workflowStep1.length === 0) {
      return res.status(404).json({
        error: 'Étape 1 non trouvée dans le workflow du projet',
        code: 'WORKFLOW_STEP_1_NOT_FOUND'
      });
    }

    // Récupérer l'étape 0 et marquer comme terminée si elle ne l'est pas déjà
    const step0 = await db
      .select()
      .from(analysis_steps)
      .where(and(
        eq(analysis_steps.order, 0),
        eq(analysis_steps.isActive, 1)
      ))
      .limit(1);

    let conversationUrl: string | undefined;
    
    if (step0.length > 0) {
      const workflowStep0 = await db
        .select()
        .from(project_analysis_progress)
        .where(and(
          eq(project_analysis_progress.projectId, project[0].id),
          eq(project_analysis_progress.stepId, step0[0].id)
        ))
        .limit(1);

      if (workflowStep0.length > 0) {
        // Récupérer l'URL de conversation de l'étape 0
        if (workflowStep0[0].manusConversationUrl) {
          conversationUrl = workflowStep0[0].manusConversationUrl;
        }

        // Marquer l'étape 0 comme terminée si elle ne l'est pas déjà
        if (workflowStep0[0].status !== 'completed') {
          await db
            .update(project_analysis_progress)
            .set({
              status: 'completed',
              content: 'Analyse des documents ZIP terminée - déclenchement de l\'étape suivante',
              completedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(project_analysis_progress.id, workflowStep0[0].id));

          console.log(`✅ Étape 0 marquée comme terminée automatiquement pour le projet: ${projectUniqueId}`);
        }
      }
    }

    // Mettre l'étape 1 en statut 'in_progress'
    await db
      .update(project_analysis_progress)
      .set({
        status: 'in_progress',
        updatedAt: new Date(),
      })
      .where(eq(project_analysis_progress.id, workflowStep1[0].id));

    // Envoyer le prompt de l'étape 1 à l'IA
    const result = await sendPromptToAI(
      step1[0].prompt,
      projectUniqueId,
      step1[0].id,
      step1[0].name,
      conversationUrl
    );

    if (result.success && result.conversationUrl) {
      // Mettre à jour l'étape 1 avec l'URL de conversation
      await db
        .update(project_analysis_progress)
        .set({
          manusConversationUrl: result.conversationUrl,
          updatedAt: new Date(),
        })
        .where(eq(project_analysis_progress.id, workflowStep1[0].id));

      console.log(`✅ Étape 1 déclenchée avec succès pour le projet: ${projectUniqueId}`);
      console.log(`🔗 URL conversation: ${result.conversationUrl}`);

      res.status(200).json({
        message: 'Étape 1 (Analyse globale) déclenchée avec succès',
        projectUniqueId,
        stepId: step1[0].id,
        stepName: step1[0].name,
        conversationUrl: result.conversationUrl,
        status: 'in_progress'
      });
    } else {
      // Marquer l'étape comme échouée avec le message d'erreur
      await db
        .update(project_analysis_progress)
        .set({
          status: 'failed',
          content: `Erreur lors de l'envoi du prompt à l'API Python: ${result.error}`,
          updatedAt: new Date(),
        })
        .where(eq(project_analysis_progress.id, workflowStep1[0].id));

      console.error(`❌ Étape 1 marquée comme échouée pour le projet: ${projectUniqueId}`);
      console.error(`📄 Erreur: ${result.error}`);

      res.status(200).json({
        message: 'Étape 1 déclenchée mais échec de l\'API Python',
        projectUniqueId,
        stepId: step1[0].id,
        stepName: step1[0].name,
        status: 'failed',
        error: result.error
      });
    }

  } catch (error) {
    console.error('❌ Erreur lors du déclenchement de l\'étape 1:', error);
    res.status(500).json({
      error: (error as Error).message,
      code: 'TRIGGER_STEP_1_ERROR'
    });
  }
};

 