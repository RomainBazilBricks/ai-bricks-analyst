import { Request, Response } from 'express';
import { db } from '@/db/index';
import { 
  projects, 
  analysisSteps, 
  projectAnalysisWorkflow,
  CreateAnalysisStepSchema,
  UpdateWorkflowStepSchema,
  InitiateWorkflowSchema,
  GetWorkflowStatusSchema,
  WorkflowStatus
} from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';
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
 * Initialise les étapes d'analyse par défaut dans la base de données
 * Cette fonction doit être appelée au démarrage de l'application
 */
export const initializeDefaultAnalysisSteps = async (): Promise<void> => {
  try {
    // Vérifier si les étapes existent déjà
    const existingSteps = await db.select().from(analysisSteps).limit(1);
    
    if (existingSteps.length === 0) {
      // Créer les 4 étapes par défaut
      const defaultSteps = [
        {
          name: 'Vue d\'ensemble du projet',
          description: 'Une description générale de quelques lignes sur le projet',
          prompt: 'Analysez les documents fournis et rédigez une vue d\'ensemble concise du projet d\'investissement immobilier en 3-5 lignes maximum. Focalisez-vous sur les éléments clés : type de bien, localisation, objectif d\'investissement et rentabilité attendue.',
          order: 1,
          isActive: 1
        },
        {
          name: 'Analyse globale',
          description: 'Une analyse détaillée et approfondie du projet',
          prompt: 'Réalisez une analyse détaillée et structurée du projet d\'investissement. Incluez : 1) Analyse financière (rentabilité, cash-flow, ROI), 2) Analyse du marché local, 3) Évaluation des risques, 4) Points forts et faiblesses, 5) Recommandations stratégiques. Soyez précis et utilisez les données des documents fournis.',
          order: 2,
          isActive: 1
        },
        {
          name: 'Récupération des documents manquants',
          description: 'Liste des documents attendus en complément pour approfondir l\'analyse',
          prompt: 'Identifiez et listez tous les documents manquants qui seraient nécessaires pour compléter l\'analyse de ce projet d\'investissement immobilier. Organisez-les par catégorie (financier, juridique, technique, marché) et précisez l\'importance de chaque document pour la prise de décision.',
          order: 3,
          isActive: 1
        },
        {
          name: 'Rédaction d\'un message',
          description: 'Un message qui récapitule le projet et liste les documents manquants',
          prompt: 'Rédigez un message de synthèse professionnel destiné au client qui : 1) Récapitule le projet en quelques phrases, 2) Présente les conclusions principales de l\'analyse, 3) Liste clairement les documents manquants requis, 4) Propose les prochaines étapes. Le ton doit être professionnel mais accessible.',
          order: 4,
          isActive: 1
        }
      ];

      await db.insert(analysisSteps).values(defaultSteps);
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
      .insert(analysisSteps)
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
      .from(analysisSteps)
      .where(eq(analysisSteps.id, stepId))
      .limit(1);

    if (existingStep.length === 0) {
      return res.status(404).json({ 
        error: 'Étape d\'analyse non trouvée',
        code: 'ANALYSIS_STEP_NOT_FOUND'
      });
    }

    // Mettre à jour l'étape
    const updatedStep = await db
      .update(analysisSteps)
      .set({
        name: stepData.name,
        description: stepData.description,
        prompt: stepData.prompt,
        order: stepData.order,
        isActive: stepData.isActive ?? 1,
      })
      .where(eq(analysisSteps.id, stepId))
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
      .from(analysisSteps)
      .where(eq(analysisSteps.isActive, 1))
      .orderBy(asc(analysisSteps.order));

    res.json(steps);
  } catch (error) {
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'GET_ANALYSIS_STEPS_ERROR'
    });
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

    // Récupérer toutes les étapes actives
    const steps = await db
      .select()
      .from(analysisSteps)
      .where(eq(analysisSteps.isActive, 1))
      .orderBy(asc(analysisSteps.order));

    // Vérifier si le workflow existe déjà
    const existingWorkflow = await db
      .select()
      .from(projectAnalysisWorkflow)
      .where(eq(projectAnalysisWorkflow.projectId, project[0].id))
      .limit(1);

    if (existingWorkflow.length > 0) {
      return res.status(409).json({ 
        error: 'Le workflow d\'analyse est déjà initié pour ce projet',
        code: 'WORKFLOW_ALREADY_EXISTS'
      });
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
      .insert(projectAnalysisWorkflow)
      .values(workflowEntries)
      .returning();

    res.status(201).json({
      message: 'Workflow d\'analyse initié avec succès',
      projectUniqueId,
      stepsCreated: createdWorkflow.length
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
        workflow: projectAnalysisWorkflow,
        step: analysisSteps
      })
      .from(projectAnalysisWorkflow)
      .leftJoin(analysisSteps, eq(projectAnalysisWorkflow.stepId, analysisSteps.id))
      .where(eq(projectAnalysisWorkflow.projectId, project[0].id))
      .orderBy(asc(analysisSteps.order));

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
      .from(projectAnalysisWorkflow)
      .where(
        and(
          eq(projectAnalysisWorkflow.projectId, project[0].id),
          eq(projectAnalysisWorkflow.stepId, stepData.stepId)
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
      .update(projectAnalysisWorkflow)
      .set(updateData)
      .where(eq(projectAnalysisWorkflow.id, workflowStep[0].id))
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
 * Endpoint pour l'étape 4: Rédaction d'un message
 * @route POST /api/workflow/step-4-message
 */
export const updateMessageStep = async (req: Request, res: Response): Promise<any> => {
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
      code: 'UPDATE_MESSAGE_STEP_ERROR'
    });
  }
}; 