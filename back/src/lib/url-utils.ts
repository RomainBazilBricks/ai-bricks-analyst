/**
 * Utilitaires pour la gestion des URLs selon l'environnement
 */

/**
 * Récupère l'URL de base de l'application selon l'environnement
 * Priorité: BASE_URL > API_BASE_URL > fallback production
 */
export const getBaseUrl = (): string => {
  return process.env.BASE_URL || 
         process.env.API_BASE_URL || 
         'https://ai-bricks-analyst-production.up.railway.app';
};

/**
 * Récupère l'URL de l'environnement preprod
 */
export const getPreprodUrl = (): string => {
  return process.env.PREPROD_URL || 
         'https://ai-bricks-analyst-preprod.up.railway.app';
};

/**
 * Récupère l'URL locale pour le développement
 */
export const getLocalUrl = (): string => {
  const port = process.env.PORT || '3001';
  const host = process.env.HOST || 'localhost';
  return `http://${host}:${port}`;
};

/**
 * Détermine automatiquement l'URL selon l'environnement
 */
export const getEnvironmentUrl = (): string => {
  // Si on est en développement local
  if (process.env.NODE_ENV === 'development') {
    return getLocalUrl();
  }
  
  // Sinon utiliser BASE_URL ou fallback
  return getBaseUrl();
};

/**
 * Remplace tous les placeholders d'URL dans un texte
 */
export const replaceUrlPlaceholders = (text: string, projectUniqueId?: string): string => {
  const baseUrl = getBaseUrl();
  
  let processedText = text
    .replace(/{BASE_URL}/g, baseUrl)
    .replace(/https:\/\/ai-bricks-analyst-production\.up\.railway\.app/g, baseUrl);
  
  if (projectUniqueId) {
    processedText = processedText.replace(/{projectUniqueId}/g, projectUniqueId);
  }
  
  return processedText;
};
