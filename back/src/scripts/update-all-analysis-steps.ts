#!/usr/bin/env tsx

/**
 * Script pour mettre à jour toutes les étapes d'analyse avec les nouveaux prompts
 * - Ajoute l'étape 0 si elle n'existe pas
 * - Met à jour tous les prompts existants avec les nouveaux contenus
 */

import { db } from '@/db/index';
import { analysis_steps } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// Définition des étapes avec leurs prompts
const stepsDefinitions = [
  {
    order: 0,
    name: 'Upload des documents',
    description: 'Génère un fichier ZIP contenant tous les documents du projet et l\'envoie à Manus pour analyse',
    prompt: `Peux-tu en prendre connaissance de tous les documents joints dans l'archive ZIP et me donner un aperçu général du projet ?

Une fois le traitement de TOUS les documents terminé, déclenche l'étape suivante (Analyse globale) en faisant un POST sur : {BASE_URL}/api/workflow/trigger-step-1/{projectUniqueId}`
  },
  {
    order: 1,
    name: 'Analyse globale',
    description: 'Une analyse détaillée et approfondie du projet avec vue d\'ensemble',
    prompt: `D'après les documents précédemment identifiés,

Tu es l'analyste crédit/risque automatisé de la plateforme Bricks.co, plateforme de financement participatif agréée (PSFP). 
Ton analyse couvre tous les aspects : technique, juridique, administratif, financier, business, environnemental, agissant comme un analyste pour une décision de financement. Votre approche est méthodique, identifiant forces, faiblesses, opportunités et risques.
Objectif : Fournir une analyse factuelle, structurée et exhaustive du projet immobilier pour déterminer si un projet est ÉLIGIBLE et SÉCURISÉ pour les investisseurs Bricks.co, basée UNIQUEMENT sur les documents fournis. Ne jamais inventer d'informations ; citez la source exacte (ex. : "Document X, page Y"). Signalez explicitement toute information manquante sans spéculer.

Structurez votre réponse en :
1. **Résumé du Projet** : Type d'immobilier, localisation, taille, objectifs, chronologie si applicable.
2. **Analyse Technique** : Construction (matériaux, normes), infrastructure (accès, utilities), aspects environnementaux (impact, durabilité). Notez les risques techniques.
3. **Analyse Juridique/Administrative** : Titres, contrats, permis, zonage, conformité, litiges potentiels. Identifiez les obstacles au financement.
4. **Analyse Financière** : Calculez NOI, Cap Rate, IRR, Cash Flow, coûts (acquisition, opérationnels), revenus (locatifs, vente), endettement, scénarios optimiste/pessimiste.
5. **Analyse Business/Marché** : Demande locale, concurrence, tendances économiques, positionnement, potentiel de rentabilité long terme.
6. **Risques et Mitigations** : Listez les risques (financiers, légaux, opérationnels) avec impact/probabilité et mitigations factuelles.
7. **Conclusion et Recommandations** : Évaluez la viabilité (forte/moyenne/faible), recommandez le financement (oui/non/conditionnel) avec justifications. Suggérez des investigations si données manquantes.

Soyez précis, utilisez tableaux ou bullet points, restez factuel. Concluez par 3-5 points clés pour une décision rapide.

Une fois l'analyse terminée,
Retournez votre analyse sous forme JSON structuré via POST sur l'endpoint {BASE_URL}/api/workflow/analysis-macro/{projectUniqueId} avec le format suivant :

{
  "projectUniqueId": "{projectUniqueId}",
  "macroAnalysis": "Synthèse générale du projet, sa composition, stratégie, localisation, ... pour comprendre en quelques lignes l'ensemble de l'opération."
}`
  },
  {
    order: 2,
    name: 'Consolidation des données',
    description: 'Récupère et structure toutes les données clés nécessaires à l\'analyse',
    prompt: `Extrayez et structurez toutes les données clés quantifiables du projet.

Vous devez retourner un JSON avec cette structure exacte via POST à cette URL :
{BASE_URL}/api/workflow/consolidated-data/{projectUniqueId}

{
  "projectUniqueId": "{projectUniqueId}",
  "consolidatedData": {
    "financial": {
      "acquisitionPrice": "Prix d'achat du bien en euros (nombre)",
      "acquisitionPricePerSqm": "Coût d'acquisition au m² en euros (nombre)",
      "marketPricePerSqm": "Prix de référence du marché au m² en euros (nombre) - source : outil MeilleursAgents",
      "worksCost": "Coût des travaux prévus en euros (nombre)", 
      "plannedResalePrice": "Prix de revente prévu en euros (nombre)",
      "personalContribution": "Apport personnel en euros (nombre)"
    },
    "property": {
      "livingArea": "Surface habitable en m² (nombre)",
      "monthlyRentExcludingTax": "Loyer mensuel hors taxes en euros (nombre)",
      "presoldUnits": "Nombre de logements déjà pré-vendus (nombre entier)",
      "totalUnits": "Nombre total de logements dans l'opération (nombre entier)",
      "preMarketingRate": "Taux de pré-commercialisation en pourcentage 0-100 (nombre)"
    },
    "carrier": {
      "experienceYears": "Nombre d'années d'expérience du porteur de projet (nombre entier)",
      "successfulOperations": "Nombre d'opérations immobilières réussies (nombre entier)",
      "hasActiveLitigation": "Présence de litiges en cours (true ou false)"
    },
    "company": {
      "yearsOfExistence": "Nombre d'années d'existence de la société porteuse (nombre entier)",
      "netResultYear1": "Résultat net de l'année N-1 en euros (nombre)",
      "netResultYear2": "Résultat net de l'année N-2 en euros (nombre)", 
      "netResultYear3": "Résultat net de l'année N-3 en euros (nombre)",
      "totalDebt": "Endettement total de la société en euros (nombre)",
      "equity": "Capitaux propres de la société en euros (nombre)",
      "debtRatio": "Ratio d'endettement en pourcentage 0-100 (nombre)"
    }
  }
}

IMPORTANT : 
- Remplacez chaque description par la valeur numérique extraite des documents
- Si une donnée n'est pas trouvée, utilisez null
- Pour hasActiveLitigation, utilisez true ou false (pas de guillemets)
- Les montants doivent être des nombres (pas de guillemets)`
  },
  {
    order: 3,
    name: 'Analyse de réputation',
    description: 'Analyse de réputation de la société & du porteur',
    prompt: `Analyse la société porteuse du projet et le/les porteurs de projet, et tout élément visible en ligne pertinent (avis, litiges, médias, finances apparentes, réseaux sociaux). Recherche exhaustive et récente (derniers 2-3 ans), vérifie les sources multiples, et évalue les risques pour octroyer ou non un financement.

Structure ta réponse :
Profil général : Activité, taille, historique.
Points positifs : Stabilité, réputation, croissance.
Red flags : Litiges, problèmes financiers, alertes.
Présence en ligne : Médias, avis, réseaux.
Score de risque : X/10 (justifié), niveau (faible/modéré/élevé).
Recommandation : Pour/contre financement, avec justifications factuelles.

Privilégie l'objectivité, distingue faits et suppositions, et contextualise dans le secteur [SECTEUR, ex. immobilier]. Si peu d'infos, mentionne-le explicitement.

Vous devez retourner un JSON avec cette structure exacte :
{
  "projectUniqueId": "{projectUniqueId}",
  "reputationAnalysis": {
    "projectOwners": [
      {
        "name": "Prénom NOM complet du porteur de projet tel qu'identifié dans les documents",
        "experienceYears": "Nombre d'années d'expérience dans l'immobilier (nombre entier)",
        "reputationScore": "Score de réputation de 1 à 10 basé sur l'analyse (nombre entier)",
        "reputationJustification": "Analyse détaillée de la réputation incluant : expérience professionnelle, historique des projets, succès/échecs passés, réputation auprès des partenaires, litiges éventuels, crédibilité financière, points forts et points d'attention identifiés"
      }
    ],
    "companies": [
      {
        "name": "Nom exact de la société porteuse tel qu'identifié dans les documents",
        "siret": "Numéro SIRET à 14 chiffres si disponible dans les documents (optionnel)",
        "reputationScore": "Score de réputation de 1 à 10 basé sur l'analyse (nombre entier)",
        "reputationJustification": "Analyse détaillée de la réputation incluant : historique et ancienneté, solidité financière, réputation sur le marché, projets antérieurs et leur succès, équipe dirigeante, compétences, points forts et risques identifiés"
      }
    ]
  }
}`
  },
  {
    order: 4,
    name: 'Récupération des documents manquants',
    description: 'Liste des documents attendus en complément pour approfondir l\'analyse',
    prompt: `Quels sont les documents manquants nécessaires pour approfondir l'évaluation et valider le financement ?

Une fois l'identification terminée, vous devez envoyer le résultat via POST à cette URL :
{BASE_URL}/api/workflow/missing-documents/{projectUniqueId}

Vous devez retourner un JSON avec cette structure exacte :
{
  "projectUniqueId": "{projectUniqueId}",
  "missingDocuments": [
    {
      "name": "Nom exact du document manquant",
      "whyMissing": "Explication détaillée de pourquoi ce document est nécessaire et ce qu'il apporterait à l'analyse"
    }
  ]
}

Concentrez-vous sur les documents qui permettraient de :
- Valider les chiffres financiers mentionnés
- Confirmer la faisabilité technique du projet
- Vérifier les aspects légaux et réglementaires
- Compléter l'analyse de risque
- Évaluer la solidité financière du porteur/société

Chaque document doit avoir un nom précis et une justification claire.`
  },
  {
    order: 5,
    name: 'Atouts et points de vigilance',
    description: 'Identification des forces et faiblesses principales associées à l\'opération',
    prompt: `Quels sont les risques critiques qui pourraient compromettre le financement ou la réussite du projet, ainsi que les atouts/points forts qui soutiennent sa viabilité et son succès ?

Analyse des risques : Identifiez les risques critiques en tenant compte des catégories suivantes :

Risques financiers (rentabilité, financement, cash-flow, endettement)
Risques techniques (faisabilité, coûts cachés, complexité des travaux)
Risques de marché (demande, concurrence, évolution des prix)
Risques opérationnels (délais, expertise, ressources)
Risques liés au porteur (expérience, solidité financière)
Pour chaque point de vigilance, expliquez clairement le risque, son impact potentiel, et proposez des actions concrètes pour le mitiger.


Analyse des atouts/points forts : Identifiez les forces du projet qui renforcent sa faisabilité et sa réussite, notamment :

Avantages financiers (rentabilité élevée, accès à des financements solides, modèle économique robuste)
Avantages techniques (technologies éprouvées, expertise technique, simplicité d'exécution)
Avantages de marché (forte demande, positionnement concurrentiel, tendances favorables)
Avantages opérationnels (équipe expérimentée, planification optimisée, ressources disponibles)
Atouts du porteur (expérience pertinente, réseau solide, crédibilité financière)
Pour chaque point fort, expliquez pourquoi il constitue un avantage et comment il peut être maximisé pour soutenir le projet.


Livrable : Une fois l'analyse des risques et des atouts terminée, vous devez envoyer le résultat via POST à cette URL :
{BASE_URL}/api/workflow/strengths-and-weaknesses/{projectUniqueId}
Vous devez retourner un JSON avec cette structure exacte :
json{
  "projectUniqueId": "{projectUniqueId}",
  "strengthsAndWeaknesses": [
    {
      "type": "weakness",
      "title": "Titre concis de la faiblesse/risque",
      "description": "Description détaillée du risque, de son impact potentiel, et des mesures de mitigation suggérées"
    },
    {
      "type": "strength", 
      "title": "Titre concis du point fort/atout",
      "description": "Description détaillée de l'atout, de son impact positif, et des moyens de le maximiser"
    }
  ]
}


Soyez particulièrement attentif à :

Fournir des descriptions claires et concises pour chaque point de vigilance et chaque point fort.
Proposer des actions spécifiques et réalisables pour mitiger les risques et maximiser les atouts.
Respecter strictement la structure JSON demandée.`
  },
  {
    order: 6,
    name: 'Rédaction d\'un message',
    description: 'Un message qui récapitule le projet et liste les documents manquants',
    prompt: `Rédigez un mail à destination du porteur de projet qui récapitule le projet, votre évaluation complète, et toutes les conclusions de votre analyse.

Le message doit inclure :
- Introduction et présentation du projet en quelques mots en intégrant les données clés identifiées
- Liste des documents manquants exhaustives avec justification / explications pour chacun d'eux
- Points de vigilance critiques et questions associées
- Demande de confirmation / correction des informations citées dans le message et invitation à l'ajout des documents manquants pour envoi en comité

Pas de titre, bullet point uniquement pour les documents manquants.
Le ton doit être direct et professionnel, au tutoiement, non verbeux (pas d'adjectifs inutiles).

Une fois le message rédigé, vous devez envoyer le résultat via POST à cette URL :
{BASE_URL}/api/workflow/final-message/{projectUniqueId}

Vous devez retourner un JSON avec cette structure exacte :
{
  "projectUniqueId": "{projectUniqueId}",
  "message": "Votre message complet de synthèse professionnel"
}`
  }
];

async function updateAllAnalysisSteps() {
  try {
    console.log('🚀 Mise à jour de toutes les étapes d\'analyse...');
    console.log('📡 Connexion à la base de données...');

    // Récupérer toutes les étapes existantes
    const existingSteps = await db
      .select()
      .from(analysis_steps)
      .orderBy(analysis_steps.order);

    console.log(`📋 ${existingSteps.length} étapes existantes trouvées`);

    // Traiter chaque étape définie
    for (const stepDef of stepsDefinitions) {
      const existingStep = existingSteps.find(s => s.order === stepDef.order);

      if (existingStep) {
        // Mettre à jour l'étape existante
        console.log(`🔄 Mise à jour de l'étape ${stepDef.order}: "${stepDef.name}"`);
        
        await db
          .update(analysis_steps)
          .set({
            name: stepDef.name,
            description: stepDef.description,
            prompt: stepDef.prompt
          })
          .where(eq(analysis_steps.id, existingStep.id));

        console.log(`✅ Étape ${stepDef.order} mise à jour avec succès`);
      } else {
        // Créer la nouvelle étape
        console.log(`➕ Création de l'étape ${stepDef.order}: "${stepDef.name}"`);
        
        const newStep = await db
          .insert(analysis_steps)
          .values({
            name: stepDef.name,
            description: stepDef.description,
            prompt: stepDef.prompt,
            order: stepDef.order,
            isActive: 1,
            createdAt: new Date(),
          })
          .returning();

        console.log(`✅ Étape ${stepDef.order} créée avec succès (ID: ${newStep[0].id})`);
      }
    }

    // Afficher le résultat final
    console.log('\n📋 État final des étapes d\'analyse:');
    const finalSteps = await db
      .select()
      .from(analysis_steps)
      .where(eq(analysis_steps.isActive, 1))
      .orderBy(analysis_steps.order);

    finalSteps.forEach(step => {
      console.log(`  ${step.order}. ${step.name}`);
      console.log(`     ID: ${step.id}`);
      console.log(`     Description: ${step.description}`);
      console.log('');
    });

    console.log('🎉 Toutes les étapes ont été mises à jour avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour des étapes:', error);
    process.exit(1);
  }
}

// Exécuter le script si appelé directement
if (require.main === module) {
  console.log('🎯 Démarrage du script de mise à jour des étapes d\'analyse...');
  updateAllAnalysisSteps()
    .then(() => {
      console.log('✅ Script terminé avec succès');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erreur fatale:', error);
      process.exit(1);
    });
}

export { updateAllAnalysisSteps };
