import { Request, Response } from 'express';
import axios from 'axios';
import { db } from '@/db/index';
import { 
  projects, 
  analysis_steps, 
  project_analysis_workflow,
  missing_documents,
  vigilance_points,
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
  VigilancePointsPayloadSchema,
  FinalMessagePayloadSchema,
  ConsolidatedDataPayloadSchema,
  consolidated_data,
  WorkflowStatus
} from '@/db/schema';
import { eq, and, asc, desc } from 'drizzle-orm';
import type { 
  CreateAnalysisStepInput,
  UpdateWorkflowStepInput,
  InitiateWorkflowInput,
  ProjectWorkflowStatusResponse,
  AnalysisStepResponse,
  ProjectAnalysisWorkflowResponse,
  WorkflowStepEndpointInput
} from '@shared/types/projects';

/**
 * Fonction utilitaire pour envoyer un prompt à l'IA externe
 */
const sendPromptToAI = async (prompt: string, projectUniqueId: string, stepId: number, stepName: string, conversationUrl?: string): Promise<{ success: boolean; error?: string; conversationUrl?: string }> => {
  try {
    // URL de l'API externe (à configurer selon l'environnement)
    const aiApiUrl = process.env.AI_INTERFACE_URL || 'https://64239c9ce527.ngrok-free.app';
    
    console.log(`🚀 Envoi automatique du prompt à l'IA pour l'étape: ${stepName}`);
    if (conversationUrl) {
      console.log(`🔗 Continuation de la conversation: ${conversationUrl}`);
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
    
    // Préparer le payload avec l'URL de conversation si disponible
    const payload: any = {
      message: processedPrompt,
      platform: 'manus',
      projectUniqueId,
      stepId,
      stepName,
    };

    // Ajouter conversation_url si disponible pour continuer la même session
    if (conversationUrl) {
      payload.conversation_url = conversationUrl;
    }
    
    const response = await axios.post(`${aiApiUrl}/send-message`, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 secondes de timeout
    });

    if (response.data.success !== false) {
      console.log(`✅ Prompt envoyé avec succès à l'IA pour l'étape: ${stepName}`);
      return {
        success: true,
        conversationUrl: response.data.conversation_url
      };
    } else {
      console.error(`❌ Erreur de l'IA pour l'étape ${stepName}:`, response.data.message);
      return {
        success: false,
        error: response.data.message || 'Erreur inconnue de l\'IA'
      };
    }
  } catch (error: any) {
    console.error(`❌ Erreur lors de l'envoi du prompt à l'IA pour l'étape ${stepName}:`, error.message);
    return {
      success: false,
      error: error.message || 'Erreur de connexion à l\'IA'
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
      .from(project_analysis_workflow)
      .where(and(
        eq(project_analysis_workflow.projectId, project[0].id),
        eq(project_analysis_workflow.stepId, nextStep[0].id)
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
      .update(project_analysis_workflow)
      .set({
        status: 'in_progress',
        updatedAt: new Date(),
      })
      .where(eq(project_analysis_workflow.id, nextWorkflowStep[0].id));

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
      
      // Sauvegarder la conversation si une URL est retournée
      // Note: Pour l'instant, nous ne sauvegardons pas automatiquement les conversations
      // car elles sont liées aux sessions et non directement aux projets
      if (aiResult.conversationUrl) {
        console.log(`💾 URL de conversation disponible: ${aiResult.conversationUrl}`);
        // TODO: Implémenter la sauvegarde dans une session appropriée
      }
    } else {
      console.error(`❌ Erreur lors du déclenchement de l'étape suivante: ${aiResult.error}`);
      
      // Remettre l'étape en statut 'pending' en cas d'erreur
      await db
        .update(project_analysis_workflow)
        .set({
          status: 'pending',
          updatedAt: new Date(),
        })
        .where(eq(project_analysis_workflow.id, nextWorkflowStep[0].id));
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
      const defaultSteps = [
        {
          name: 'Analyse globale',
          description: 'Une analyse détaillée et approfondie du projet avec vue d\'ensemble',
          prompt: '',
          order: 1,
          isActive: 1
        },
        {
          name: 'Consolidation des données',
          description: 'Récupère et structure toutes les données clés nécessaires à l\'analyse',
          prompt: '',
          order: 2,
          isActive: 1
        },
        {
          name: 'Récupération des documents manquants',
          description: 'Liste des documents attendus en complément pour approfondir l\'analyse',
          prompt: '',
          order: 3,
          isActive: 1
        },
        {
          name: 'Points de vigilance',
          description: 'Identification des risques critiques qui pourraient compromettre le financement',
          prompt: '',
          order: 4,
          isActive: 1
        },
        {
          name: 'Rédaction d\'un message',
          description: 'Un message qui récapitule le projet et liste les documents manquants',
          prompt: '',
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
      .from(project_analysis_workflow)
      .where(eq(project_analysis_workflow.projectId, project[0].id))
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
      .insert(project_analysis_workflow)
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
        workflow: project_analysis_workflow,
        step: analysis_steps
      })
      .from(project_analysis_workflow)
      .leftJoin(analysis_steps, eq(project_analysis_workflow.stepId, analysis_steps.id))
      .where(eq(project_analysis_workflow.projectId, project[0].id))
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
      .from(project_analysis_workflow)
      .where(
        and(
          eq(project_analysis_workflow.projectId, project[0].id),
          eq(project_analysis_workflow.stepId, stepData.stepId)
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
      .update(project_analysis_workflow)
      .set(updateData)
      .where(eq(project_analysis_workflow.id, workflowStep[0].id))
      .returning();

    res.json({
      message: 'Étape de workflow mise à jour avec succès',
      step: updatedStep[0]
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
        workflow: project_analysis_workflow,
        step: analysis_steps
      })
      .from(project_analysis_workflow)
      .leftJoin(analysis_steps, eq(project_analysis_workflow.stepId, analysis_steps.id))
      .where(
        and(
          eq(project_analysis_workflow.projectId, project[0].id),
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
      financialWorksCost: validatedData.consolidatedData.financial?.worksCost?.toString(),
      financialPlannedResalePrice: validatedData.consolidatedData.financial?.plannedResalePrice?.toString(),
      financialPersonalContribution: validatedData.consolidatedData.financial?.personalContribution?.toString(),
      // Données du Bien
      propertyLivingArea: validatedData.consolidatedData.property?.livingArea?.toString(),
      propertyMarketReferencePrice: validatedData.consolidatedData.property?.marketReferencePrice?.toString(),
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
      .update(project_analysis_workflow)
      .set({
        status: 'completed',
        content: JSON.stringify(validatedData.consolidatedData),
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(project_analysis_workflow.id, workflowStep[0].workflow.id))
      .returning();

    // Déclencher automatiquement l'étape suivante (ordre 3 - Documents manquants)
    const triggerResult = await triggerNextWorkflowStep(projectUniqueId, 2);
    if (!triggerResult.success) {
      console.warn(`⚠️ Échec du déclenchement automatique de l'étape suivante: ${triggerResult.error}`);
    }

    res.status(200).json({
      success: true,
      message: 'Données consolidées reçues et enregistrées avec succès',
      workflowStepId: updatedStep[0].id,
      data: validatedData.consolidatedData,
      nextStepTriggered: triggerResult.success
    });
  } catch (error) {
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'RECEIVE_CONSOLIDATED_DATA_ERROR'
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

    const updateData: UpdateWorkflowStepInput = {
      projectUniqueId,
      stepId: 1,
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

    const updateData: UpdateWorkflowStepInput = {
      projectUniqueId,
      stepId: 2,
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
 * Endpoint pour l'étape 3: Récupération des documents manquants
 * @route POST /api/workflow/step-3-documents
 */
export const updateDocumentsStep = async (req: Request, res: Response): Promise<any> => {
  try {
    const { projectUniqueId, content, manusConversationUrl }: WorkflowStepEndpointInput = req.body;

    const updateData: UpdateWorkflowStepInput = {
      projectUniqueId,
      stepId: 3,
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
 * Endpoint pour l'étape 4: Points de vigilance
 * @route POST /api/workflow/step-4-vigilance
 */
export const updateVigilanceStep = async (req: Request, res: Response): Promise<any> => {
  try {
    const { projectUniqueId, content, manusConversationUrl }: WorkflowStepEndpointInput = req.body;

    const updateData: UpdateWorkflowStepInput = {
      projectUniqueId,
      stepId: 4,
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
 * Endpoint pour l'étape 5: Rédaction d'un message
 * @route POST /api/workflow/step-5-message
 */
export const updateMessageStep = async (req: Request, res: Response): Promise<any> => {
  try {
    const { projectUniqueId, content, manusConversationUrl }: WorkflowStepEndpointInput = req.body;

    const updateData: UpdateWorkflowStepInput = {
      projectUniqueId,
      stepId: 5,
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
        workflow: project_analysis_workflow,
        step: analysis_steps
      })
      .from(project_analysis_workflow)
      .leftJoin(analysis_steps, eq(project_analysis_workflow.stepId, analysis_steps.id))
      .where(
        and(
          eq(project_analysis_workflow.projectId, project[0].id),
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
      .update(project_analysis_workflow)
      .set({
        status: 'completed',
        content: JSON.stringify(validatedData.macroAnalysis),
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(project_analysis_workflow.id, workflowStep[0].workflow.id))
      .returning();

    // Déclencher automatiquement l'étape suivante (ordre 2 - Consolidation des données)
    const triggerResult = await triggerNextWorkflowStep(projectUniqueId, 1);
    if (!triggerResult.success) {
      console.warn(`⚠️ Échec du déclenchement automatique de l'étape suivante: ${triggerResult.error}`);
    }

    res.status(200).json({
      success: true,
      message: 'Analyse macro reçue et enregistrée avec succès',
      workflowStepId: updatedStep[0].id,
      data: validatedData.macroAnalysis
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

    // Créer les documents manquants
    const documentsToCreate = validatedData.missingDocuments.map(doc => ({
      projectId: project[0].id,
      name: doc.name,
      whyMissing: doc.whyMissing,
      impactOnProject: doc.impactOnProject,
      status: 'pending' as const,
      whyStatus: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const createdDocuments = await db
      .insert(missing_documents)
      .values(documentsToCreate)
      .returning();

    // Mettre à jour l'étape du workflow
    const workflowStep = await db
      .select()
      .from(project_analysis_workflow)
      .where(
        and(
          eq(project_analysis_workflow.projectId, project[0].id),
          eq(project_analysis_workflow.stepId, 3) // Étape 3 = documents manquants
        )
      )
      .limit(1);

    if (workflowStep.length > 0) {
      await db
        .update(project_analysis_workflow)
        .set({
          status: 'completed',
          content: JSON.stringify(validatedData.missingDocuments),
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(project_analysis_workflow.id, workflowStep[0].id));
    }

    // Déclencher automatiquement l'étape suivante (ordre 4 - Points de vigilance)
    const triggerResult = await triggerNextWorkflowStep(projectUniqueId, 3);
    if (!triggerResult.success) {
      console.warn(`⚠️ Échec du déclenchement automatique de l'étape suivante: ${triggerResult.error}`);
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
      nextStepTriggered: triggerResult.success
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
 * Endpoint pour recevoir les points de vigilance de l'IA (Étape 4)
 * @route POST /api/workflow/vigilance-points/:projectUniqueId
 */
export const receiveVigilancePoints = async (req: Request, res: Response): Promise<any> => {
  try {
    const { projectUniqueId } = req.params;
    const validatedData = VigilancePointsPayloadSchema.parse({ 
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

    // Créer les points de vigilance
    const pointsToCreate = validatedData.vigilancePoints.map(point => ({
      projectId: project[0].id,
      title: point.title,
      whyVigilance: point.whyVigilance,
      riskLevel: point.riskLevel,
      potentialImpact: point.potentialImpact,
      recommendations: point.recommendations,
      status: 'pending' as const,
      whyStatus: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const createdPoints = await db
      .insert(vigilance_points)
      .values(pointsToCreate)
      .returning();

    // Mettre à jour l'étape du workflow
    const workflowStep = await db
      .select()
      .from(project_analysis_workflow)
      .where(
        and(
          eq(project_analysis_workflow.projectId, project[0].id),
          eq(project_analysis_workflow.stepId, 4) // Étape 4 = points de vigilance
        )
      )
      .limit(1);

    if (workflowStep.length > 0) {
      await db
        .update(project_analysis_workflow)
        .set({
          status: 'completed',
          content: JSON.stringify(validatedData.vigilancePoints),
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(project_analysis_workflow.id, workflowStep[0].id));
    }

    // Déclencher automatiquement l'étape suivante (ordre 5 - Message final)
    const triggerResult = await triggerNextWorkflowStep(projectUniqueId, 4);
    if (!triggerResult.success) {
      console.warn(`⚠️ Échec du déclenchement automatique de l'étape suivante: ${triggerResult.error}`);
    }

    res.status(200).json({
      success: true,
      message: 'Points de vigilance reçus et enregistrés avec succès',
      workflowStepId: workflowStep.length > 0 ? workflowStep[0].id : null,
      pointsCreated: createdPoints.length,
      data: createdPoints.map(point => ({
        id: point.id,
        title: point.title,
        riskLevel: point.riskLevel,
        status: point.status
      })),
      nextStepTriggered: triggerResult.success
    });
  } catch (error) {
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'RECEIVE_VIGILANCE_POINTS_ERROR'
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

    // Créer une entrée dans la table conversations
    await db
      .insert(conversations)
      .values({
        sessionId: recentSession[0].id,
        sessionDate: new Date(),
        sender: 'IA',
        message: validatedData.message,
        attachments: [],
      });

    // Mettre à jour l'étape du workflow (étape 5)
    const workflowStep = await db
      .select()
      .from(project_analysis_workflow)
      .where(
        and(
          eq(project_analysis_workflow.projectId, project[0].id),
          eq(project_analysis_workflow.stepId, 5) // Étape 5 = message final
        )
      )
      .limit(1);

    if (workflowStep.length > 0) {
      await db
        .update(project_analysis_workflow)
        .set({
          status: 'completed',
          content: 'Message final créé dans conversations',
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(project_analysis_workflow.id, workflowStep[0].id));
    }

    // Pour l'étape 5 (dernière étape), pas de déclenchement automatique
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