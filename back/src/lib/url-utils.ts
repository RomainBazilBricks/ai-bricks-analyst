/**
 * Utilitaires pour la gestion des URLs selon l'environnement
 */

/**
 * Récupère l'URL de base de l'application selon l'environnement
 * Priorité: BASE_URL > API_BASE_URL > fallback production
 */
export const getBaseUrl = (): string => {
  const baseUrl = process.env.BASE_URL || 
                  process.env.API_BASE_URL || 
                  'https://ai-bricks-analyst-production.up.railway.app';
  
  console.log(`🔍 DEBUG getBaseUrl():`);
  console.log(`   - process.env.BASE_URL: ${process.env.BASE_URL}`);
  console.log(`   - process.env.API_BASE_URL: ${process.env.API_BASE_URL}`);
  console.log(`   - baseUrl final: ${baseUrl}`);
  
  return baseUrl;
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
  
  console.log(`🔄 DEBUG replaceUrlPlaceholders():`);
  console.log(`   - baseUrl utilisé: ${baseUrl}`);
  console.log(`   - texte avant (premiers 200 chars): ${text.substring(0, 200)}`);
  console.log(`   - contient {BASE_URL}: ${text.includes('{BASE_URL}')}`);
  
  let processedText = text
    .replace(/{BASE_URL}/g, baseUrl)
    .replace(/https:\/\/ai-bricks-analyst-production\.up\.railway\.app/g, baseUrl);
  
  if (projectUniqueId) {
    processedText = processedText.replace(/{projectUniqueId}/g, projectUniqueId);
  }
  
  console.log(`   - texte après (premiers 200 chars): ${processedText.substring(0, 200)}`);
  console.log(`   - contient encore {BASE_URL}: ${processedText.includes('{BASE_URL}')}`);
  
  return processedText;
};
