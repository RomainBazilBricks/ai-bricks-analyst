#!/usr/bin/env tsx

import { db } from '@/db/index';
import { analysis_steps } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

async function updateStep0Prompt() {
  try {
    console.log('🔄 Mise à jour du prompt de l\'étape 0...');

    const newPrompt = `Voici tous les documents du projet {projectUniqueId} dans une archive ZIP. Peux-tu analyser ces documents et me donner un aperçu général du projet ? Il y a {documentCount} documents au total.

Une fois ton analyse terminée, déclenche l'étape suivante (Analyse globale) en faisant un POST sur : {BASE_URL}/api/workflow/trigger-step-1/{projectUniqueId}

Ce POST marquera automatiquement cette étape comme terminée et déclenchera l'analyse globale.`;

    const result = await db
      .update(analysis_steps)
      .set({
        prompt: newPrompt
      })
      .where(and(
        eq(analysis_steps.order, 0),
        eq(analysis_steps.isActive, 1)
      ))
      .returning();

    if (result.length > 0) {
      console.log('✅ Prompt de l\'étape 0 mis à jour avec succès');
      console.log('📝 Nouveau prompt:');
      console.log(result[0].prompt);
    } else {
      console.log('⚠️ Aucune étape 0 trouvée à mettre à jour');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  updateStep0Prompt();
}

export { updateStep0Prompt };
