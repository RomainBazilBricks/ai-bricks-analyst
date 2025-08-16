#!/usr/bin/env tsx

import { db } from '../db/index';
import { analysis_steps } from '../db/schema';

/**
 * Script pour réinitialiser les étapes d'analyse par défaut
 * Usage: npm run reset-steps
 */

const resetAnalysisSteps = async (): Promise<void> => {
  try {
    console.log('🔄 Réinitialisation des étapes d\'analyse par défaut...');
    
    // Supprimer toutes les étapes existantes
    await db.delete(analysis_steps);
    console.log('🗑️ Anciennes étapes supprimées');
    
    // Créer les 5 étapes par défaut avec le nouvel ordre
    const defaultSteps = [
      {
        name: 'Analyse globale',
        description: 'Une analyse détaillée et approfondie du projet avec vue d\'ensemble',
        prompt: '',
        order: 1,
        isActive: 1
      },
      {
        name: 'Consolidation des données',
        description: 'Récupère et structure toutes les données clés nécessaires à l\'analyse',
        prompt: '',
        order: 2,
        isActive: 1
      },
      {
        name: 'Récupération des documents manquants',
        description: 'Liste des documents attendus en complément pour approfondir l\'analyse',
        prompt: '',
        order: 3,
        isActive: 1
      },
      {
        name: 'Points de vigilance',
        description: 'Identification des risques critiques qui pourraient compromettre le financement',
        prompt: '',
        order: 4,
        isActive: 1
      },
      {
        name: 'Rédaction d\'un message',
        description: 'Un message qui récapitule le projet et liste les documents manquants',
        prompt: '',
        order: 5,
        isActive: 1
      }
    ];

    const insertedSteps = await db.insert(analysis_steps).values(defaultSteps).returning();
    console.log('✅ Nouvelles étapes d\'analyse créées avec succès:');
    
    insertedSteps.forEach((step, index) => {
      console.log(`   ${step.order}. ${step.name} (ID: ${step.id})`);
    });
    
    console.log('\n🎯 Nouvel ordre des étapes:');
    console.log('   1. Analyse globale');
    console.log('   2. Consolidation des données');
    console.log('   3. Récupération des documents manquants');
    console.log('   4. Points de vigilance');
    console.log('   5. Rédaction d\'un message');
    
    console.log('\n✨ Réinitialisation terminée avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur lors de la réinitialisation des étapes par défaut:', error);
    throw error;
  }
};

// Exécuter le script
resetAnalysisSteps()
  .then(() => {
    console.log('🚀 Script terminé avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Échec du script:', error);
    process.exit(1);
  });
