import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { useGetActivePythonApiConfig } from "@/api/api-config";

// Types pour l'API externe
export type SendMessageInput = {
  message: string;
  platform: string;
  projectUniqueId?: string; // Optionnel pour la rétrocompatibilité
  conversation_url?: string; // Optionnel pour continuer une conversation existante
};

export type SendMessageResponse = {
  task_id: string;
  status: string;
  message_sent: string;
  conversation_url: string;
  quick_response: boolean;
  message: string;
  wait_for_ai_response: boolean;
};

/**
 * Hook pour récupérer l'URL de l'API Python dynamiquement
 */
const usePythonApiUrl = () => {
  const { data: apiConfig, isLoading } = useGetActivePythonApiConfig();
  
  // Fallback vers la variable d'environnement si pas de configuration en base
  const fallbackUrl = import.meta.env.VITE_AI_INTERFACE_ACTION_URL || 'http://localhost:8000';
  
  return {
    url: apiConfig?.url || fallbackUrl,
    isLoading
  };
};

/**
 * Hook pour envoyer un message à un outil externe (ManusAI, etc.)
 * Utilise l'URL dynamique configurée via l'API
 */
export const useSendMessageToTool = (options: Partial<UseMutationOptions<SendMessageResponse, Error, SendMessageInput>> = {}) => {
  const { url: toolUrl } = usePythonApiUrl();

  return useMutation<SendMessageResponse, Error, SendMessageInput>({
    mutationFn: async (data: SendMessageInput) => {
      console.log('🚀 Envoi du message vers:', toolUrl);
      
      // Remplacer systématiquement les placeholders dans le message
      let processedMessage = data.message;
      
      if (data.projectUniqueId) {
        // Remplacer {projectUniqueId}
        processedMessage = processedMessage.replace(/{projectUniqueId}/g, data.projectUniqueId);
        
        // Remplacer {documentListUrl} par l'URL de la page des documents
        if (processedMessage.includes('{documentListUrl}')) {
          const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://ai-bricks-analyst-production.up.railway.app';
          const documentListUrl = `${baseUrl}/api/projects/${data.projectUniqueId}/documents-list`;
          processedMessage = processedMessage.replace(/{documentListUrl}/g, documentListUrl);
          
          console.log('🔄 Placeholder {documentListUrl} remplacé par:', documentListUrl);
        }
        
        console.log('🔄 Placeholders remplacés dans le message');
      }
      
      const response = await fetch(`${toolUrl}/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: processedMessage, // Utiliser le message traité
          platform: data.platform,
          projectUniqueId: data.projectUniqueId, // Inclure l'ID du projet
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Réponse reçue:', result);
      
      return result;
    },
    // Éviter les mutations simultanées
    retry: false,
    // Désactiver la mutation si l'URL est en cours de chargement
    ...options,
  });
}; 