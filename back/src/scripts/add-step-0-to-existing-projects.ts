#!/usr/bin/env tsx

import { db } from '@/db/index';
import { projects, analysis_steps, project_analysis_progress } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

async function addStep0ToExistingProjects() {
  try {
    console.log('🔍 Vérification des projets existants...');

    // Récupérer l'étape 0
    const step0 = await db
      .select()
      .from(analysis_steps)
      .where(and(
        eq(analysis_steps.order, 0),
        eq(analysis_steps.isActive, 1)
      ))
      .limit(1);

    if (step0.length === 0) {
      console.log('❌ Étape 0 non trouvée dans analysis_steps');
      console.log('💡 Exécutez d\'abord: npx tsx src/scripts/add-step-0-upload-zip.ts');
      return;
    }

    console.log('✅ Étape 0 trouvée:', step0[0].name, '(ID:', step0[0].id + ')');

    // Récupérer tous les projets
    const allProjects = await db.select().from(projects);
    console.log('📊 Total de projets:', allProjects.length);

    let projectsWithStep0 = 0;
    let projectsWithoutStep0 = 0;
    const projectsToUpdate: string[] = [];

    // Vérifier quels projets ont déjà l'étape 0
    for (const project of allProjects) {
      const hasStep0 = await db
        .select()
        .from(project_analysis_progress)
        .where(and(
          eq(project_analysis_progress.projectId, project.id),
          eq(project_analysis_progress.stepId, step0[0].id)
        ))
        .limit(1);
      
      if (hasStep0.length > 0) {
        projectsWithStep0++;
      } else {
        projectsWithoutStep0++;
        projectsToUpdate.push(project.projectUniqueId);
        console.log('❌ Projet sans étape 0:', project.projectUniqueId);
      }
    }

    console.log('📈 Projets avec étape 0:', projectsWithStep0);
    console.log('📉 Projets sans étape 0:', projectsWithoutStep0);

    if (projectsToUpdate.length === 0) {
      console.log('✅ Tous les projets ont déjà l\'étape 0 !');
      return;
    }

    console.log(`\n🚀 Ajout de l'étape 0 à ${projectsToUpdate.length} projet(s)...`);

    // Ajouter l'étape 0 aux projets qui ne l'ont pas
    for (const projectUniqueId of projectsToUpdate) {
      const project = allProjects.find(p => p.projectUniqueId === projectUniqueId);
      if (!project) continue;

      try {
        await db
          .insert(project_analysis_progress)
          .values({
            projectId: project.id,
            stepId: step0[0].id,
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
          });

        console.log('✅ Étape 0 ajoutée au projet:', projectUniqueId);
      } catch (error) {
        console.error('❌ Erreur pour le projet', projectUniqueId + ':', error);
      }
    }

    console.log('\n🎉 Mise à jour terminée !');
    console.log('💡 L\'étape 0 devrait maintenant apparaître dans l\'interface pour tous les projets.');

  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  addStep0ToExistingProjects()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Erreur fatale:', error);
      process.exit(1);
    });
}

export { addStep0ToExistingProjects };
