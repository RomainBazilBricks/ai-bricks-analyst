import { useFetcher } from "@/api/api";
import type { StrengthPoint } from "@shared/types/projects";

/**
 * Hook pour récupérer les points forts d'un projet
 */
export const useGetStrengths = (projectUniqueId: string, options = {}) => {
  return useFetcher<undefined, StrengthPoint[]>({
    key: ["strengths", projectUniqueId],
    path: `/api/projects/${projectUniqueId}/strengths`,
    options,
  });
};
