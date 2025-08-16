import { useFetcher } from "@/api/api";
import type { StrengthPoint } from "@shared/types/projects";

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
