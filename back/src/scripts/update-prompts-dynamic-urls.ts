#!/usr/bin/env tsx

import { db } from '@/db/index';
import { analysis_steps } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Script pour mettre à jour tous les prompts avec des URLs dynamiques
 * Remplace les URLs hardcodées par des placeholders {BASE_URL}
 */
async function updatePromptsDynamicUrls() {
  try {
    console.log('🔄 Mise à jour des prompts avec URLs dynamiques...');

    // Étape 0: Upload des documents
    const step0Prompt = `Voici tous les documents du projet {projectUniqueId} dans une archive ZIP. Peux-tu analyser ces documents et me donner un aperçu général du projet ? Il y a {documentCount} documents au total.

Une fois ton analyse terminée, déclenche l'étape suivante (Analyse globale) en faisant un POST sur : {BASE_URL}/api/workflow/trigger-step-1/{projectUniqueId}

Ce POST marquera automatiquement cette étape comme terminée et déclenchera l'analyse globale.`;

    await db
      .update(analysis_steps)
      .set({ prompt: step0Prompt })
      .where(and(
        eq(analysis_steps.order, 0),
        eq(analysis_steps.isActive, 1)
      ));

    console.log('✅ Étape 0 (Upload des documents) mise à jour');

    // Étape 1: Analyse globale
    const step1Prompt = `Réalisez une analyse détaillée et structurée du projet d'investissement. Incluez : 1) Analyse financière (rentabilité, cash-flow, ROI), 2) Analyse du marché local, 3) Évaluation des risques, 4) Points forts et faiblesses, 5) Recommandations stratégiques. Soyez précis et utilisez les données des documents fournis.

IMPORTANT: Retournez votre analyse sous forme JSON structuré via POST sur l'endpoint {BASE_URL}/api/workflow/analysis-macro/{projectUniqueId} avec le format suivant :

{
  "projectUniqueId": "{projectUniqueId}",
  "macroAnalysis": {
    "overallRisk": "low|medium|high",
    "marketPotential": "low|medium|high",
    "technicalFeasibility": "low|medium|high",
    "financialViability": "low|medium|high",
    "competitiveAdvantage": "low|medium|high",
    "summary": "Résumé de votre analyse globale",
    "keyStrengths": ["Point fort 1", "Point fort 2", ...],
    "keyWeaknesses": ["Point faible 1", "Point faible 2", ...],
    "recommendedActions": ["Action recommandée 1", "Action recommandée 2", ...]
  }
}`;

    await db
      .update(analysis_steps)
      .set({ prompt: step1Prompt })
      .where(eq(analysis_steps.name, 'Analyse globale'));

    console.log('✅ Étape 1 (Analyse globale) mise à jour');

    // Étape 2: Consolidation des données
    const step2Prompt = `Analysez les documents fournis et consolidez toutes les données clés du projet. Structurez les informations de manière claire et organisée.

IMPORTANT: Envoyez les données consolidées via POST sur l'endpoint {BASE_URL}/api/workflow/consolidated-data/{projectUniqueId} avec le format JSON approprié.`;

    await db
      .update(analysis_steps)
      .set({ prompt: step2Prompt })
      .where(eq(analysis_steps.name, 'Consolidation des données'));

    console.log('✅ Étape 2 (Consolidation des données) mise à jour');

    // Étape 3: Récupération des documents manquants
    const step3Prompt = `Identifiez et listez tous les documents manquants qui seraient nécessaires pour compléter l'analyse de ce projet d'investissement immobilier. Organisez-les par catégorie (financier, juridique, technique, marché) et précisez l'importance de chaque document pour la prise de décision.

IMPORTANT: Structurez votre liste via POST sur l'endpoint {BASE_URL}/api/workflow/missing-documents/{projectUniqueId} avec le format suivant :

{
  "projectUniqueId": "{projectUniqueId}",
  "missingDocuments": [
    {
      "name": "Nom précis du document",
      "whyMissing": "Explication de pourquoi ce document est nécessaire",
      "priority": "high|medium|low",
      "category": "legal|financial|technical|business|regulatory",
      "impactOnProject": "Impact de l'absence de ce document sur le projet",
      "suggestedSources": ["Source suggérée 1", "Source suggérée 2"]
    }
  ]
}`;

    await db
      .update(analysis_steps)
      .set({ prompt: step3Prompt })
      .where(eq(analysis_steps.name, 'Récupération des documents manquants'));

    console.log('✅ Étape 3 (Documents manquants) mise à jour');

    // Étape 4: Points de vigilance
    const step4Prompt = `Analysez le projet d'investissement immobilier et identifiez tous les points de vigilance critiques qui pourraient compromettre l'obtention du financement. Organisez votre analyse en catégories : 1) Risques financiers (ratio d'endettement, capacité de remboursement, apport personnel), 2) Risques juridiques (servitudes, litiges, conformité), 3) Risques techniques (état du bien, travaux nécessaires, diagnostics), 4) Risques de marché (localisation, évolution des prix, demande locative). Pour chaque point, évaluez le niveau de criticité et proposez des solutions ou documents complémentaires.

IMPORTANT: Structurez vos points de vigilance via POST sur l'endpoint {BASE_URL}/api/workflow/vigilance-points/{projectUniqueId} avec le format suivant :

{
  "projectUniqueId": "{projectUniqueId}",
  "vigilancePoints": [
    {
      "title": "Titre concis du point de vigilance",
      "whyVigilance": "Explication détaillée de la raison de vigilance",
      "riskLevel": "high|medium|low",
      "category": "financial|technical|legal|market|operational|regulatory",
      "potentialImpact": "Impact potentiel sur le projet",
      "mitigationStrategies": ["Stratégie d'atténuation 1", "Stratégie d'atténuation 2"],
      "monitoringRecommendations": ["Recommandation de suivi 1", "Recommandation de suivi 2"]
    }
  ]
}`;

    await db
      .update(analysis_steps)
      .set({ prompt: step4Prompt })
      .where(eq(analysis_steps.name, 'Points de vigilance'));

    console.log('✅ Étape 4 (Points de vigilance) mise à jour');

    // Étape 5: Rédaction d'un message (pas de changement nécessaire)
    console.log('ℹ️ Étape 5 (Rédaction d\'un message) conservée tel quel');

    console.log('🎉 Tous les prompts ont été mis à jour avec des URLs dynamiques !');
    console.log('📝 Les URLs seront maintenant remplacées automatiquement selon l\'environnement :');
    console.log('   - Production: https://ai-bricks-analyst-production.up.railway.app');
    console.log('   - Preprod: https://ai-bricks-analyst-preprod.up.railway.app');
    console.log('   - Local: selon la variable BASE_URL');

  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour des prompts:', error);
    throw error;
  }
}

// Exécution du script si appelé directement
if (require.main === module) {
  updatePromptsDynamicUrls()
    .then(() => {
      console.log('Migration terminée');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration échouée:', error);
      process.exit(1);
    });
}

export { updatePromptsDynamicUrls };
