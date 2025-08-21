import { useFetcher } from "@/api/api";
import type { Project } from "@shared/types/projects";

export const useGetProjectDetails = (projectUniqueId: string, options = {}) =>
  useFetcher<undefined, Project>({
    key: ["project-details", projectUniqueId],
    path: `/projects/${projectUniqueId}/details`,
    options,
  });
