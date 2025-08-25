import { useFetcher, useMutator } from "@/api/api";
import type { 
  OpenRouterModel, 
  OpenRouterTestRequest, 
  OpenRouterTestResponse 
} from "@shared/types/openrouter";

/**
 * Hook pour vérifier la connectivité OpenRouter
 */
export const useOpenRouterHealth = (options = {}) =>
  useFetcher<undefined, { success: boolean; message: string; timestamp: string }>({
    key: ["openrouter", "health"],
    path: "/api/openrouter/health",
    options,
  });

/**
 * Hook pour récupérer la liste des modèles disponibles
 */
export const useOpenRouterModels = (options = {}) =>
  useFetcher<undefined, { success: boolean; models: OpenRouterModel[]; count: number; timestamp: string }>({
    key: ["openrouter", "models"],
    path: "/api/openrouter/models",
    options,
  });

/**
 * Hook pour tester un modèle avec un prompt personnalisé
 */
export const useTestOpenRouterModel = (options = {}) =>
  useMutator<OpenRouterTestRequest, OpenRouterTestResponse>("/api/openrouter/test", options);

/**
 * Hook pour appeler GPT-4o via OpenRouter
 */
export const useCallGPT4o = (options = {}) =>
  useMutator<{
    prompt: string;
    systemPrompt?: string;
    temperature?: number;
    max_tokens?: number;
  }, OpenRouterTestResponse>("/api/openrouter/gpt4o", options);

/**
 * Hook pour le test rapide GPT-4o
 */
export const useQuickTestGPT4o = (options = {}) =>
  useFetcher<undefined, OpenRouterTestResponse & { test_type: string; message: string }>({
    key: ["openrouter", "gpt4o", "quick-test"],
    path: "/api/openrouter/gpt4o/quick-test",
    options,
  });
