import axios, { AxiosResponse } from 'axios';
import type { 
  OpenRouterChatRequest, 
  OpenRouterChatResponse, 
  OpenRouterError,
  OpenRouterModel,
  OpenRouterMessage,
  OpenRouterTestRequest,
  OpenRouterTestResponse
} from '@shared/types/openrouter';

/**
 * Service pour interagir avec l'API OpenRouter
 */
export class OpenRouterService {
  private apiKey: string;
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    this.baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
    
    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY non configurée dans les variables d\'environnement');
    }

    this.defaultHeaders = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.BASE_URL || 'https://ai-bricks-analyst.com',
      'X-Title': 'AI Bricks Analyst'
    };
  }

  /**
   * Effectue un appel de chat completion via OpenRouter
   */
  async chatCompletion(request: OpenRouterChatRequest): Promise<OpenRouterChatResponse> {
    try {
      const response: AxiosResponse<OpenRouterChatResponse> = await axios.post(
        `${this.baseUrl}/chat/completions`,
        request,
        {
          headers: this.defaultHeaders,
          timeout: 120000 // 2 minutes timeout
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur OpenRouter chat completion:', error.response?.data || error.message);
      
      if (error.response?.data) {
        const openRouterError = error.response.data as OpenRouterError;
        throw new Error(`OpenRouter API Error: ${openRouterError.error.message}`);
      }
      
      throw new Error(`Erreur de connexion à OpenRouter: ${error.message}`);
    }
  }

  /**
   * Test simple d'un modèle avec un prompt
   */
  async testModel(request: OpenRouterTestRequest): Promise<OpenRouterTestResponse> {
    try {
      const chatRequest: OpenRouterChatRequest = {
        model: request.model,
        messages: [
          {
            role: 'user',
            content: request.prompt
          }
        ],
        temperature: request.temperature || 0.7,
        max_tokens: request.max_tokens || 1000
      };

      const response = await this.chatCompletion(chatRequest);

      return {
        success: true,
        response: response.choices[0]?.message?.content || 'Pas de réponse',
        usage: response.usage,
        model: request.model,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      console.error('❌ Erreur test modèle OpenRouter:', error.message);
      
      return {
        success: false,
        error: error.message,
        model: request.model,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Effectue un appel simple avec GPT-4o (via OpenRouter)
   */
  async callGPT4o(prompt: string, options: {
    temperature?: number;
    max_tokens?: number;
    systemPrompt?: string;
  } = {}): Promise<OpenRouterTestResponse> {
    const messages: OpenRouterMessage[] = [];
    
    if (options.systemPrompt) {
      messages.push({
        role: 'system',
        content: options.systemPrompt
      });
    }
    
    messages.push({
      role: 'user',
      content: prompt
    });

    const request: OpenRouterChatRequest = {
      model: 'openai/gpt-4o',
      messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 2000
    };

    try {
      const response = await this.chatCompletion(request);

      return {
        success: true,
        response: response.choices[0]?.message?.content || 'Pas de réponse',
        usage: response.usage,
        model: 'openai/gpt-4o',
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      console.error('❌ Erreur appel GPT-4o:', error.message);
      
      return {
        success: false,
        error: error.message,
        model: 'openai/gpt-4o',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Vérifie la connectivité avec OpenRouter
   */
  async healthCheck(): Promise<{ success: boolean; message: string }> {
    try {
      const testResponse = await this.testModel({
        model: 'openai/gpt-4o-mini',
        prompt: 'Réponds simplement "OK" pour confirmer que tu fonctionnes.',
        temperature: 0,
        max_tokens: 10
      });

      if (testResponse.success) {
        return {
          success: true,
          message: 'OpenRouter fonctionne correctement'
        };
      } else {
        return {
          success: false,
          message: `Erreur de test: ${testResponse.error}`
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: `Erreur de connectivité: ${error.message}`
      };
    }
  }

  /**
   * Liste les modèles disponibles (statique pour l'instant)
   */
  getAvailableModels(): OpenRouterModel[] {
    return [
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      'openai/gpt-5',
      'anthropic/claude-3.5-sonnet',
      'anthropic/claude-3.5-haiku',
      'google/gemini-pro-1.5',
      'meta-llama/llama-3.1-405b-instruct',
      'mistralai/mistral-large',
      'perplexity/llama-3.1-sonar-large-128k-online'
    ];
  }
}

// Instance singleton
export const openRouterService = new OpenRouterService();
