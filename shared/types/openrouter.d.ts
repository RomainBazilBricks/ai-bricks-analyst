/**
 * Types pour l'intégration OpenRouter
 */

export type OpenRouterModel = 
  | 'openai/gpt-4o'
  | 'openai/gpt-4o-mini'
  | 'openai/gpt-5'
  | 'anthropic/claude-3.5-sonnet'
  | 'anthropic/claude-3.5-haiku'
  | 'google/gemini-pro-1.5'
  | 'meta-llama/llama-3.1-405b-instruct'
  | 'mistralai/mistral-large'
  | 'perplexity/llama-3.1-sonar-large-128k-online';

export type OpenRouterMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type OpenRouterChatRequest = {
  model: OpenRouterModel;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
};

export type OpenRouterUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};

export type OpenRouterChoice = {
  index: number;
  message: OpenRouterMessage;
  finish_reason: 'stop' | 'length' | 'content_filter' | null;
};

export type OpenRouterChatResponse = {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: OpenRouterChoice[];
  usage: OpenRouterUsage;
};

export type OpenRouterError = {
  error: {
    message: string;
    type: string;
    code?: string;
  };
};

export type OpenRouterTestRequest = {
  model: OpenRouterModel;
  prompt: string;
  temperature?: number;
  max_tokens?: number;
};

export type OpenRouterTestResponse = {
  success: boolean;
  response?: string;
  usage?: OpenRouterUsage;
  error?: string;
  model: OpenRouterModel;
  timestamp: string;
};
