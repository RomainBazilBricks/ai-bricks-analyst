/**
 * Controller de test pour les notifications Slack
 * Permet de tester les différents types d'alertes
 */

import { Request, Response } from 'express';
import { slackNotificationService } from '@/services/slack-notification.service';
import { sendSlackErrorNotification, sendSlackSuccessNotification, sendSlackSystemErrorNotification } from '@/lib/slack-helpers';
import { ErrorType, AlertPriority } from '@/config/slack.config';

/**
 * Teste la connexion Slack
 * @route GET /api/slack/test-connection
 */
export const testSlackConnection = async (req: Request, res: Response): Promise<any> => {
  try {
    const result = await slackNotificationService.testConnection();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Connexion Slack réussie',
        data: result.data
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
};

/**
 * Envoie un message de test
 * @route POST /api/slack/test-message
 */
export const sendTestMessage = async (req: Request, res: Response): Promise<any> => {
  try {
    const { message, channel } = req.body;
    
    if (!message) {
      return res.status(400).json({
        error: 'Message requis'
      });
    }

    const result = await slackNotificationService.sendRawMessage(
      channel || '#test-bot',
      `🧪 Test message: ${message}`
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: (error as Error).message
    });
  }
};

/**
 * Teste toutes les alertes critiques
 * @route POST /api/slack/test-alerts
 */
export const testAllAlerts = async (req: Request, res: Response): Promise<any> => {
  try {
    const testProjectId = 'TEST_PROJECT_' + Date.now();
    const testProjectName = 'Projet de Test Slack';
    
    console.log('🧪 Début des tests d\'alertes Slack...');
    
    // Test 1: Erreur de conversion S3
    await sendSlackErrorNotification(
      testProjectId,
      testProjectName,
      ErrorType.DOCUMENT_UPLOAD,
      'Erreur de test: conversion S3 échouée',
      {
        priority: AlertPriority.HIGH,
        additionalData: {
          documentIndex: 1,
          totalDocuments: 3,
          bubbleUrl: 'https://test.bubble.io/document.pdf'
        }
      }
    );
    
    // Test 2: Erreur de génération ZIP
    await sendSlackErrorNotification(
      testProjectId,
      testProjectName,
      ErrorType.ZIP_GENERATION,
      'Erreur de test: génération ZIP impossible',
      {
        priority: AlertPriority.CRITICAL
      }
    );
    
    // Test 3: Échec définitif après retries
    await sendSlackErrorNotification(
      testProjectId,
      testProjectName,
      ErrorType.WORKFLOW_RETRY_EXHAUSTED,
      'Erreur de test: échec définitif après 3 tentatives',
      {
        priority: AlertPriority.CRITICAL,
        stepName: 'Analyse globale',
        stepOrder: 1,
        retryCount: 3,
        maxRetries: 3
      }
    );
    
    // Test 4: Erreur étape spécifique (Consolidation)
    await sendSlackErrorNotification(
      testProjectId,
      testProjectName,
      ErrorType.STEP_FAILURE,
      'Erreur de test: échec étape consolidation',
      {
        priority: AlertPriority.CRITICAL,
        stepName: 'Consolidation des données',
        stepOrder: 2,
        retryCount: 2,
        maxRetries: 3
      }
    );
    
    // Test 5: Erreur étape réputation
    await sendSlackErrorNotification(
      testProjectId,
      testProjectName,
      ErrorType.STEP_FAILURE,
      'Erreur de test: échec analyse réputation',
      {
        priority: AlertPriority.CRITICAL,
        stepName: 'Analyse de réputation',
        stepOrder: 3,
        retryCount: 3,
        maxRetries: 3
      }
    );
    
    // Test 6: Erreur API IA
    await sendSlackErrorNotification(
      testProjectId,
      testProjectName,
      ErrorType.AI_CONNECTION,
      'Erreur de test: API IA inaccessible',
      {
        priority: AlertPriority.CRITICAL,
        errorCode: 'ECONNREFUSED'
      }
    );
    
    // Test 7: Erreur système
    await sendSlackSystemErrorNotification(
      'Erreur de test: base de données inaccessible',
      'Test des notifications système',
      { projectUniqueId: testProjectId, projectName: testProjectName }
    );
    
    // Test 8: Message de succès
    await sendSlackSuccessNotification(
      testProjectId,
      testProjectName,
      'Test de notification de succès terminé',
      'Test complet'
    );
    
    console.log('✅ Tests d\'alertes Slack terminés');
    
    res.json({
      success: true,
      message: 'Tous les tests d\'alertes ont été envoyés',
      testProjectId,
      alertsSent: 8
    });
    
  } catch (error) {
    console.error('❌ Erreur lors des tests d\'alertes:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
};

/**
 * Teste une alerte spécifique
 * @route POST /api/slack/test-alert/:alertType
 */
export const testSpecificAlert = async (req: Request, res: Response): Promise<any> => {
  try {
    const { alertType } = req.params;
    const { projectId, projectName, message } = req.body;
    
    const testProjectId = projectId || 'TEST_SPECIFIC_' + Date.now();
    const testProjectName = projectName || 'Test Alerte Spécifique';
    const testMessage = message || `Test d'alerte: ${alertType}`;
    
    let errorType: ErrorType;
    let priority: AlertPriority = AlertPriority.HIGH;
    
    switch (alertType) {
      case 'document-upload':
        errorType = ErrorType.DOCUMENT_UPLOAD;
        break;
      case 'zip-generation':
        errorType = ErrorType.ZIP_GENERATION;
        priority = AlertPriority.CRITICAL;
        break;
      case 'workflow-retry':
        errorType = ErrorType.WORKFLOW_RETRY_EXHAUSTED;
        priority = AlertPriority.CRITICAL;
        break;
      case 'step-failure':
        errorType = ErrorType.STEP_FAILURE;
        priority = AlertPriority.CRITICAL;
        break;
      case 'ai-connection':
        errorType = ErrorType.AI_CONNECTION;
        priority = AlertPriority.CRITICAL;
        break;
      case 'database':
        errorType = ErrorType.DATABASE_ERROR;
        priority = AlertPriority.CRITICAL;
        break;
      case 'storage':
        errorType = ErrorType.STORAGE_ERROR;
        priority = AlertPriority.CRITICAL;
        break;
      default:
        return res.status(400).json({
          error: 'Type d\'alerte non supporté',
          supportedTypes: [
            'document-upload', 'zip-generation', 'workflow-retry', 
            'step-failure', 'ai-connection', 'database', 'storage'
          ]
        });
    }
    
    await sendSlackErrorNotification(
      testProjectId,
      testProjectName,
      errorType,
      testMessage,
      { priority }
    );
    
    res.json({
      success: true,
      message: `Alerte ${alertType} envoyée avec succès`,
      testProjectId,
      alertType,
      priority
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
};
