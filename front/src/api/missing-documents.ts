import { useFetcher, useMutator } from "@/api/api";
import { useMutation } from "@tanstack/react-query";

/**
 * Type pour un document manquant
 */
export type MissingDocument = {
  id: string;
  projectId: string;
  name: string;
  whyMissing: string | null;
  priority: 'high' | 'medium' | 'low';
  category: 'legal' | 'financial' | 'technical' | 'business' | 'regulatory';
  impactOnProject: string | null;
  suggestedSources: string[];
  status: 'pending' | 'resolved' | 'irrelevant';
  whyStatus: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Type pour la mise à jour du statut d'un document manquant
 */
export type UpdateMissingDocumentStatusInput = {
  projectUniqueId: string;
  documentId: string;
  status: 'resolved' | 'irrelevant' | 'pending';
  whyStatus?: string;
};

/**
 * Hook pour récupérer les documents manquants d'un projet
 */
export const useGetMissingDocuments = (projectUniqueId: string, options = {}) =>
  useFetcher<undefined, MissingDocument[]>({
    key: ["missing-documents", projectUniqueId],
    path: `/projects/${projectUniqueId}/missing-documents`,
    options: {
      enabled: !!projectUniqueId,
      retry: (failureCount, error: any) => {
        // Ne pas retry si c'est une 404 (pas de documents manquants encore)
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
 * Hook pour mettre à jour le statut d'un document manquant
 */
export const useUpdateMissingDocumentStatus = (options = {}) => {
  return useMutation<MissingDocument, Error, UpdateMissingDocumentStatusInput>({
    mutationFn: async (input: UpdateMissingDocumentStatusInput) => {
      const url = `/projects/${input.projectUniqueId}/missing-documents/${input.documentId}`;
      const body = {
        status: input.status,
        whyStatus: input.whyStatus
      };
      
      console.log('🔧 Mutation:', { url, body }); // Debug
      
      // Utiliser axiosPatch directement
      const { axiosPatch } = await import("@/api/axios");
      const result = await axiosPatch<typeof body, MissingDocument>(url, body);
      
      console.log('✅ Mutation result:', result); // Debug
      return result;
    },
    ...options
  });
};
