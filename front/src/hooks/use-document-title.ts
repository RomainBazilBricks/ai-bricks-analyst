import { useEffect } from 'react';

/**
 * Hook pour gérer le titre de l'onglet du navigateur
 * @param title - Le titre à afficher dans l'onglet
 * @param suffix - Suffixe optionnel (par défaut: "AI Bricks Analyst")
 */
export const useDocumentTitle = (title: string, suffix: string = 'AI Bricks Analyst') => {
  useEffect(() => {
    const previousTitle = document.title;
    
    // Construire le titre complet
    const fullTitle = title ? `${title} - ${suffix}` : suffix;
    document.title = fullTitle;
    
    // Nettoyer en restaurant le titre précédent lors du démontage
    return () => {
      document.title = previousTitle;
    };
  }, [title, suffix]);
};
