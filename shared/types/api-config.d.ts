/**
 * Types pour la configuration des APIs externes
 */

export type ApiConfig = {
  id: number;
  name: string;
  url: string;
  isActive: boolean;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateApiConfigInput = {
  name: string;
  url: string;
  description?: string;
  isActive?: boolean;
};

export type UpdateApiConfigInput = {
  name?: string;
  url?: string;
  description?: string;
  isActive?: boolean;
};

export type ApiConfigResponse = ApiConfig;

export type PaginatedApiConfigsResponse = {
  items: ApiConfig[];
  nextCursor: number | null;
  hasMore: boolean;
};

/**
 * Types spécifiques pour l'API Python
 */
export type PythonApiConfig = {
  url: string;
  isActive: boolean;
};

export type UpdatePythonApiConfigInput = {
  url: string;
  isActive?: boolean;
};
