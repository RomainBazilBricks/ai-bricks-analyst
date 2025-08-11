import { useMutation, type UseMutationOptions } from "@tanstack/react-query";

// Types pour l'API externe
export type SendMessageInput = {
  message: string;
  platform: string;
};

export type SendMessageResponse = {
  conversation_url: string;
};

/**
 * Hook pour envoyer un message à un outil externe (ManusAI, etc.)
 * Utilise fetch directement pour éviter le proxy axios
 */
export const useSendMessageToTool = (options: Partial<UseMutationOptions<SendMessageResponse, Error, SendMessageInput>> = {}) => {
  return useMutation<SendMessageResponse, Error, SendMessageInput>({
    mutationFn: async (data: SendMessageInput) => {
      const toolUrl = import.meta.env.VITE_AI_INTERFACE_ACTION_URL || 'http://localhost:8000';
      console.log('🚀 Envoi du message vers:', toolUrl);
      
      const response = await fetch(`${toolUrl}/send-message-quick`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: data.message,
          platform: data.platform,
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
    ...options,
  });
}; 