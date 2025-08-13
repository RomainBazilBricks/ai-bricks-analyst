import { db } from '../db/index';
import { analysis_steps } from '../db/schema';
import { eq } from 'drizzle-orm';

/**
 * Script de migration pour mettre à jour les prompts existants avec les instructions JSON
 */
export const updateExistingPrompts = async (): Promise<void> => {
  try {
    console.log('🔄 Début de la mise à jour des prompts existants...');

    // Prompt 1: Analyse globale
    await db
      .update(analysis_steps)
      .set({
        prompt: `Réalisez une analyse détaillée et structurée du projet d'investissement. Incluez : 1) Analyse financière (rentabilité, cash-flow, ROI), 2) Analyse du marché local, 3) Évaluation des risques, 4) Points forts et faiblesses, 5) Recommandations stratégiques. Soyez précis et utilisez les données des documents fournis.

IMPORTANT: Retournez votre analyse sous forme JSON structuré via POST sur l'endpoint /api/workflow/analysis-macro/{projectUniqueId} avec le format suivant :

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
}`
      })
      .where(eq(analysis_steps.name, 'Analyse globale'));

    console.log('✅ Prompt "Analyse globale" mis à jour');

    // Prompt 2: Vue d'ensemble du projet
    await db
      .update(analysis_steps)
      .set({
        prompt: `Analysez les documents fournis et rédigez une vue d'ensemble concise du projet d'investissement immobilier en 3-5 lignes maximum. Focalisez-vous sur les éléments clés : type de bien, localisation, objectif d'investissement et rentabilité attendue.

IMPORTANT: Développez maintenant cette analyse en sections détaillées via POST sur l'endpoint /api/workflow/analysis-description/{projectUniqueId} avec le format suivant :

{
  "projectUniqueId": "{projectUniqueId}",
  "detailedAnalysis": {
    "businessModel": {
      "description": "Description détaillée du modèle économique",
      "revenueStreams": ["Source de revenus 1", "Source de revenus 2"],
      "keyPartners": ["Partenaire clé 1", "Partenaire clé 2"],
      "valueProposition": "Proposition de valeur principale"
    },
    "marketAnalysis": {
      "targetMarket": "Description du marché cible",
      "marketSize": "Taille et caractéristiques du marché",
      "competitorAnalysis": "Analyse concurrentielle",
      "marketTrends": ["Tendance 1", "Tendance 2"]
    },
    "technicalAnalysis": {
      "technologyStack": ["Technologie 1", "Technologie 2"],
      "technicalRisks": ["Risque technique 1", "Risque technique 2"],
      "developmentTimeline": "Planning de développement",
      "scalabilityAssessment": "Évaluation de la scalabilité"
    },
    "financialProjections": {
      "revenueProjection": "Projections de revenus détaillées",
      "costStructure": "Structure des coûts",
      "breakEvenAnalysis": "Analyse de seuil de rentabilité",
      "fundingRequirements": "Besoins de financement"
    },
    "teamAssessment": {
      "keyPersonnel": ["Personnel clé 1", "Personnel clé 2"],
      "skillsGaps": ["Lacune 1", "Lacune 2"],
      "organizationalStructure": "Structure organisationnelle"
    }
  }
}`
      })
      .where(eq(analysis_steps.name, 'Vue d\'ensemble du projet'));

    console.log('✅ Prompt "Vue d\'ensemble du projet" mis à jour');

    // Prompt 3: Récupération des documents manquants
    await db
      .update(analysis_steps)
      .set({
        prompt: `Identifiez et listez tous les documents manquants qui seraient nécessaires pour compléter l'analyse de ce projet d'investissement immobilier. Organisez-les par catégorie (financier, juridique, technique, marché) et précisez l'importance de chaque document pour la prise de décision.

IMPORTANT: Structurez votre liste via POST sur l'endpoint /api/workflow/missing-documents/{projectUniqueId} avec le format suivant :

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
}`
      })
      .where(eq(analysis_steps.name, 'Récupération des documents manquants'));

    console.log('✅ Prompt "Récupération des documents manquants" mis à jour');

    // Prompt 4: Points de vigilance
    await db
      .update(analysis_steps)
      .set({
        prompt: `Analysez le projet d'investissement immobilier et identifiez tous les points de vigilance critiques qui pourraient compromettre l'obtention du financement. Organisez votre analyse en catégories : 1) Risques financiers (ratio d'endettement, capacité de remboursement, apport personnel), 2) Risques juridiques (servitudes, litiges, conformité), 3) Risques techniques (état du bien, travaux nécessaires, diagnostics), 4) Risques de marché (localisation, évolution des prix, demande locative). Pour chaque point, évaluez le niveau de criticité et proposez des solutions ou documents complémentaires.

IMPORTANT: Structurez vos points de vigilance via POST sur l'endpoint /api/workflow/vigilance-points/{projectUniqueId} avec le format suivant :

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
}`
      })
      .where(eq(analysis_steps.name, 'Points de vigilance'));

    console.log('✅ Prompt "Points de vigilance" mis à jour');

    // Laisser le prompt "Rédaction d'un message" inchangé (étape 5)
    console.log('ℹ️ Prompt "Rédaction d\'un message" conservé tel quel (format texte libre)');

    console.log('🎉 Mise à jour des prompts terminée avec succès !');
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour des prompts:', error);
    throw error;
  }
};

// Exécution du script si appelé directement
if (require.main === module) {
  updateExistingPrompts()
    .then(() => {
      console.log('Migration terminée');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration échouée:', error);
      process.exit(1);
    });
} 