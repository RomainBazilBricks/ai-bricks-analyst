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
  CreateAnalysisStepSchema,
  UpdateWorkflowStepSchema,
  InitiateWorkflowSchema,
  GetWorkflowStatusSchema,
  AnalysisMacroPayloadSchema,
  AnalysisDescriptionPayloadSchema,
  MissingDocumentsPayloadSchema,
  VigilancePointsPayloadSchema,
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
          description: 'Une analyse détaillée et approfondie du projet',
          prompt: 'ÉTAPE 1 - RÉCUPÉRATION DES DOCUMENTS :\nCommencez par récupérer la liste des documents associés au projet en effectuant un appel GET sur l\'endpoint :\n/api/projects/{projectUniqueId}/document-urls\n\nCet appel vous retournera :\n{\n  "projectUniqueId": "{projectUniqueId}",\n  "documentUrls": ["url1", "url2", "url3", ...]\n}\n\nÉTAPE 2 - ANALYSE DES DOCUMENTS :\nAnalysez chaque document accessible via les URLs récupérées et réalisez une analyse détaillée et structurée du projet d\'investissement. Incluez :\n1) Analyse financière (rentabilité, cash-flow, ROI)\n2) Analyse du marché local\n3) Évaluation des risques\n4) Points forts et faiblesses\n5) Recommandations stratégiques\n\nSoyez précis et utilisez les données des documents fournis.\n\nÉTAPE 3 - RETOUR DE L\'ANALYSE :\nRetournez votre analyse sous forme JSON structuré via POST sur l\'endpoint /api/workflow/analysis-macro/{projectUniqueId} avec le format suivant :\n\n{\n  "projectUniqueId": "{projectUniqueId}",\n  "macroAnalysis": {\n    "overallRisk": "low|medium|high",\n    "marketPotential": "low|medium|high",\n    "technicalFeasibility": "low|medium|high",\n    "financialViability": "low|medium|high",\n    "competitiveAdvantage": "low|medium|high",\n    "summary": "Résumé de votre analyse globale",\n    "keyStrengths": ["Point fort 1", "Point fort 2", ...],\n    "keyWeaknesses": ["Point faible 1", "Point faible 2", ...],\n    "recommendedActions": ["Action recommandée 1", "Action recommandée 2", ...]\n  }\n}',
          order: 1,
          isActive: 1
        },
        {
          name: 'Vue d\'ensemble du projet',
          description: 'Une description générale de quelques lignes sur le projet',
          prompt: 'Analysez les documents fournis et rédigez une vue d\'ensemble concise du projet d\'investissement immobilier en 3-5 lignes maximum. Focalisez-vous sur les éléments clés : type de bien, localisation, objectif d\'investissement et rentabilité attendue.\n\nIMPORTANT: Développez maintenant cette analyse en sections détaillées via POST sur l\'endpoint /api/workflow/analysis-description/{projectUniqueId} avec le format suivant :\n\n{\n  "projectUniqueId": "{projectUniqueId}",\n  "detailedAnalysis": {\n    "businessModel": {\n      "description": "Description détaillée du modèle économique",\n      "revenueStreams": ["Source de revenus 1", "Source de revenus 2"],\n      "keyPartners": ["Partenaire clé 1", "Partenaire clé 2"],\n      "valueProposition": "Proposition de valeur principale"\n    },\n    "marketAnalysis": {\n      "targetMarket": "Description du marché cible",\n      "marketSize": "Taille et caractéristiques du marché",\n      "competitorAnalysis": "Analyse concurrentielle",\n      "marketTrends": ["Tendance 1", "Tendance 2"]\n    },\n    "technicalAnalysis": {\n      "technologyStack": ["Technologie 1", "Technologie 2"],\n      "technicalRisks": ["Risque technique 1", "Risque technique 2"],\n      "developmentTimeline": "Planning de développement",\n      "scalabilityAssessment": "Évaluation de la scalabilité"\n    },\n    "financialProjections": {\n      "revenueProjection": "Projections de revenus détaillées",\n      "costStructure": "Structure des coûts",\n      "breakEvenAnalysis": "Analyse de seuil de rentabilité",\n      "fundingRequirements": "Besoins de financement"\n    },\n    "teamAssessment": {\n      "keyPersonnel": ["Personnel clé 1", "Personnel clé 2"],\n      "skillsGaps": ["Lacune 1", "Lacune 2"],\n      "organizationalStructure": "Structure organisationnelle"\n    }\n  }\n}',
          order: 2,
          isActive: 1
        },
        {
          name: 'Récupération des documents manquants',
          description: 'Liste des documents attendus en complément pour approfondir l\'analyse',
          prompt: 'Identifiez et listez tous les documents manquants qui seraient nécessaires pour compléter l\'analyse de ce projet d\'investissement immobilier. Organisez-les par catégorie (financier, juridique, technique, marché) et précisez l\'importance de chaque document pour la prise de décision.\n\nIMPORTANT: Structurez votre liste via POST sur l\'endpoint /api/workflow/missing-documents/{projectUniqueId} avec le format suivant :\n\n{\n  "projectUniqueId": "{projectUniqueId}",\n  "missingDocuments": [\n    {\n      "name": "Nom précis du document",\n      "whyMissing": "Explication de pourquoi ce document est nécessaire",\n      "priority": "high|medium|low",\n      "category": "legal|financial|technical|business|regulatory",\n      "impactOnProject": "Impact de l\'absence de ce document sur le projet",\n      "suggestedSources": ["Source suggérée 1", "Source suggérée 2"]\n    }\n  ]\n}',
          order: 3,
          isActive: 1
        },
        {
          name: 'Points de vigilance',
          description: 'Identification des risques critiques qui pourraient compromettre le financement',
          prompt: 'Analysez le projet d\'investissement immobilier et identifiez tous les points de vigilance critiques qui pourraient compromettre l\'obtention du financement. Organisez votre analyse en catégories : 1) Risques financiers (ratio d\'endettement, capacité de remboursement, apport personnel), 2) Risques juridiques (servitudes, litiges, conformité), 3) Risques techniques (état du bien, travaux nécessaires, diagnostics), 4) Risques de marché (localisation, évolution des prix, demande locative). Pour chaque point, évaluez le niveau de criticité et proposez des solutions ou documents complémentaires.\n\nIMPORTANT: Structurez vos points de vigilance via POST sur l\'endpoint /api/workflow/vigilance-points/{projectUniqueId} avec le format suivant :\n\n{\n  "projectUniqueId": "{projectUniqueId}",\n  "vigilancePoints": [\n    {\n      "title": "Titre concis du point de vigilance",\n      "whyVigilance": "Explication détaillée de la raison de vigilance",\n      "riskLevel": "high|medium|low",\n      "category": "financial|technical|legal|market|operational|regulatory",\n      "potentialImpact": "Impact potentiel sur le projet",\n      "mitigationStrategies": ["Stratégie d\'atténuation 1", "Stratégie d\'atténuation 2"],\n      "monitoringRecommendations": ["Recommandation de suivi 1", "Recommandation de suivi 2"]\n    }\n  ]\n}',
          order: 4,
          isActive: 1
        },
        {
          name: 'Rédaction d\'un message',
          description: 'Un message qui récapitule le projet et liste les documents manquants',
          prompt: 'Rédigez un message de synthèse professionnel destiné au client qui : 1) Récapitule le projet en quelques phrases, 2) Présente les conclusions principales de l\'analyse, 3) Liste clairement les documents manquants requis, 4) Propose les prochaines étapes. Le ton doit être professionnel mais accessible.',
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

    // Déclencher automatiquement l'étape suivante (ordre 2)
    try {
      const nextStep = await db
        .select({
          workflow: project_analysis_workflow,
          step: analysis_steps
        })
        .from(project_analysis_workflow)
        .leftJoin(analysis_steps, eq(project_analysis_workflow.stepId, analysis_steps.id))
        .where(
          and(
            eq(project_analysis_workflow.projectId, project[0].id),
            eq(analysis_steps.order, 2) // Étape suivante avec order = 2
          )
        )
        .limit(1);

      if (nextStep.length > 0 && nextStep[0].step) {
        // Marquer l'étape suivante comme en cours
        await db
          .update(project_analysis_workflow)
          .set({
            status: 'in_progress',
            startedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(project_analysis_workflow.id, nextStep[0].workflow.id));
        
        console.log(`✅ Étape suivante (${nextStep[0].step.name}) marquée comme en cours`);

        // Récupérer l'URL de conversation de l'étape précédente (étape 1 qui vient d'être complétée)
        let previousStepConversationUrl = workflowStep[0].workflow.manusConversationUrl;
        
        // Si pas d'URL dans le workflow, chercher dans la table conversations_with_ai
        if (!previousStepConversationUrl) {
          try {
            const latestConversation = await db
              .select({
                url: conversations_with_ai.url
              })
              .from(conversations_with_ai)
              .innerJoin(sessions, eq(conversations_with_ai.sessionId, sessions.id))
              .where(eq(sessions.projectId, project[0].id))
              .orderBy(desc(conversations_with_ai.createdAt))
              .limit(1);
              
            if (latestConversation.length > 0) {
              previousStepConversationUrl = latestConversation[0].url;
              console.log(`🔍 URL de conversation récupérée depuis conversations_with_ai: ${previousStepConversationUrl}`);
            }
          } catch (error) {
            console.warn('⚠️ Impossible de récupérer l\'URL de conversation depuis conversations_with_ai:', error);
          }
        }

        // Envoyer le prompt de l'étape suivante à l'IA avec l'URL de conversation
        const aiResult = await sendPromptToAI(
          nextStep[0].step.prompt,
          projectUniqueId,
          nextStep[0].workflow.stepId,
          nextStep[0].step.name,
          previousStepConversationUrl || undefined
        );

        if (aiResult.success) {
          console.log(`🎉 Prompt de l'étape "${nextStep[0].step.name}" envoyé avec succès à l'IA`);
          
          // Sauver l'URL de conversation (mise à jour ou nouvelle)
          if (aiResult.conversationUrl) {
            await db
              .update(project_analysis_workflow)
              .set({
                manusConversationUrl: aiResult.conversationUrl,
                updatedAt: new Date(),
              })
              .where(eq(project_analysis_workflow.id, nextStep[0].workflow.id));
          }
        } else {
          console.error(`❌ Échec de l'envoi du prompt pour l'étape "${nextStep[0].step.name}":`, aiResult.error);
          
          // Marquer l'étape comme échouée
          await db
            .update(project_analysis_workflow)
            .set({
              status: 'failed',
              updatedAt: new Date(),
            })
            .where(eq(project_analysis_workflow.id, nextStep[0].workflow.id));
        }
      }
    } catch (error) {
      console.warn('⚠️ Impossible de déclencher l\'étape suivante:', error);
      // Ne pas faire échouer la réponse principale
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
 * Endpoint pour recevoir l'analyse détaillée de l'IA (Étape 2)
 * @route POST /api/workflow/analysis-description/:projectUniqueId
 */
export const receiveAnalysisDescription = async (req: Request, res: Response): Promise<any> => {
  try {
    const { projectUniqueId } = req.params;
    const validatedData = AnalysisDescriptionPayloadSchema.parse({ 
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

    const workflowStep = await db
      .select()
      .from(project_analysis_workflow)
      .where(
        and(
          eq(project_analysis_workflow.projectId, project[0].id),
          eq(project_analysis_workflow.stepId, 2) // Étape 2 = description détaillée
        )
      )
      .limit(1);

    if (workflowStep.length === 0) {
      return res.status(404).json({ 
        error: 'Étape de workflow non trouvée',
        code: 'WORKFLOW_STEP_NOT_FOUND'
      });
    }

    const updatedStep = await db
      .update(project_analysis_workflow)
      .set({
        status: 'completed',
        content: JSON.stringify(validatedData.detailedAnalysis),
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(project_analysis_workflow.id, workflowStep[0].id))
      .returning();

    res.status(200).json({
      success: true,
      message: 'Analyse détaillée reçue et enregistrée avec succès',
      workflowStepId: updatedStep[0].id,
      data: validatedData.detailedAnalysis
    });
  } catch (error) {
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'RECEIVE_ANALYSIS_DESCRIPTION_ERROR'
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

    res.status(200).json({
      success: true,
      message: 'Documents manquants reçus et enregistrés avec succès',
      workflowStepId: workflowStep.length > 0 ? workflowStep[0].id : null,
      documentsCreated: createdDocuments.length,
      data: createdDocuments.map(doc => ({
        id: doc.id,
        name: doc.name,
        status: doc.status
      }))
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
      }))
    });
  } catch (error) {
    res.status(500).json({ 
      error: (error as Error).message,
      code: 'RECEIVE_VIGILANCE_POINTS_ERROR'
    });
  }
}; 