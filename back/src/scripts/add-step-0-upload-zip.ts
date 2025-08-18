#!/usr/bin/env tsx

/**
 * Script pour ajouter l'étape 0 "Upload des documents" dans analysis_steps
 * Cette étape génère un ZIP avec tous les documents et l'envoie à Manus
 */

import { db } from '@/db/index';
import { analysis_steps } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

async function addStep0UploadZip() {
  try {
    console.log('🚀 Ajout de l\'étape 0 "Upload des documents" dans analysis_steps...');
    console.log('📡 Connexion à la base de données...');

    // Vérifier si l'étape 0 existe déjà
    const existingStep0 = await db
      .select()
      .from(analysis_steps)
      .where(and(
        eq(analysis_steps.order, 0),
        eq(analysis_steps.isActive, 1)
      ))
      .limit(1);

    if (existingStep0.length > 0) {
      console.log('⚠️  L\'étape 0 existe déjà dans la base de données');
      console.log('📋 Étape existante:', {
        id: existingStep0[0].id,
        name: existingStep0[0].name,
        description: existingStep0[0].description,
        order: existingStep0[0].order
      });
      return;
    }

    // Créer l'étape 0
    const newStep = await db
      .insert(analysis_steps)
      .values({
        name: 'Upload des documents',
        description: 'Génère un fichier ZIP contenant tous les documents du projet et l\'envoie à Manus pour analyse',
        prompt: 'Voici tous les documents du projet {projectUniqueId} dans une archive ZIP. Peux-tu analyser ces documents et me donner un aperçu général du projet ? Il y a {documentCount} documents au total.',
        order: 0,
        isActive: 1,
        createdAt: new Date(),
      })
      .returning();

    console.log('✅ Étape 0 créée avec succès:');
    console.log('📋 Nouvelle étape:', {
      id: newStep[0].id,
      name: newStep[0].name,
      description: newStep[0].description,
      order: newStep[0].order,
      prompt: newStep[0].prompt
    });

    console.log('🎉 Script terminé avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout de l\'étape 0:', error);
    process.exit(1);
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  console.log('🎯 Démarrage du script add-step-0-upload-zip...');
  addStep0UploadZip()
    .then(() => {
      console.log('✅ Script terminé avec succès');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erreur fatale:', error);
      process.exit(1);
    });
}

export { addStep0UploadZip };
