import { useFetcher } from "@/api/api";
import { useMutation } from "@tanstack/react-query";
import type { StrengthPoint } from "@shared/types/projects";

/**
 * Type pour la mise à jour du statut d'un point fort
 */
export type UpdateStrengthStatusInput = {
  projectUniqueId: string;
  pointId: string;
  status: 'resolved' | 'irrelevant' | 'pending';
  whyStatus?: string;
};

/**
 * Hook pour récupérer les points forts d'un projet
 */
export const useGetStrengths = (projectUniqueId: string, options = {}) => {
  return useFetcher<undefined, StrengthPoint[]>({
    key: ["strengths", projectUniqueId],
    path: `/projects/${projectUniqueId}/strengths`,
    options: {
      ...options,
      // Transformer les erreurs en tableau vide pour éviter les crashes
      select: (data: any) => {
        if (Array.isArray(data)) {
          return data;
        }
        // Si ce n'est pas un tableau (erreur, null, etc.), retourner un tableau vide
        return [];
      },
    },
  });
};

/**
 * Hook pour mettre à jour le statut d'un point fort
 */
export const useUpdateStrengthStatus = (options = {}) => {
  return useMutation<StrengthPoint, Error, UpdateStrengthStatusInput>({
    mutationFn: async (input: UpdateStrengthStatusInput) => {
      const url = `/projects/${input.projectUniqueId}/strengths/${input.pointId}`;
      const body = {
        status: input.status,
        whyStatus: input.whyStatus
      };
      
      console.log('🔧 Strength Point Mutation:', { url, body }); // Debug
      
      // Utiliser axiosPatch directement
      const { axiosPatch } = await import("@/api/axios");
      const result = await axiosPatch<typeof body, StrengthPoint>(url, body);
      
      console.log('✅ Strength Point Mutation result:', result); // Debug
      return result;
    },
    ...options
  });
};
