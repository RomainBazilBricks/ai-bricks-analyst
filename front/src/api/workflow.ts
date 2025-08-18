import { useFetcher, useMutator } from "@/api/api";
import { useMutation } from "@tanstack/react-query";
import type { 
  CreateAnalysisStepInput,
  AnalysisStep,
  AnalysisStepResponse,
  InitiateWorkflowInput,
  ProjectWorkflowStatusResponse,
  UpdateWorkflowStepInput,
  WorkflowStepEndpointInput
} from "@shared/types/projects";

/**
 * Hook pour récupérer toutes les étapes d'analyse actives
 */
export const useGetAnalysisSteps = (options = {}) =>
  useFetcher<undefined, AnalysisStep[]>({
    key: ["workflow", "steps"],
    path: "/workflow/steps",
    options,
  });

/**
 * Hook pour créer une nouvelle étape d'analyse
 */
export const useCreateAnalysisStep = (options = {}) =>
  useMutator<CreateAnalysisStepInput, AnalysisStepResponse>("/workflow/steps", options);

/**
 * Hook pour initier le workflow d'analyse d'un projet
 */
export const useInitiateWorkflow = (options = {}) =>
  useMutator<InitiateWorkflowInput, { message: string; projectUniqueId: string; stepsCreated: number }>("/workflow/initiate", options);

/**
 * Hook pour récupérer le statut du workflow d'un projet
 */
export const useGetWorkflowStatus = (projectUniqueId: string, options = {}) =>
  useFetcher<undefined, ProjectWorkflowStatusResponse>({
    key: ["workflow", "status", projectUniqueId],
    path: `/workflow/status/${projectUniqueId}`,
    options: {
      enabled: !!projectUniqueId,
      retry: (failureCount, error: any) => {
        // Ne pas retry si c'est une 404 (workflow pas encore initié)
        if (error?.response?.status === 404) {
          return false;
        }
        // Retry maximum 2 fois pour les autres erreurs
        return failureCount < 2;
      },
      // Considérer les 404 comme des succès (workflow pas initié)
      retryOnMount: false,
      refetchOnWindowFocus: false,
      ...options,
    },
  });

/**
 * Hook pour mettre à jour le statut d'une étape de workflow (usage générique)
 */
export const useUpdateWorkflowStep = (options = {}) =>
  useMutator<UpdateWorkflowStepInput, { message: string; step: any }>("/workflow/update-step", options);

/**
 * Hooks pour les endpoints spécifiques de chaque étape
 * Ces hooks sont utilisés pour mettre à jour le contenu de chaque étape
 */

/**
 * Hook pour mettre à jour l'étape 1: Analyse globale
 */
export const useUpdateOverviewStep = (options = {}) =>
  useMutator<WorkflowStepEndpointInput, { message: string; step: any }>("/workflow/step-1-overview", options);

/**
 * Hook pour mettre à jour l'étape 2: Vue d'ensemble du projet
 */
export const useUpdateAnalysisStep = (options = {}) =>
  useMutator<WorkflowStepEndpointInput, { message: string; step: any }>("/workflow/step-2-analysis", options);

/**
 * Hook pour mettre à jour l'étape 3: Récupération des documents manquants
 */
export const useUpdateDocumentsStep = (options = {}) =>
  useMutator<WorkflowStepEndpointInput, { message: string; step: any }>("/workflow/step-3-documents", options);

/**
 * Hook pour mettre à jour l'étape 4: Points de vigilance
 */
export const useUpdateVigilanceStep = (options = {}) =>
  useMutator<WorkflowStepEndpointInput, { message: string; step: any }>("/workflow/step-4-vigilance", options);

/**
 * Hook pour mettre à jour l'étape 5: Rédaction d'un message
 */
export const useUpdateMessageStep = (options = {}) =>
  useMutator<WorkflowStepEndpointInput, { message: string; step: any }>("/workflow/step-5-message", options);

/**
 * Hook pour mettre à jour une étape d'analyse (prompt, description, etc.)
 */
export const useUpdateAnalysisStepDefinition = (stepId: number, options = {}) => {
  const func = async (data: CreateAnalysisStepInput): Promise<AnalysisStepResponse> => {
    const response = await fetch(`${import.meta.env.VITE_API_ENV === "production" ? "/api-prod" : "http://localhost:3001/api"}/workflow/steps/${stepId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  };

  return useMutation<AnalysisStepResponse, unknown, CreateAnalysisStepInput>({
    ...options,
    mutationFn: func,
  });
};

/**
 * Hook pour déclencher l'étape 0: Upload des documents ZIP
 */
export const useTriggerStep0 = (options = {}) =>
  useMutator<{ projectUniqueId: string }, { 
    message: string; 
    projectUniqueId: string; 
    zipUrl: string; 
    zipFileName: string; 
    zipSize: number; 
    documentCount: number; 
    conversationUrl: string; 
    nextStepTriggered: boolean; 
  }>("/workflow/upload-zip-from-url", options); 