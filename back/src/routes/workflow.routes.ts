import express from 'express';
import {
  createAnalysisStep,
  getAllAnalysisSteps,
  updateAnalysisStepDefinition,
  initiateWorkflow,
  getWorkflowStatus,
  updateWorkflowStep,
  updateOverviewStep,
  updateAnalysisStep,
  updateDocumentsStep,
  updateVigilanceStep,
  updateMessageStep,
  receiveConsolidatedData,
  receiveAnalysisMacro,
  receiveMissingDocuments,
  testPromptProcessing,
  receiveStrengthsAndWeaknesses,
  receiveFinalMessage,
  uploadZipFromUrl,
  generateZipOnly,
  triggerStep1Analysis
} from '@/controllers/workflow.controller';
import { authenticateJWT } from '@/middlewares/auth.middleware';

const router = express.Router();

/**
 * Routes pour la gestion des étapes d'analyse
 */

/**
 * Crée une nouvelle étape d'analyse
 * @route POST /api/workflow/steps
 * @param {CreateAnalysisStepInput} body - Données de l'étape à créer
 * @returns {AnalysisStepResponse} Étape d'analyse créée
 * @access Private (authentification requise)
 */
router.post('/steps', authenticateJWT, createAnalysisStep);

/**
 * Récupère toutes les étapes d'analyse actives
 * @route GET /api/workflow/steps
 * @returns {AnalysisStepResponse[]} Liste des étapes d'analyse
 * @access Public (temporaire)
 */
router.get('/steps', getAllAnalysisSteps);

/**
 * Met à jour une étape d'analyse existante
 * @route PUT /api/workflow/steps/:id
 * @param {CreateAnalysisStepInput} body - Nouvelles données de l'étape
 * @returns {AnalysisStepResponse} Étape d'analyse mise à jour
 * @access Private (authentification requise)
 */
router.put('/steps/:id', authenticateJWT, updateAnalysisStepDefinition);

/**
 * Routes pour la gestion du workflow de projet
 */

/**
 * Initie le workflow d'analyse pour un projet
 * @route POST /api/workflow/initiate
 * @param {InitiateWorkflowInput} body - Données pour initier le workflow
 * @returns {Object} Message de confirmation et détails
 * @access Private (authentification requise)
 */
router.post('/initiate', authenticateJWT, initiateWorkflow);

/**
 * Récupère le statut du workflow d'analyse pour un projet
 * @route GET /api/workflow/status/:projectUniqueId
 * @param {string} projectUniqueId - ID unique du projet
 * @returns {ProjectWorkflowStatusResponse} Statut complet du workflow
 * @access Public (temporaire)
 */
router.get('/status/:projectUniqueId', getWorkflowStatus);

/**
 * Met à jour le statut d'une étape de workflow (usage générique)
 * @route POST /api/workflow/update-step
 * @param {UpdateWorkflowStepInput} body - Données de mise à jour
 * @returns {Object} Message de confirmation et détails de l'étape
 * @access Private (authentification requise)
 */
router.post('/update-step', authenticateJWT, updateWorkflowStep);

/**
 * Endpoints spécifiques pour chaque étape (appelés par Manus)
 * Ces endpoints sont publics car ils sont appelés par des outils externes
 */

/**
 * Endpoint pour l'étape 1: Analyse globale
 * @route POST /api/workflow/step-1-overview
 * @param {WorkflowStepEndpointInput} body - Contenu et URL de conversation
 * @returns {Object} Message de confirmation
 * @access Public (pour Manus)
 */
router.post('/step-1-overview', updateOverviewStep);

/**
 * Endpoint pour l'étape 2: Vue d'ensemble du projet
 * @route POST /api/workflow/step-2-analysis
 * @param {WorkflowStepEndpointInput} body - Contenu et URL de conversation
 * @returns {Object} Message de confirmation
 * @access Public (pour Manus)
 */
router.post('/step-2-analysis', updateAnalysisStep);

/**
 * Endpoint pour l'étape 3: Récupération des documents manquants
 * @route POST /api/workflow/step-3-documents
 * @param {WorkflowStepEndpointInput} body - Contenu et URL de conversation
 * @returns {Object} Message de confirmation
 * @access Public (pour Manus)
 */
router.post('/step-3-documents', updateDocumentsStep);

/**
 * Endpoint pour l'étape 4: Points de vigilance
 * @route POST /api/workflow/step-4-vigilance
 * @param {WorkflowStepEndpointInput} body - Contenu et URL de conversation
 * @returns {Object} Message de confirmation
 * @access Public (pour Manus)
 */
router.post('/step-4-vigilance', updateVigilanceStep);

/**
 * Endpoint pour l'étape 5: Rédaction d'un message
 * @route POST /api/workflow/step-5-message
 * @param {WorkflowStepEndpointInput} body - Contenu et URL de conversation
 * @returns {Object} Message de confirmation
 * @access Public (pour Manus)
 */
router.post('/step-5-message', updateMessageStep);

/**
 * Nouveaux endpoints pour les analyses IA structurées
 * Ces endpoints sont publics car ils sont appelés par l'IA externe
 */

/**
 * Endpoint pour recevoir l'analyse macro de l'IA (Étape 1)
 * @route POST /api/workflow/analysis-macro/:projectUniqueId
 * @param {AnalysisMacroPayload} body - Données de l'analyse macro
 * @returns {AnalysisMacroResponse} Confirmation et données sauvegardées
 * @access Public (pour IA)
 */
/**
 * Endpoint pour recevoir les données consolidées de l'IA (Étape 2)
 * @route POST /api/workflow/consolidated-data/:projectUniqueId
 * @param {ConsolidatedDataPayload} body - Données consolidées du projet
 * @returns {ConsolidatedDataResponse} Confirmation et données sauvegardées
 * @access Public (pour IA)
 */
router.post('/consolidated-data/:projectUniqueId', receiveConsolidatedData);

router.post('/analysis-macro/:projectUniqueId', receiveAnalysisMacro);

/**
 * Endpoint pour recevoir les documents manquants de l'IA (Étape 3)
 * @route POST /api/workflow/missing-documents/:projectUniqueId
 * @param {MissingDocumentsPayload} body - Liste des documents manquants
 * @returns {MissingDocumentsResponse} Confirmation et documents créés
 * @access Public (pour IA)
 */
router.post('/missing-documents/:projectUniqueId', receiveMissingDocuments);

/**
 * Endpoint pour recevoir les forces et faiblesses de l'IA (Étape 4)
 * @route POST /api/workflow/strengths-and-weaknesses/:projectUniqueId
 * @param {StrengthsWeaknessesPayload} body - Liste des forces et faiblesses
 * @returns {StrengthsWeaknessesResponse} Confirmation et points créés
 * @access Public (pour IA)
 */
router.post('/strengths-and-weaknesses/:projectUniqueId', receiveStrengthsAndWeaknesses);

/**
 * Endpoint pour recevoir le message final de l'IA (Étape 5)
 * @route POST /api/workflow/final-message/:projectUniqueId
 * @param {FinalMessagePayload} body - Message final et synthèse
 * @returns {FinalMessageResponse} Confirmation et workflow terminé
 * @access Public (pour IA)
 */
router.post('/final-message/:projectUniqueId', receiveFinalMessage);

/**
 * Endpoint de test pour voir comment les placeholders sont remplacés
 * @route GET /api/workflow/test-prompt/:projectUniqueId
 * @param {string} prompt - Prompt à tester (en query parameter)
 * @returns {Object} Prompt original et traité avec les remplacements
 * @access Public (pour test)
 */
router.get('/test-prompt/:projectUniqueId', testPromptProcessing);

/**
 * Endpoint pour l'étape 0: Génère un ZIP des documents et l'envoie à Manus
 * @route POST /api/workflow/generate-zip-from-documents
 * @param {object} body - Données contenant le projectUniqueId
 * @returns {Object} Détails du ZIP créé et URL de conversation Manus
 * @access Public (pour déclencher l'étape 0)
 */
router.post('/generate-zip-from-documents', uploadZipFromUrl);

/**
 * Endpoint pour générer uniquement un ZIP des documents (sans déclencher l'IA)
 * @route POST /api/workflow/generate-zip-only
 * @param {object} body - Données contenant le projectUniqueId
 * @returns {Object} Détails du ZIP créé
 * @access Public (pour régénérer le ZIP)
 */
router.post('/generate-zip-only', generateZipOnly);

/**
 * Endpoint pour déclencher manuellement l'étape 1: Analyse globale
 * @route POST /api/workflow/trigger-step-1/:projectUniqueId
 * @param {string} projectUniqueId - ID unique du projet
 * @returns {Object} Confirmation du déclenchement et URL de conversation
 * @access Public (pour Manus)
 */
router.post('/trigger-step-1/:projectUniqueId', triggerStep1Analysis);

export default router; 