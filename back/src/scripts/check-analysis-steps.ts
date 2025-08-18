#!/usr/bin/env tsx

import { db } from '@/db/index';
import { analysis_steps } from '@/db/schema';

async function checkAnalysisSteps() {
  try {
    console.log('📋 Vérification des étapes d\'analyse...');
    
    const steps = await db
      .select()
      .from(analysis_steps)
      .orderBy(analysis_steps.order);

    console.log(`\n🔍 ${steps.length} étapes trouvées:\n`);
    
    steps.forEach(step => {
      console.log(`  ${step.order}: ${step.name}`);
      console.log(`     ID: ${step.id}`);
      console.log(`     Active: ${step.isActive === 1 ? '✅' : '❌'}`);
      console.log(`     Description: ${step.description}`);
      console.log('');
    });
    
    // Vérifier spécifiquement l'étape 0
    const step0 = steps.find(s => s.order === 0);
    if (step0) {
      console.log('✅ L\'étape 0 existe dans la base de données');
    } else {
      console.log('❌ L\'étape 0 n\'existe pas dans la base de données');
      console.log('💡 Exécutez: npx tsx src/scripts/add-step-0-upload-zip.ts');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

checkAnalysisSteps();
