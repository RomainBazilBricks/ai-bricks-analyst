import { useMutator } from "@/api/api";

/**
 * Hook pour relancer la reformulation GPT-4o d'un message
 */
export const useRetryReformulation = (projectUniqueId: string, options = {}) =>
  useMutator<undefined, { success: boolean; message: string; tokensUsed: number }>(
    `/api/workflow/retry-reformulation/${projectUniqueId}`, 
    options
  );
