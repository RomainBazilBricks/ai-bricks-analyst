import { useFetcher, useMutator } from "@/api/api";
import type { 
  AnalysisMacroPayload,
  AnalysisDescriptionPayload,
  MissingDocumentsPayload,
  VigilancePointsPayload,
  AnalysisMacroResponse,
  AnalysisDescriptionResponse,
  MissingDocumentsResponse,
  VigilancePointsResponse,
  WorkflowProgressResponse
} from "@shared/types/workflow";

/**
 * Hook pour déclencher l'analyse macro d'un projet
 */
export const useTriggerAnalysisMacro = (projectUniqueId: string, options = {}) =>
  useMutator<AnalysisMacroPayload, AnalysisMacroResponse>(
    `/api/workflow/analysis-macro/${projectUniqueId}`,
    options
  );

/**
 * Hook pour déclencher l'analyse détaillée d'un projet
 */
export const useTriggerAnalysisDescription = (projectUniqueId: string, options = {}) =>
  useMutator<AnalysisDescriptionPayload, AnalysisDescriptionResponse>(
    `/api/workflow/analysis-description/${projectUniqueId}`,
    options
  );

/**
 * Hook pour déclencher l'identification des documents manquants
 */
export const useTriggerMissingDocuments = (projectUniqueId: string, options = {}) =>
  useMutator<MissingDocumentsPayload, MissingDocumentsResponse>(
    `/api/workflow/missing-documents/${projectUniqueId}`,
    options
  );

/**
 * Hook pour déclencher l'identification des points de vigilance
 */
export const useTriggerVigilancePoints = (projectUniqueId: string, options = {}) =>
  useMutator<VigilancePointsPayload, VigilancePointsResponse>(
    `/api/workflow/vigilance-points/${projectUniqueId}`,
    options
  );

/**
 * Hook pour récupérer le progrès du workflow d'analyse
 */
export const useWorkflowProgress = (projectUniqueId: string, options = {}) =>
  useFetcher<undefined, WorkflowProgressResponse>({
    key: ["workflow-progress", projectUniqueId],
    path: `/api/workflow/status/${projectUniqueId}`,
    options: {
      enabled: !!projectUniqueId,
      ...options,
    },
  });

/**
 * Hook pour initier le workflow d'analyse d'un projet
 */
export const useInitiateWorkflow = (options = {}) =>
  useMutator<{ projectUniqueId: string }, { message: string; stepsCreated: number }>(
    "/api/workflow/initiate",
    options
  );

/**
 * Hook pour mettre à jour manuellement une étape de workflow
 */
export const useUpdateWorkflowStep = (options = {}) =>
  useMutator<{
    projectUniqueId: string;
    stepId: number;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    content?: string;
    manusConversationUrl?: string;
  }, { message: string; step: any }>(
    "/api/workflow/update-step",
    options
  ); 