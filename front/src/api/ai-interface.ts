import axios from 'axios';
import { useGetActivePythonApiConfig } from "@/api/api-config";

// Cache pour éviter les appels multiples simultanés
const pendingRequests = new Map<string, Promise<AIPromptResponse>>();

export interface AIPromptRequest {
  prompt: string;
  projectUniqueId: string;
  stepId: number;
  stepName: string;
  platform?: string; // Optionnel, défaut à 'manus'
}

export interface AIPromptResponse {
  response: string;
  success: boolean;
  error?: string;
}

/**
 * Hook pour récupérer l'URL de l'API Python dynamiquement
 */
const usePythonApiUrl = () => {
  const { data: apiConfig, isLoading } = useGetActivePythonApiConfig();
  
  // Fallback vers la variable d'environnement si pas de configuration en base
  const fallbackUrl = import.meta.env.VITE_AI_INTERFACE_ACTION_URL || 'https://64239c9ce527.ngrok-free.app';
  
  return {
    url: apiConfig?.url || fallbackUrl,
    isLoading
  };
};

/**
 * Envoie un prompt à l'AI Interface Action avec URL dynamique
 * Inclut une protection contre les appels multiples simultanés
 */
export const sendPromptToAI = async (data: AIPromptRequest, apiUrl?: string): Promise<AIPromptResponse> => {
  // Créer une clé unique pour cette requête
  const requestKey = `${data.projectUniqueId}-${data.stepId}-${data.prompt.slice(0, 50)}`;
  
  // Si une requête identique est déjà en cours, retourner la même promesse
  if (pendingRequests.has(requestKey)) {
    console.log('🔄 Requête déjà en cours, réutilisation de la promesse existante');
    return pendingRequests.get(requestKey)!;
  }

  // Créer la nouvelle requête
  const requestPromise = (async (): Promise<AIPromptResponse> => {
    try {
      // Utiliser l'URL fournie ou fallback
      const baseURL = apiUrl || import.meta.env.VITE_AI_INTERFACE_ACTION_URL || 'https://64239c9ce527.ngrok-free.app';
      
      const aiAxiosInstance = axios.create({
        baseURL,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('🚀 Envoi du prompt à l\'IA:', { projectUniqueId: data.projectUniqueId, stepId: data.stepId });

      const response = await aiAxiosInstance.post('/send-message', {
        message: data.prompt,
        platform: data.platform || 'manus', // Défaut à manus pour les prompts IA
        projectUniqueId: data.projectUniqueId,
        // Informations supplémentaires pour l'IA (optionnelles)
        stepId: data.stepId,
        stepName: data.stepName,
      });
      
      return {
        response: response.data.response || response.data.message || '',
        success: true,
      };
    } catch (error: any) {
      console.error('Erreur lors de l\'appel à l\'AI Interface Action:', error);
      return {
        response: '',
        success: false,
        error: error.response?.data?.message || error.message || 'Erreur inconnue',
      };
    } finally {
      // Nettoyer le cache après la requête (succès ou erreur)
      pendingRequests.delete(requestKey);
    }
  })();

  // Stocker la promesse dans le cache
  pendingRequests.set(requestKey, requestPromise);
  
  return requestPromise;
};

/**
 * Hook React Query pour envoyer un prompt à l'IA avec URL dynamique
 */
export const useSendPromptToAI = () => {
  const { url: apiUrl } = usePythonApiUrl();

  return {
    mutateAsync: (data: AIPromptRequest) => sendPromptToAI(data, apiUrl),
    // On peut ajouter d'autres propriétés React Query plus tard si nécessaire
  };
}; 