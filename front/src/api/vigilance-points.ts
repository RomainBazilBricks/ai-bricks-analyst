import { useFetcher } from "@/api/api";
import { useMutation } from "@tanstack/react-query";

/**
 * Type pour un point de vigilance
 */
export type VigilancePoint = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  category: 'legal' | 'financial' | 'technical' | 'business' | 'regulatory';
  potentialImpact: string | null;
  recommendedActions: string[];
  status: 'pending' | 'resolved' | 'irrelevant';
  whyStatus: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Type pour la mise à jour du statut d'un point de vigilance
 */
export type UpdateVigilancePointStatusInput = {
  projectUniqueId: string;
  pointId: string;
  status: 'resolved' | 'irrelevant' | 'pending';
  whyStatus?: string;
};

/**
 * Hook pour récupérer les points de vigilance d'un projet
 */
export const useGetVigilancePoints = (projectUniqueId: string, options = {}) =>
  useFetcher<undefined, VigilancePoint[]>({
    key: ["vigilance-points", projectUniqueId],
    path: `/projects/${projectUniqueId}/vigilance-points`,
    options: {
      enabled: !!projectUniqueId,
      retry: (failureCount, error: any) => {
        // Ne pas retry si c'est une 404 (pas de points de vigilance encore)
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
 * Hook pour mettre à jour le statut d'un point de vigilance
 */
export const useUpdateVigilancePointStatus = (options = {}) => {
  return useMutation<VigilancePoint, Error, UpdateVigilancePointStatusInput>({
    mutationFn: async (input: UpdateVigilancePointStatusInput) => {
      const url = `/projects/${input.projectUniqueId}/vigilance-points/${input.pointId}`;
      const body = {
        status: input.status,
        whyStatus: input.whyStatus
      };
      
      console.log('🔧 Vigilance Point Mutation:', { url, body }); // Debug
      
      // Utiliser axiosPatch directement
      const { axiosPatch } = await import("@/api/axios");
      const result = await axiosPatch<typeof body, VigilancePoint>(url, body);
      
      console.log('✅ Vigilance Point Mutation result:', result); // Debug
      return result;
    },
    ...options
  });
};
