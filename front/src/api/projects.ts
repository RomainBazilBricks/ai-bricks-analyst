import { useFetcher, useMutator } from "@/api/api";
import type { 
  CreateProjectInput, 
  ProjectResponse, 
  PaginatedProjectsResponse,
  ProjectWithDocumentsResponse,
  DocumentResponse,
  PostSynthesisInput,
  SynthesisResponse,
  UpdateProjectConversationInput,
  ProjectDocumentUrls,
  DeleteProjectInput,
  DeleteProjectResponse
} from "@shared/types/projects";

/**
 * Hook pour récupérer tous les projets avec pagination par cursor
 */
export const useGetAllProjects = (options = {}) =>
  useFetcher<undefined, PaginatedProjectsResponse>({
    key: ["projects"],
    path: "/projects",
    options,
  });

/**
 * Hook pour récupérer les projets avec pagination personnalisée
 */
export const useGetPaginatedProjects = (cursor?: string, limit = 10, direction = 'next', options = {}) =>
  useFetcher<undefined, PaginatedProjectsResponse>({
    key: ["projects", "paginated", cursor, limit, direction],
    path: `/projects?${new URLSearchParams({
      ...(cursor && { cursor }),
      limit: limit.toString(),
      direction
    })}`,
    options,
  });

/**
 * Hook pour créer un nouveau projet avec téléchargement de fichiers
 */
export const useCreateProject = (options = {}) =>
  useMutator<CreateProjectInput, ProjectWithDocumentsResponse>("/projects", options);

/**
 * Hook pour récupérer les documents d'un projet spécifique
 */
export const useGetProjectDocuments = (projectUniqueId: string, options = {}) =>
  useFetcher<undefined, DocumentResponse[]>({
    key: ["projects", projectUniqueId, "documents"],
    path: `/projects/${projectUniqueId}/documents`,
    options: {
      enabled: !!projectUniqueId,
      ...options,
    },
  });

/**
 * Hook pour récupérer un projet spécifique par son ID
 */
export const useGetProjectById = (projectUniqueId: string, options = {}) =>
  useFetcher<undefined, ProjectResponse>({
    key: ["projects", projectUniqueId],
    path: `/projects/${projectUniqueId}`,
    options: {
      enabled: !!projectUniqueId,
      ...options,
    },
  });

/**
 * Hook pour envoyer une synthèse ManusAI
 */
export const usePostSynthesis = (options = {}) =>
  useMutator<PostSynthesisInput, SynthesisResponse>("/projects/synthesis", options);

/**
 * Hook pour mettre à jour l'URL de conversation d'un projet
 */
export const useUpdateProjectConversationUrl = (options = {}) =>
  useMutator<UpdateProjectConversationInput, ProjectResponse>("/projects/conversation-url", options);

/**
 * Hook pour récupérer uniquement les URLs des documents d'un projet spécifique (pour les prompts d'IA)
 */
export const useGetProjectDocumentUrls = (projectUniqueId: string, options = {}) =>
  useFetcher<undefined, ProjectDocumentUrls>({
    key: ["projects", projectUniqueId, "document-urls"],
    path: `/projects/${projectUniqueId}/document-urls`,
    options: {
      enabled: !!projectUniqueId,
      ...options,
    },
  });

/**
 * Hook pour supprimer un projet et toutes ses données associées
 */
export const useDeleteProject = (options = {}) =>
  useMutator<DeleteProjectInput, DeleteProjectResponse>("/projects/delete", options); 