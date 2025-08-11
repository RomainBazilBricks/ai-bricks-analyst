/**
 * Types pour les credentials des plateformes IA
 */

export type AiPlatform = 'chatgpt' | 'claude' | 'manus' | 'perplexity' | 'gemini' | 'mistral';

export type AiCredential = {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  platform: AiPlatform;
  userIdentifier: string | null;
  credentialName: string;
  sessionData: Record<string, any>;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  userAgent: string | null;
  notes: string | null;
};

export type CreateAiCredentialInput = {
  platform: AiPlatform;
  userIdentifier?: string;
  credentialName?: string;
  sessionData: Record<string, any>;
  expiresAt?: string;
  userAgent?: string;
  notes?: string;
};

export type UpdateAiCredentialInput = {
  platform?: AiPlatform;
  userIdentifier?: string;
  credentialName?: string;
  sessionData?: Record<string, any>;
  expiresAt?: string;
  userAgent?: string;
  notes?: string;
  isActive?: boolean;
};

export type AiCredentialResponse = AiCredential;

export type PaginatedAiCredentialsResponse = {
  items: AiCredential[];
  nextCursor: number | null;
  hasMore: boolean;
};

export type GetAiCredentialsQuery = {
  platform?: AiPlatform;
  userIdentifier?: string;
  isActive?: boolean;
  cursor?: string;
  limit?: number;
  direction?: 'next' | 'prev';
};

/**
 * Structures spécifiques par plateforme pour sessionData
 */

export type ManusSessionData = {
  session_token: string;
  user_id: string;
  cookies: {
    session_id: string;
    'manus-theme': string;
    'intercom-session-k7n2hgls': string;
    [key: string]: string;
  };
  local_storage: {
    'UserService.userInfo': string;
    usage_info: string;
    [key: string]: string;
  };
};

export type ChatGptSessionData = {
  session_token: string;
  auth_token: string;
  cookies: {
    '__Secure-next-auth.session-token': string;
    _cfuvid: string;
    [key: string]: string;
  };
  headers: {
    authorization: string;
    'user-agent': string;
    [key: string]: string;
  };
};

export type ClaudeSessionData = {
  session_key: string;
  organization_id: string;
  cookies: Record<string, string>;
  api_key: string;
};

export type PerplexitySessionData = {
  session_token: string;
  user_id: string;
  cookies: Record<string, string>;
  headers: Record<string, string>;
};

export type GeminiSessionData = {
  api_key: string;
  project_id: string;
  cookies?: Record<string, string>;
  headers?: Record<string, string>;
};

export type MistralSessionData = {
  api_key: string;
  organization_id?: string;
  cookies?: Record<string, string>;
  headers?: Record<string, string>;
}; 