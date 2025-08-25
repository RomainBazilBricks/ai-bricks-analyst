/**
 * Helpers utilitaires pour les notifications Slack
 * Simplifie l'envoi de notifications dans les controllers
 */

import { slackNotificationService } from '@/services/slack-notification.service';
import { ErrorType, AlertPriority } from '@/config/slack.config';
import type { SlackNotificationContext } from '@shared/types/slack';

/**
 * Envoie une notification d'erreur de manière simplifiée
 * @param projectUniqueId - ID unique du projet
 * @param projectName - Nom du projet
 * @param errorType - Type d'erreur
 * @param errorMessage - Message d'erreur
 * @param options - Options supplémentaires
 */
export const sendSlackErrorNotification = async (
  projectUniqueId: string,
  projectName: string,
  errorType: ErrorType,
  errorMessage: string,
  options?: {
    priority?: AlertPriority;
    stepName?: string;
    stepOrder?: number;
    retryCount?: number;
    maxRetries?: number;
    additionalData?: Record<string, any>;
    errorCode?: string;
  }
): Promise<void> => {
  try {
    const context: SlackNotificationContext = {
      project: {
        projectUniqueId,
        projectName,
        projectUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/projects/${projectUniqueId}`
      },
      error: {
        errorType,
        priority: options?.priority || AlertPriority.HIGH,
        errorMessage,
        errorCode: options?.errorCode,
        additionalData: options?.additionalData
      }
    };

    // Ajouter le contexte workflow si fourni
    if (options?.stepName || options?.stepOrder) {
      context.workflow = {
        stepId: options.stepOrder || 0,
        stepName: options.stepName || 'Étape inconnue',
        stepOrder: options.stepOrder || 0,
        retryCount: options.retryCount,
        maxRetries: options.maxRetries
      };
    }

    await slackNotificationService.sendErrorNotification(context);
  } catch (slackError) {
    console.warn('⚠️ Erreur envoi notification Slack:', slackError);
  }
};

/**
 * Envoie une notification de succès de manière simplifiée
 * @param projectUniqueId - ID unique du projet
 * @param projectName - Nom du projet
 * @param message - Message de succès
 * @param stepName - Nom de l'étape (optionnel)
 */
export const sendSlackSuccessNotification = async (
  projectUniqueId: string,
  projectName: string,
  message: string,
  stepName?: string
): Promise<void> => {
  try {
    const context = {
      project: {
        projectUniqueId,
        projectName,
        projectUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/projects/${projectUniqueId}`
      }
    };

    if (stepName) {
      await slackNotificationService.sendSuccessNotification(
        'WORKFLOW_STEP_SUCCESS',
        context
      );
    } else {
      await slackNotificationService.sendRawMessage(
        process.env.SLACK_CHANNEL_GENERAL || '#bot-notifications',
        `✅ ${message} - ${projectName}`
      );
    }
  } catch (slackError) {
    console.warn('⚠️ Erreur envoi notification Slack:', slackError);
  }
};

/**
 * Envoie une notification d'erreur système critique
 * @param errorMessage - Message d'erreur
 * @param context - Contexte additionnel
 * @param projectInfo - Informations du projet (optionnel)
 */
export const sendSlackSystemErrorNotification = async (
  errorMessage: string,
  context?: string,
  projectInfo?: { projectUniqueId: string; projectName: string }
): Promise<void> => {
  try {
    const notificationContext: SlackNotificationContext = {
      project: projectInfo || {
        projectUniqueId: 'SYSTEM',
        projectName: 'Erreur système'
      },
      error: {
        errorType: ErrorType.DATABASE_ERROR,
        priority: AlertPriority.CRITICAL,
        errorMessage,
        additionalData: context ? { context } : undefined
      }
    };

    await slackNotificationService.sendErrorNotification(notificationContext);
  } catch (slackError) {
    console.warn('⚠️ Erreur envoi notification Slack:', slackError);
  }
};

/**
 * Envoie une notification pour une étape spécifique échouée
 * @param projectUniqueId - ID unique du projet
 * @param projectName - Nom du projet
 * @param stepOrder - Ordre de l'étape (1-6)
 * @param stepName - Nom de l'étape
 * @param retryCount - Nombre de tentatives
 * @param maxRetries - Nombre maximum de tentatives
 */
export const sendSlackStepFailureNotification = async (
  projectUniqueId: string,
  projectName: string,
  stepOrder: number,
  stepName: string,
  retryCount: number,
  maxRetries: number
): Promise<void> => {
  try {
    await sendSlackErrorNotification(
      projectUniqueId,
      projectName,
      ErrorType.STEP_FAILURE,
      `Échec de l'étape ${stepName} après ${retryCount}/${maxRetries} tentatives`,
      {
        priority: AlertPriority.CRITICAL,
        stepName,
        stepOrder,
        retryCount,
        maxRetries
      }
    );
  } catch (slackError) {
    console.warn('⚠️ Erreur envoi notification Slack:', slackError);
  }
};
