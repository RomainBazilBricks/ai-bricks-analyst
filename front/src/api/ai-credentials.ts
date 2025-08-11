import { useFetcher, useMutator } from "@/api/api";
import type { 
  AiCredentialResponse, 
  CreateAiCredentialInput,
  UpdateAiCredentialInput,
  PaginatedAiCredentialsResponse,
  GetAiCredentialsQuery,
  AiPlatform
} from '@shared/types/ai-credentials';

/**
 * Hook pour récupérer tous les credentials avec pagination et filtres
 */
export const useGetPaginatedAiCredentials = (queryParams: GetAiCredentialsQuery = {}, options = {}) => {
  const searchParams = new URLSearchParams();
  
  if (queryParams.platform) searchParams.append('platform', queryParams.platform);
  if (queryParams.userIdentifier) searchParams.append('userIdentifier', queryParams.userIdentifier);
  if (queryParams.isActive !== undefined) searchParams.append('isActive', queryParams.isActive.toString());
  if (queryParams.cursor) searchParams.append('cursor', queryParams.cursor);
  if (queryParams.limit) searchParams.append('limit', queryParams.limit.toString());
  if (queryParams.direction) searchParams.append('direction', queryParams.direction);
  
  const queryString = searchParams.toString();
  const path = queryString ? `/ai-credentials?${queryString}` : '/ai-credentials';
  
  return useFetcher<undefined, PaginatedAiCredentialsResponse>({
    key: ["ai-credentials", queryParams],
    path,
    options,
  });
};

/**
 * Hook pour récupérer un credential spécifique par ID
 */
export const useGetAiCredentialById = (id: number, options = {}) => {
  return useFetcher<undefined, AiCredentialResponse>({
    key: ["ai-credentials", id],
    path: `/ai-credentials/${id}`,
    options,
  });
};

/**
 * Hook pour récupérer le credential actif pour une plateforme et un utilisateur
 */
export const useGetCredentialByPlatformAndUser = (
  platform: AiPlatform, 
  userIdentifier: string, 
  options = {}
) => {
  return useFetcher<undefined, AiCredentialResponse>({
    key: ["ai-credentials", "platform", platform, "user", userIdentifier],
    path: `/ai-credentials/platform/${platform}/user/${userIdentifier}`,
    options,
  });
};

/**
 * Hook pour créer un nouveau credential
 */
export const useCreateAiCredential = (options = {}) => {
  return useMutator<CreateAiCredentialInput, AiCredentialResponse>("/ai-credentials", options);
};

/**
 * Hook pour mettre à jour un credential
 */
export const useUpdateAiCredential = (id: number, options = {}) => {
  return useMutator<UpdateAiCredentialInput, AiCredentialResponse>(
    `/ai-credentials/${id}/update`, 
    options
  );
};

/**
 * Hook pour supprimer (désactiver) un credential
 */
export const useDeleteAiCredential = (id: number, options = {}) => {
  return useMutator<undefined, AiCredentialResponse>(
    `/ai-credentials/${id}/delete`, 
    options
  );
}; 