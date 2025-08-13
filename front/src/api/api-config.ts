import { useFetcher, useMutator } from "@/api/api";
import type { 
  ApiConfigResponse, 
  CreateApiConfigInput, 
  UpdateApiConfigInput,
  PaginatedApiConfigsResponse,
  UpdatePythonApiConfigInput
} from "@shared/types/api-config";

/**
 * Hook pour récupérer toutes les configurations d'API avec pagination
 */
export const useGetAllApiConfigs = (options = {}) =>
  useFetcher<undefined, PaginatedApiConfigsResponse>({
    key: ["api-configs"],
    path: "/api-configs",
    options,
  });

/**
 * Hook pour récupérer une configuration d'API par son ID
 */
export const useGetApiConfigById = (id: number, options = {}) =>
  useFetcher<undefined, ApiConfigResponse>({
    key: ["api-configs", id],
    path: `/api-configs/${id}`,
    options: {
      enabled: !!id,
      ...options,
    },
  });

/**
 * Hook pour récupérer la configuration d'API Python active
 */
export const useGetActivePythonApiConfig = (options = {}) =>
  useFetcher<undefined, ApiConfigResponse>({
    key: ["api-configs", "python", "active"],
    path: "/api-configs/python/active",
    options,
  });

/**
 * Hook pour créer une nouvelle configuration d'API
 */
export const useCreateApiConfig = (options = {}) =>
  useMutator<CreateApiConfigInput, ApiConfigResponse>("/api-configs", options);

/**
 * Hook pour mettre à jour une configuration d'API
 */
export const useUpdateApiConfig = (id: number, options = {}) =>
  useMutator<UpdateApiConfigInput, ApiConfigResponse>(`/api-configs/${id}/update`, options);

/**
 * Hook pour supprimer une configuration d'API (soft delete)
 */
export const useDeleteApiConfig = (id: number, options = {}) =>
  useMutator<undefined, ApiConfigResponse>(`/api-configs/${id}/delete`, options);

/**
 * Hook pour mettre à jour la configuration de l'API Python
 */
export const useUpdatePythonApiConfig = (options = {}) =>
  useMutator<UpdatePythonApiConfigInput, ApiConfigResponse>("/api-configs/python/update", options);
