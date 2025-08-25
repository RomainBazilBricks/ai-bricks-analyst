/**
 * Types TypeScript pour les notifications Slack - AI Bricks Analyst
 */

import { AlertPriority, ErrorType } from '../../back/src/config/slack.config';

export type SlackServiceResponse = {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
};

/**
 * Contexte d'un projet pour les notifications
 */
export type ProjectContext = {
  projectUniqueId: string;
  projectName: string;
  projectUrl?: string;
  userId?: string;
  userName?: string;
};

/**
 * Contexte d'une étape de workflow pour les notifications
 */
export type WorkflowStepContext = {
  stepId: number;
  stepName: string;
  stepOrder: number;
  retryCount?: number;
  maxRetries?: number;
  conversationUrl?: string;
};

/**
 * Contexte d'erreur pour les notifications
 */
export type ErrorContext = {
  errorType: ErrorType;
  priority: AlertPriority;
  errorMessage: string;
  errorCode?: string;
  stackTrace?: string;
  timestamp?: Date;
  additionalData?: Record<string, any>;
};

/**
 * Contexte complet pour une notification Slack
 */
export type SlackNotificationContext = {
  project: ProjectContext;
  workflow?: WorkflowStepContext;
  error: ErrorContext;
  environment?: 'development' | 'staging' | 'production';
};

/**
 * Types de messages Slack prédéfinis
 */
export type SlackMessageType = 
  // Erreurs de création projet
  | 'PROJECT_CREATION_SUCCESS'
  | 'PROJECT_CREATION_ERROR'
  | 'DOCUMENT_CONVERSION_ERROR'
  | 'ZIP_GENERATION_ERROR'
  
  // Erreurs de workflow
  | 'WORKFLOW_STEP_TIMEOUT'
  | 'WORKFLOW_STEP_RETRY_EXHAUSTED'
  | 'WORKFLOW_STEP_SUCCESS'
  | 'WORKFLOW_COMPLETED'
  
  // Erreurs spécifiques par étape
  | 'STEP_1_ANALYSIS_ERROR'
  | 'STEP_2_CONSOLIDATION_ERROR'
  | 'STEP_3_REPUTATION_ERROR'
  | 'STEP_4_MISSING_DOCS_ERROR'
  | 'STEP_5_VIGILANCE_ERROR'
  | 'STEP_6_MESSAGE_ERROR'
  
  // Erreurs système
  | 'DATABASE_CONNECTION_ERROR'
  | 'AI_API_CONNECTION_ERROR'
  | 'S3_STORAGE_ERROR'
  | 'SYSTEM_CRITICAL_ERROR'
  
  // Messages de test et debug
  | 'TEST_MESSAGE'
  | 'HEALTH_CHECK';

/**
 * Configuration d'un message Slack
 */
export type SlackMessageConfig = {
  channel?: string;
  username?: string;
  iconEmoji?: string;
  priority?: AlertPriority;
  mentionUsers?: string[];
  threadTs?: string;
};
