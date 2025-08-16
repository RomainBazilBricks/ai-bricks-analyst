import { useFetcher, useMutator } from "@/api/api";

/**
 * Type pour un message de conversation
 */
export type ConversationMessage = {
  id: string;
  sessionId: string;
  sessionDate: Date;
  sender: string;
  message: string;
  attachments: any[];
  createdAt: Date;
};

/**
 * Type pour créer un draft de message
 */
export type CreateDraftInput = {
  message: string;
  sender?: string;
};

/**
 * Hook pour récupérer les conversations d'un projet
 */
export const useGetProjectConversations = (projectUniqueId: string, options = {}) =>
  useFetcher<undefined, ConversationMessage[]>({
    key: ["conversations", projectUniqueId],
    path: `/projects/${projectUniqueId}/conversations`,
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
      ...options,
    },
  });

/**
 * Hook pour créer ou mettre à jour un draft de message
 */
export const useCreateDraft = (projectUniqueId: string, options = {}) =>
  useMutator<CreateDraftInput, ConversationMessage>(
    `/projects/${projectUniqueId}/conversations/draft`,
    {
      method: 'POST',
      ...options,
    }
  );
