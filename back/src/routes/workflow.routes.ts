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
  updateMessageStep
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
 * @access Private (authentification requise)
 */
router.get('/steps', authenticateJWT, getAllAnalysisSteps);

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
 * @access Private (authentification requise)
 */
router.get('/status/:projectUniqueId', authenticateJWT, getWorkflowStatus);

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
 * Endpoint pour l'étape 1: Vue d'ensemble du projet
 * @route POST /api/workflow/step-1-overview
 * @param {WorkflowStepEndpointInput} body - Contenu et URL de conversation
 * @returns {Object} Message de confirmation
 * @access Public (pour Manus)
 */
router.post('/step-1-overview', updateOverviewStep);

/**
 * Endpoint pour l'étape 2: Analyse globale
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
 * Endpoint pour l'étape 4: Rédaction d'un message
 * @route POST /api/workflow/step-4-message
 * @param {WorkflowStepEndpointInput} body - Contenu et URL de conversation
 * @returns {Object} Message de confirmation
 * @access Public (pour Manus)
 */
router.post('/step-4-message', updateMessageStep);

export default router; 