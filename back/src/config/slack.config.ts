/**
 * Configuration Slack pour AI Bricks Analyst
 * Gestion des notifications d'erreurs critiques du workflow d'analyse IA
 */

export type SlackConfig = {
  botToken: string;
  signingSecret: string;
  appToken?: string;
};

export type SlackServiceResponse = {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
};

export const slackConfig: SlackConfig = {
  botToken: process.env.SLACK_BOT_TOKEN || '',
  signingSecret: process.env.SLACK_SIGNING_SECRET || '',
  appToken: process.env.SLACK_APP_TOKEN || undefined,
};

/**
 * Valide la configuration Slack
 * @returns true si la configuration est valide
 */
export const validateSlackConfig = (): boolean => {
  const { botToken, signingSecret } = slackConfig;
  
  if (!botToken || !signingSecret) {
    console.warn(
      '⚠️ Configuration Slack incomplète. Variables requises:',
      '\n  - SLACK_BOT_TOKEN (requis)',
      '\n  - SLACK_SIGNING_SECRET (requis)',
      '\n  - SLACK_APP_TOKEN (optionnel)'
    );
    return false;
  }

  if (!botToken.startsWith('xoxb-')) {
    console.warn('⚠️ SLACK_BOT_TOKEN doit commencer par "xoxb-"');
    return false;
  }

  return true;
};

/**
 * Canaux Slack pour les différents types d'alertes
 */
export const SLACK_CHANNELS = {
  // Canal principal pour les alertes d'analyse IA
  ANALYSIS_ALERTS: process.env.SLACK_CHANNEL_ANALYSIS_ALERTS || '#alertes-analyse-ia',
  
  // Canal pour les erreurs système critiques
  SYSTEM_ALERTS: process.env.SLACK_CHANNEL_SYSTEM_ALERTS || '#alertes-systeme',
  
  // Canal pour les notifications générales
  GENERAL_NOTIFICATIONS: process.env.SLACK_CHANNEL_GENERAL || '#bot-notifications',
  
  // Canal de test
  TEST: process.env.SLACK_CHANNEL_TEST || '#test-bot'
} as const;

/**
 * Canal par défaut pour les notifications d'analyse IA
 */
export const DEFAULT_ANALYSIS_CHANNEL = SLACK_CHANNELS.ANALYSIS_ALERTS;

/**
 * Niveaux de priorité des alertes
 */
export enum AlertPriority {
  LOW = 'low',
  MEDIUM = 'medium', 
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Types d'erreurs pour catégoriser les alertes
 */
export enum ErrorType {
  // Erreurs de création et upload
  PROJECT_CREATION = 'project_creation',
  DOCUMENT_UPLOAD = 'document_upload',
  ZIP_GENERATION = 'zip_generation',
  
  // Erreurs de workflow
  WORKFLOW_TIMEOUT = 'workflow_timeout',
  WORKFLOW_RETRY_EXHAUSTED = 'workflow_retry_exhausted',
  STEP_FAILURE = 'step_failure',
  
  // Erreurs système
  DATABASE_ERROR = 'database_error',
  API_ERROR = 'api_error',
  STORAGE_ERROR = 'storage_error',
  
  // Erreurs IA
  AI_TIMEOUT = 'ai_timeout',
  AI_CONNECTION = 'ai_connection',
  AI_RESPONSE_ERROR = 'ai_response_error'
}
