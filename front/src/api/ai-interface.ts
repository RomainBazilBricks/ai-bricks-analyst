import axios from 'axios';

const AI_BASE_URL = import.meta.env.VITE_AI_INTERFACE_ACTION_URL || 'https://fbef64427d95.ngrok-free.app';

const aiAxiosInstance = axios.create({
  baseURL: AI_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface AIPromptRequest {
  prompt: string;
  projectUniqueId: string;
  stepId: number;
  stepName: string;
}

export interface AIPromptResponse {
  response: string;
  success: boolean;
  error?: string;
}

/**
 * Envoie un prompt à l'AI Interface Action
 */
export const sendPromptToAI = async (data: AIPromptRequest): Promise<AIPromptResponse> => {
  try {
    const response = await aiAxiosInstance.post('/send-message', data);
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
  }
};

/**
 * Hook React Query pour envoyer un prompt à l'IA
 */
export const useSendPromptToAI = () => {
  return {
    mutateAsync: sendPromptToAI,
    // On peut ajouter d'autres propriétés React Query plus tard si nécessaire
  };
}; 