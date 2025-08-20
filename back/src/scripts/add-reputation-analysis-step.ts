/**
 * Script pour ajouter l'étape d'analyse de réputation dans analysis_steps
 * Cette étape sera insérée entre "Consolidation des données" (ordre 2) et "Récupération des documents manquants" (ordre 3)
 * 
 * Exécution: npx ts-node -r tsconfig-paths/register src/scripts/add-reputation-analysis-step.ts
 */

import { db } from '../db/index';
import { analysis_steps } from '../db/schema';
import { eq, gte } from 'drizzle-orm';

async function addReputationAnalysisStep() {
  try {
    console.log('🚀 Ajout de l\'étape d\'analyse de réputation...');

    // 1. Vérifier si l'étape existe déjà
    console.log('🔍 Vérification de l\'existence de l\'étape...');
    const existingStep = await db
      .select()
      .from(analysis_steps)
      .where(eq(analysis_steps.name, 'Analyse de réputation'))
      .limit(1);

    if (existingStep.length > 0) {
      console.log('⚠️ L\'étape "Analyse de réputation" existe déjà');
      return;
    }

    // 2. Décaler les étapes existantes (ordre >= 3) vers l'ordre suivant
    console.log('📊 Décalage des étapes existantes...');
    
    // Récupérer les étapes à décaler (ordre >= 3)
    const stepsToShift = await db
      .select()
      .from(analysis_steps)
      .where(gte(analysis_steps.order, 3))
      .orderBy(analysis_steps.order);

    console.log(`📋 ${stepsToShift.length} étapes à décaler trouvées`);

    // Décaler chaque étape vers l'ordre suivant (en commençant par la fin pour éviter les conflits)
    for (let i = stepsToShift.length - 1; i >= 0; i--) {
      const step = stepsToShift[i];
      const newOrder = step.order + 1;
      
      console.log(`🔄 Décalage de "${step.name}" de l'ordre ${step.order} vers ${newOrder}`);
      
      await db
        .update(analysis_steps)
        .set({ order: newOrder })
        .where(eq(analysis_steps.id, step.id));
    }

    // 3. Insérer la nouvelle étape à l'ordre 3
    console.log('➕ Insertion de la nouvelle étape d\'analyse de réputation...');
    
    const newStep = {
      name: 'Analyse de réputation',
      description: 'Analyse de réputation de la société & du porteur',
      prompt: 'À compléter', // Prompt temporaire comme demandé
      order: 3,
      isActive: 1
    };

    const insertedStep = await db
      .insert(analysis_steps)
      .values(newStep)
      .returning();

    console.log('✅ Nouvelle étape créée:', insertedStep[0]);

    // 4. Afficher le résultat final
    console.log('📋 Ordre final des étapes:');
    const finalSteps = await db
      .select()
      .from(analysis_steps)
      .where(eq(analysis_steps.isActive, 1))
      .orderBy(analysis_steps.order);

    finalSteps.forEach(step => {
      console.log(`  ${step.order}. ${step.name}`);
    });

    console.log('🎉 Étape d\'analyse de réputation ajoutée avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout de l\'étape d\'analyse de réputation:', error);
    throw error;
  }
}

// Exécution du script
addReputationAnalysisStep()
  .then(() => {
    console.log('✅ Script terminé avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });
