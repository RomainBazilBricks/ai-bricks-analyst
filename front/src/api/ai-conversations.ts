import { useFetcher, useMutator } from "@/api/api";
import type { 
  SaveConversationInput,
  ConversationResponse
} from "@shared/types/projects";

/**
 * Hook pour sauvegarder une URL de conversation IA
 */
export const useSaveAIConversation = (options = {}) =>
  useMutator<SaveConversationInput, ConversationResponse>("/ai-conversations", options);

/**
 * Hook pour récupérer toutes les conversations IA d'un projet
 */
export const useGetAIConversationsByProject = (projectUniqueId: string, options = {}) =>
  useFetcher<undefined, ConversationResponse[]>({
    key: ["ai-conversations", "project", projectUniqueId],
    path: `/ai-conversations/project/${projectUniqueId}`,
    options: {
      enabled: !!projectUniqueId,
      retry: (failureCount, error: any) => {
        // Ne pas retry si c'est une 404 (pas de conversations encore)
        if (error?.response?.status === 404) {
          return false;
        }
        return failureCount < 2;
      },
      retryOnMount: false,
      refetchOnWindowFocus: false,
      // Traiter les 404 comme un tableau vide (pas d'onError car non supporté dans useFetcher)
      ...options,
    },
  });

/**
 * Hook pour récupérer la dernière conversation IA d'un projet
 */
export const useGetLatestAIConversation = (projectUniqueId: string, options = {}) =>
  useFetcher<undefined, ConversationResponse>({
    key: ["ai-conversations", "project", projectUniqueId, "latest"],
    path: `/ai-conversations/project/${projectUniqueId}/latest`,
    options: {
      enabled: !!projectUniqueId,
      retry: (failureCount, error: any) => {
        // Ne pas retry si c'est une 404 (pas de conversation IA encore)
        if (error?.response?.status === 404) {
          return false;
        }
        return failureCount < 2;
      },
      retryOnMount: false,
      refetchOnWindowFocus: false,
      ...options,
    },
  });
