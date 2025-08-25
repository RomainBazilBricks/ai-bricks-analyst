/**
 * Service de notifications Slack pour AI Bricks Analyst
 * Gestion des alertes critiques du workflow d'analyse IA
 */

import { WebClient, ChatPostMessageArguments } from '@slack/web-api';
import { 
  slackConfig, 
  validateSlackConfig, 
  DEFAULT_ANALYSIS_CHANNEL,
  SLACK_CHANNELS,
  AlertPriority,
  ErrorType 
} from '@/config/slack.config';
import type { 
  SlackServiceResponse,
  SlackNotificationContext,
  SlackMessageType,
  SlackMessageConfig,
  ProjectContext,
  WorkflowStepContext,
  ErrorContext
} from '@shared/types/slack';

/**
 * Messages prédéfinis pour les alertes d'analyse IA
 * Organisés par catégorie pour une maintenance facile
 */
const SLACK_MESSAGES = {
  // 🚀 Messages de création de projet
  PROJECT_CREATION_SUCCESS: (projectName: string, projectUrl?: string) => 
    `✅ **Nouveau projet créé** - ${projectUrl ? `<${projectUrl}|${projectName}>` : projectName}`,
  
  PROJECT_CREATION_ERROR: (projectName: string, error: string) => 
    `❌ **ERREUR - Création projet** - ${projectName}\n💥 \`${error}\``,
  
  DOCUMENT_CONVERSION_ERROR: (projectName: string, documentCount: number, errorCount: number, projectUrl?: string) => 
    `🚨 **ALERTE 1 - Échec conversion S3**\n📁 Projet: ${projectUrl ? `<${projectUrl}|${projectName}>` : projectName}\n📎 ${errorCount}/${documentCount} documents en erreur\n⚠️ Impact: Documents non disponibles pour l'analyse IA`,
  
  ZIP_GENERATION_ERROR: (projectName: string, error: string, projectUrl?: string) => 
    `🚨 **ALERTE 2 - Échec génération ZIP**\n📁 Projet: ${projectUrl ? `<${projectUrl}|${projectName}>` : projectName}\n💥 \`${error}\`\n⚠️ Impact: Pas de documents pour l'IA, workflow bloqué`,

  // 🔄 Messages de workflow général
  WORKFLOW_STEP_TIMEOUT: (projectName: string, stepName: string, retryCount: number, projectUrl?: string) => 
    `⏰ **Timeout étape workflow**\n📁 Projet: ${projectUrl ? `<${projectUrl}|${projectName}>` : projectName}\n🔧 Étape: ${stepName}\n🔄 Tentative: ${retryCount + 1}`,
  
  WORKFLOW_STEP_RETRY_EXHAUSTED: (projectName: string, stepName: string, maxRetries: number, projectUrl?: string) => 
    `🚨 **ALERTE 3 - Échec définitif workflow**\n📁 Projet: ${projectUrl ? `<${projectUrl}|${projectName}>` : projectName}\n🔧 Étape: ${stepName}\n❌ ${maxRetries} tentatives épuisées\n⚠️ Impact: Workflow complètement bloqué, intervention manuelle requise`,
  
  WORKFLOW_STEP_SUCCESS: (projectName: string, stepName: string, projectUrl?: string) => 
    `✅ **Étape terminée** - ${stepName}\n📁 Projet: ${projectUrl ? `<${projectUrl}|${projectName}>` : projectName}`,
  
  WORKFLOW_COMPLETED: (projectName: string, totalSteps: number, projectUrl?: string) => 
    `🎉 **Workflow terminé avec succès**\n📁 Projet: ${projectUrl ? `<${projectUrl}|${projectName}>` : projectName}\n✅ ${totalSteps} étapes complétées`,

  // 📊 Messages d'erreurs par étape spécifique
  STEP_1_ANALYSIS_ERROR: (projectName: string, retryCount: number, maxRetries: number, projectUrl?: string) => 
    `🚨 **ALERTE - Échec Étape 1 (Analyse globale)**\n📁 Projet: ${projectUrl ? `<${projectUrl}|${projectName}>` : projectName}\n❌ ${retryCount}/${maxRetries} tentatives\n⚠️ Impact: Pas de vue d'ensemble disponible`,
  
  STEP_2_CONSOLIDATION_ERROR: (projectName: string, retryCount: number, maxRetries: number, projectUrl?: string) => 
    `🚨 **ALERTE 4 - Échec Étape 2 (Consolidation)**\n📁 Projet: ${projectUrl ? `<${projectUrl}|${projectName}>` : projectName}\n❌ ${retryCount}/${maxRetries} tentatives\n⚠️ Impact: Pas de données structurées disponibles`,
  
  STEP_3_REPUTATION_ERROR: (projectName: string, retryCount: number, maxRetries: number, projectUrl?: string) => 
    `🚨 **ALERTE 4-BIS - Échec Étape 3 (Analyse réputation)**\n📁 Projet: ${projectUrl ? `<${projectUrl}|${projectName}>` : projectName}\n❌ ${retryCount}/${maxRetries} tentatives\n⚠️ Impact: Pas d'évaluation société/porteur disponible`,
  
  STEP_4_MISSING_DOCS_ERROR: (projectName: string, retryCount: number, maxRetries: number, projectUrl?: string) => 
    `🚨 **ALERTE 5 - Échec Étape 4 (Documents manquants)**\n📁 Projet: ${projectUrl ? `<${projectUrl}|${projectName}>` : projectName}\n❌ ${retryCount}/${maxRetries} tentatives\n⚠️ Impact: Pas de liste des documents manquants`,
  
  STEP_5_VIGILANCE_ERROR: (projectName: string, retryCount: number, maxRetries: number, projectUrl?: string) => 
    `🚨 **ALERTE 6 - Échec Étape 5 (Atouts & Vigilance)**\n📁 Projet: ${projectUrl ? `<${projectUrl}|${projectName}>` : projectName}\n❌ ${retryCount}/${maxRetries} tentatives\n⚠️ Impact: Pas de points de vigilance identifiés`,
  
  STEP_6_MESSAGE_ERROR: (projectName: string, retryCount: number, maxRetries: number, projectUrl?: string) => 
    `🚨 **ALERTE 7 - Échec Étape 6 (Message final)**\n📁 Projet: ${projectUrl ? `<${projectUrl}|${projectName}>` : projectName}\n❌ ${retryCount}/${maxRetries} tentatives\n⚠️ Impact: Pas de synthèse finale disponible`,

  // 💥 Messages d'erreurs système critiques
  DATABASE_CONNECTION_ERROR: (error: string, projectName?: string) => 
    `🚨 **ALERTE 8 - Erreur système critique (BDD)**\n${projectName ? `📁 Projet: ${projectName}\n` : ''}💥 \`${error}\`\n⚠️ Impact: Perte potentielle de données, système instable`,
  
  AI_API_CONNECTION_ERROR: (error: string, projectName?: string) => 
    `🚨 **ALERTE 9 - API IA inaccessible**\n${projectName ? `📁 Projet: ${projectName}\n` : ''}💥 \`${error}\`\n⚠️ Impact: Aucune analyse possible, workflow impossible`,
  
  S3_STORAGE_ERROR: (error: string, projectName?: string) => 
    `🚨 **ALERTE 10 - Erreur stockage S3**\n${projectName ? `📁 Projet: ${projectName}\n` : ''}💥 \`${error}\`\n⚠️ Impact: Documents inaccessibles, ZIP non générable`,
  
  SYSTEM_CRITICAL_ERROR: (error: string, context?: string) => 
    `🚨 **ERREUR SYSTÈME CRITIQUE**\n${context ? `🔧 Contexte: ${context}\n` : ''}💥 \`${error}\`\n⚠️ Intervention immédiate requise`,

  // 🧪 Messages de test et debug
  TEST_MESSAGE: (content: string) => content,
  
  HEALTH_CHECK: (status: string, timestamp: string) => 
    `🏥 **Health Check** - ${status} - ${timestamp}`,
} as const;

/**
 * Service principal pour les notifications Slack
 */
class SlackNotificationService {
  private client: WebClient | null;
  private isConfigValid: boolean;

  constructor() {
    this.isConfigValid = validateSlackConfig();
    
    if (!this.isConfigValid) {
      console.warn('⚠️ Configuration Slack invalide - le service sera désactivé');
      this.client = null;
    } else {
      this.client = new WebClient(slackConfig.botToken);
    }
  }

  /**
   * Envoie une notification d'erreur avec contexte complet
   * @param context - Contexte complet de la notification
   * @param config - Configuration optionnelle du message
   */
  async sendErrorNotification(
    context: SlackNotificationContext,
    config?: SlackMessageConfig
  ): Promise<SlackServiceResponse> {
    const messageType = this.getMessageTypeFromError(context.error.errorType, context.workflow?.stepOrder);
    const channel = this.getChannelForError(context.error.errorType, config?.channel);
    
    return this.sendNotification(messageType, context, { ...config, channel });
  }

  /**
   * Envoie une notification de succès
   * @param messageType - Type de message de succès
   * @param context - Contexte de la notification
   * @param config - Configuration optionnelle
   */
  async sendSuccessNotification(
    messageType: SlackMessageType,
    context: Partial<SlackNotificationContext>,
    config?: SlackMessageConfig
  ): Promise<SlackServiceResponse> {
    const channel = config?.channel || SLACK_CHANNELS.GENERAL_NOTIFICATIONS;
    return this.sendNotification(messageType, context, { ...config, channel });
  }

  /**
   * Envoie une notification générique
   * @param messageType - Type de message prédéfini
   * @param context - Contexte de la notification
   * @param config - Configuration du message
   */
  async sendNotification(
    messageType: SlackMessageType,
    context: Partial<SlackNotificationContext>,
    config?: SlackMessageConfig
  ): Promise<SlackServiceResponse> {
    if (!this.isConfigValid || !this.client) {
      const mockMessage = this.buildMessage(messageType, context);
      console.log('🔇 Slack non configuré - message ignoré:', mockMessage.substring(0, 100) + '...');
      return { success: false, error: 'Service non configuré' };
    }

    try {
      const text = this.buildMessage(messageType, context);
      const channel = config?.channel || DEFAULT_ANALYSIS_CHANNEL;
      
      const message: ChatPostMessageArguments = {
        channel,
        text,
        username: config?.username || 'AI Bricks Analyst Bot',
        icon_emoji: config?.iconEmoji || this.getEmojiForPriority(context.error?.priority),
        thread_ts: config?.threadTs,
      };

      // Ajouter des mentions si spécifiées
      if (config?.mentionUsers && config.mentionUsers.length > 0) {
        const mentions = config.mentionUsers.map(user => `<@${user}>`).join(' ');
        message.text = `${mentions}\n${message.text}`;
      }

      const result = await this.client.chat.postMessage(message);
      
      console.log(`📢 Message Slack envoyé dans ${channel}: ${messageType}`);
      
      return { 
        success: true, 
        message: 'Notification envoyée avec succès',
        data: result
      };
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi de la notification Slack:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      };
    }
  }

  /**
   * Envoie un message libre (pour les cas d'exception)
   */
  async sendRawMessage(channel: string, text: string, config?: SlackMessageConfig): Promise<SlackServiceResponse> {
    return this.sendNotification('TEST_MESSAGE', { project: { projectUniqueId: '', projectName: text } }, { ...config, channel });
  }

  /**
   * Teste la connexion Slack
   */
  async testConnection(): Promise<SlackServiceResponse> {
    if (!this.isConfigValid || !this.client) {
      return { success: false, error: 'Service non configuré' };
    }

    try {
      const result = await this.client.auth.test();
      
      if (result.ok) {
        console.log('✅ Connexion Slack OK - Bot:', result.user);
        return { 
          success: true, 
          message: 'Connexion Slack réussie',
          data: { 
            botId: result.user_id,
            botName: result.user,
            teamId: result.team_id,
            teamName: result.team
          }
        };
      } else {
        return { success: false, error: 'Échec de l\'authentification Slack' };
      }
    } catch (error) {
      console.error('❌ Erreur lors du test de connexion Slack:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      };
    }
  }

  /**
   * Construit le message à partir du type et du contexte
   */
  private buildMessage(messageType: SlackMessageType, context: Partial<SlackNotificationContext>): string {
    const messageBuilder = SLACK_MESSAGES[messageType] as (...args: any[]) => string;
    
    if (!messageBuilder) {
      return `Message non défini: ${messageType}`;
    }

    // Construire les paramètres selon le type de message
    switch (messageType) {
      case 'PROJECT_CREATION_SUCCESS':
        return messageBuilder(context.project?.projectName || 'Projet inconnu', context.project?.projectUrl);
      
      case 'PROJECT_CREATION_ERROR':
        return messageBuilder(context.project?.projectName || 'Projet inconnu', context.error?.errorMessage || 'Erreur inconnue');
      
      case 'DOCUMENT_CONVERSION_ERROR':
        return messageBuilder(
          context.project?.projectName || 'Projet inconnu',
          context.error?.additionalData?.totalDocuments || 0,
          context.error?.additionalData?.errorCount || 0,
          context.project?.projectUrl
        );
      
      case 'ZIP_GENERATION_ERROR':
        return messageBuilder(context.project?.projectName || 'Projet inconnu', context.error?.errorMessage || 'Erreur inconnue', context.project?.projectUrl);
      
      case 'WORKFLOW_STEP_RETRY_EXHAUSTED':
        return messageBuilder(
          context.project?.projectName || 'Projet inconnu',
          context.workflow?.stepName || 'Étape inconnue',
          context.workflow?.maxRetries || 0,
          context.project?.projectUrl
        );
      
      case 'STEP_2_CONSOLIDATION_ERROR':
      case 'STEP_3_REPUTATION_ERROR':
      case 'STEP_4_MISSING_DOCS_ERROR':
      case 'STEP_5_VIGILANCE_ERROR':
      case 'STEP_6_MESSAGE_ERROR':
        return messageBuilder(
          context.project?.projectName || 'Projet inconnu',
          context.workflow?.retryCount || 0,
          context.workflow?.maxRetries || 0,
          context.project?.projectUrl
        );
      
      case 'DATABASE_CONNECTION_ERROR':
      case 'AI_API_CONNECTION_ERROR':
      case 'S3_STORAGE_ERROR':
        return messageBuilder(context.error?.errorMessage || 'Erreur inconnue', context.project?.projectName);
      
      case 'TEST_MESSAGE':
        return messageBuilder(context.project?.projectName || 'Test message');
      
      default:
        return messageBuilder(context.project?.projectName || 'Contexte inconnu');
    }
  }

  /**
   * Détermine le type de message selon le type d'erreur et l'étape
   */
  private getMessageTypeFromError(errorType: ErrorType, stepOrder?: number): SlackMessageType {
    switch (errorType) {
      case ErrorType.DOCUMENT_UPLOAD:
        return 'DOCUMENT_CONVERSION_ERROR';
      case ErrorType.ZIP_GENERATION:
        return 'ZIP_GENERATION_ERROR';
      case ErrorType.WORKFLOW_RETRY_EXHAUSTED:
        return 'WORKFLOW_STEP_RETRY_EXHAUSTED';
      case ErrorType.STEP_FAILURE:
        switch (stepOrder) {
          case 1: return 'STEP_1_ANALYSIS_ERROR';
          case 2: return 'STEP_2_CONSOLIDATION_ERROR';
          case 3: return 'STEP_3_REPUTATION_ERROR';
          case 4: return 'STEP_4_MISSING_DOCS_ERROR';
          case 5: return 'STEP_5_VIGILANCE_ERROR';
          case 6: return 'STEP_6_MESSAGE_ERROR';
          default: return 'WORKFLOW_STEP_RETRY_EXHAUSTED';
        }
      case ErrorType.DATABASE_ERROR:
        return 'DATABASE_CONNECTION_ERROR';
      case ErrorType.AI_CONNECTION:
        return 'AI_API_CONNECTION_ERROR';
      case ErrorType.STORAGE_ERROR:
        return 'S3_STORAGE_ERROR';
      default:
        return 'SYSTEM_CRITICAL_ERROR';
    }
  }

  /**
   * Détermine le canal selon le type d'erreur
   */
  private getChannelForError(errorType: ErrorType, defaultChannel?: string): string {
    if (defaultChannel) return defaultChannel;
    
    switch (errorType) {
      case ErrorType.DATABASE_ERROR:
      case ErrorType.STORAGE_ERROR:
        return SLACK_CHANNELS.SYSTEM_ALERTS;
      default:
        return SLACK_CHANNELS.ANALYSIS_ALERTS;
    }
  }

  /**
   * Détermine l'emoji selon la priorité
   */
  private getEmojiForPriority(priority?: AlertPriority): string {
    switch (priority) {
      case AlertPriority.CRITICAL:
        return ':rotating_light:';
      case AlertPriority.HIGH:
        return ':warning:';
      case AlertPriority.MEDIUM:
        return ':exclamation:';
      case AlertPriority.LOW:
        return ':information_source:';
      default:
        return ':robot_face:';
    }
  }
}

// Export d'une instance singleton
export const slackNotificationService = new SlackNotificationService();
export default slackNotificationService;
