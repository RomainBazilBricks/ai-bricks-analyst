# Guide d'intégration IA - Workflow d'analyse de projets

Ce document décrit comment l'IA doit interagir avec l'API pour fournir des analyses structurées de projets d'investissement.

## Vue d'ensemble du workflow

Le workflow d'analyse se déroule en 4 étapes séquentielles :

1. **Analyse macro** - Vue d'ensemble des risques et opportunités
2. **Analyse détaillée** - Analyse approfondie par domaines
3. **Documents manquants** - Identification des documents requis
4. **Points de vigilance** - Identification des risques critiques

## Prompts d'analyse existants

Vos prompts actuels en base de données sont mappés aux nouvelles étapes structurées :

### Étape 1 : Analyse Macro
**Prompt original :** "Analyse globale"
```
Réalisez une analyse détaillée et structurée du projet d'investissement. Incluez : 1) Analyse financière (rentabilité, cash-flow, ROI), 2) Analyse du marché local, 3) Évaluation des risques, 4) Points forts et faiblesses, 5) Recommandations stratégiques. Soyez précis et utilisez les données des documents fournis.
```

**Nouveau format structuré :** L'IA doit maintenant retourner cette analyse sous forme JSON structuré avec les champs `overallRisk`, `marketPotential`, `technicalFeasibility`, etc.

### Étape 2 : Analyse Détaillée  
**Prompt original :** "Vue d'ensemble du projet"
```
Analysez les documents fournis et rédigez une vue d'ensemble concise du projet d'investissement immobilier en 3-5 lignes maximum. Focalisez-vous sur les éléments clés : type de bien, localisation, objectif d'investissement et rentabilité attendue.
```

**Nouveau format structuré :** L'IA doit maintenant détailler l'analyse en sections : `businessModel`, `marketAnalysis`, `technicalAnalysis`, `financialProjections`, `teamAssessment`.

### Étape 3 : Documents Manquants
**Prompt original :** "Récupération des documents manquants"
```
Identifiez et listez tous les documents manquants qui seraient nécessaires pour compléter l'analyse de ce projet d'investissement immobilier. Organisez-les par catégorie (financier, juridique, technique, marché) et précisez l'importance de chaque document pour la prise de décision.
```

**Nouveau format structuré :** L'IA doit maintenant structurer chaque document avec `name`, `whyMissing`, `priority`, `category`, `impactOnProject`, `suggestedSources`.

### Étape 4 : Points de Vigilance
**Prompt original :** "Points de vigilance"
```
Analysez le projet d'investissement immobilier et identifiez tous les points de vigilance critiques qui pourraient compromettre l'obtention du financement. Organisez votre analyse en catégories : 1) Risques financiers (ratio d'endettement, capacité de remboursement, apport personnel), 2) Risques juridiques (servitudes, litiges, conformité), 3) Risques techniques (état du bien, travaux nécessaires, diagnostics), 4) Risques de marché (localisation, évolution des prix, demande locative). Pour chaque point, évaluez le niveau de criticité et proposez des solutions ou documents complémentaires.
```

**Nouveau format structuré :** L'IA doit maintenant structurer chaque point avec `title`, `whyVigilance`, `riskLevel`, `category`, `potentialImpact`, `mitigationStrategies`, `monitoringRecommendations`.

### Étape 5 : Message de synthèse (optionnelle)
**Prompt original :** "Rédaction d'un message"
```
Rédigez un message de synthèse professionnel destiné au client qui : 1) Récapitule le projet en quelques phrases, 2) Présente les conclusions principales de l'analyse, 3) Liste clairement les documents manquants requis, 4) Propose les prochaines étapes. Le ton doit être professionnel mais accessible.
```

**Note :** Cette étape reste en format texte libre via l'ancien système d'endpoints.

## Endpoints d'intégration

Base URL : `https://votre-api.com/api/workflow`

### 1. Analyse Macro

**POST** `/analysis-macro/{projectUniqueId}`

```json
{
  "projectUniqueId": "PROJ_001",
  "macroAnalysis": {
    "overallRisk": "medium",
    "marketPotential": "high", 
    "technicalFeasibility": "high",
    "financialViability": "medium",
    "competitiveAdvantage": "medium",
    "summary": "Projet d'investissement immobilier locatif avec un potentiel de rentabilité intéressant mais nécessitant une attention particulière sur la structure de financement.",
    "keyStrengths": [
      "Localisation attractive en centre-ville",
      "Demande locative forte dans la zone",
      "Prix d'acquisition compétitif par rapport au marché"
    ],
    "keyWeaknesses": [
      "Travaux de rénovation importants nécessaires",
      "Apport personnel limité (15% du montant total)",
      "Absence d'expérience préalable en investissement locatif"
    ],
    "recommendedActions": [
      "Obtenir plusieurs devis détaillés pour les travaux",
      "Étudier les dispositifs d'aide au financement",
      "Consulter un expert en fiscalité immobilière"
    ]
  }
}
```

**Réponse attendue :**
```json
{
  "success": true,
  "message": "Analyse macro reçue et enregistrée avec succès",
  "workflowStepId": "uuid-step-id",
  "data": { /* macroAnalysis object */ }
}
```

### 2. Analyse Détaillée

**POST** `/analysis-description/{projectUniqueId}`

```json
{
  "projectUniqueId": "PROJ_001",
  "detailedAnalysis": {
    "businessModel": {
      "description": "Investissement locatif résidentiel avec stratégie de location longue durée",
      "revenueStreams": [
        "Loyers mensuels",
        "Plus-value à la revente potentielle"
      ],
      "keyPartners": [
        "Agence immobilière de gestion",
        "Artisans pour les travaux",
        "Banque financeuse"
      ],
      "valueProposition": "Génération de revenus passifs avec valorisation du capital à long terme"
    },
    "marketAnalysis": {
      "targetMarket": "Jeunes actifs et étudiants, marché locatif tendu",
      "marketSize": "Zone avec 12% de taux de vacance, demande supérieure à l'offre",
      "competitorAnalysis": "Prix de location 15% inférieurs à la moyenne du secteur après rénovation",
      "marketTrends": [
        "Augmentation constante des prix immobiliers (+3% par an)",
        "Demande locative croissante due à l'urbanisation",
        "Réglementation favorable aux investisseurs (Pinel, etc.)"
      ]
    },
    "technicalAnalysis": {
      "technologyStack": [
        "Système de chauffage moderne",
        "Isolation thermique renforcée",
        "Domotique basique"
      ],
      "technicalRisks": [
        "Vétusté de la plomberie",
        "Électricité non conforme aux normes actuelles"
      ],
      "developmentTimeline": "3 mois de travaux avant mise en location",
      "scalabilityAssessment": "Potentiel d'acquisition d'autres biens dans le même secteur"
    },
    "financialProjections": {
      "revenueProjection": "1 200€/mois de loyer net, soit 14 400€/an",
      "costStructure": "Charges copropriété (150€/mois), taxe foncière (800€/an), assurance (300€/an)",
      "breakEvenAnalysis": "Rentabilité nette de 4.2% après charges et fiscalité",
      "fundingRequirements": "Apport de 45 000€ + frais de notaire et travaux (15 000€)"
    },
    "teamAssessment": {
      "keyPersonnel": [
        "Investisseur principal (profil cadre, revenus stables)",
        "Gestionnaire immobilier partenaire"
      ],
      "skillsGaps": [
        "Manque d'expérience en gestion locative",
        "Connaissance limitée de la fiscalité immobilière"
      ],
      "organizationalStructure": "Structure simple : propriétaire unique avec délégation de gestion"
    }
  }
}
```

### 3. Documents Manquants

**POST** `/missing-documents/{projectUniqueId}`

```json
{
  "projectUniqueId": "PROJ_001",
  "missingDocuments": [
    {
      "name": "Diagnostic technique complet",
      "whyMissing": "Nécessaire pour évaluer précisément les coûts de rénovation",
      "priority": "high",
      "category": "technical",
      "impactOnProject": "Impact direct sur le budget travaux et la rentabilité finale",
      "suggestedSources": [
        "Bureau d'études techniques",
        "Diagnostiqueur immobilier certifié"
      ]
    },
    {
      "name": "Étude de marché locatif local",
      "whyMissing": "Pour valider les hypothèses de loyer et taux de vacance",
      "priority": "medium",
      "category": "business",
      "impactOnProject": "Validation des projections de revenus locatifs",
      "suggestedSources": [
        "Observatoire des loyers local",
        "Agences immobilières du secteur"
      ]
    },
    {
      "name": "Simulation fiscale détaillée",
      "whyMissing": "Pour optimiser la structure juridique et fiscale",
      "priority": "medium",
      "category": "legal",
      "impactOnProject": "Optimisation de la rentabilité nette après impôts",
      "suggestedSources": [
        "Expert-comptable spécialisé",
        "Conseiller en gestion de patrimoine"
      ]
    }
  ]
}
```

### 4. Points de Vigilance

**POST** `/vigilance-points/{projectUniqueId}`

```json
{
  "projectUniqueId": "PROJ_001",
  "vigilancePoints": [
    {
      "title": "Ratio d'endettement élevé",
      "whyVigilance": "L'endettement global atteindra 85% avec ce projet, proche des limites bancaires",
      "riskLevel": "high",
      "category": "financial",
      "potentialImpact": "Risque de refus de financement ou conditions dégradées",
      "mitigationStrategies": [
        "Négocier un différé de remboursement partiel",
        "Rechercher un co-emprunteur",
        "Augmenter l'apport personnel"
      ],
      "monitoringRecommendations": [
        "Suivre mensuellement le taux d'endettement",
        "Anticiper les échéances importantes"
      ]
    },
    {
      "title": "Travaux de rénovation sous-estimés",
      "whyVigilance": "Budget travaux basé sur une estimation visuelle, risque de dépassement",
      "riskLevel": "medium",
      "category": "technical",
      "potentialImpact": "Dépassement budgétaire pouvant affecter la rentabilité",
      "mitigationStrategies": [
        "Obtenir 3 devis détaillés minimum",
        "Prévoir une marge de sécurité de 20%",
        "Échelonner les travaux si possible"
      ],
      "monitoringRecommendations": [
        "Suivi hebdomadaire de l'avancement des travaux",
        "Contrôle qualité par un maître d'œuvre"
      ]
    }
  ]
}
```

## Gestion des erreurs

En cas d'erreur, l'API retournera :

```json
{
  "error": "Description de l'erreur",
  "code": "ERROR_CODE"
}
```

Codes d'erreur courants :
- `PROJECT_NOT_FOUND` : Projet non trouvé
- `WORKFLOW_STEP_NOT_FOUND` : Étape de workflow non initialisée
- `VALIDATION_ERROR` : Données invalides

## Workflow recommandé pour l'IA

1. **Vérifier** que le projet existe avant d'envoyer les analyses
2. **Respecter l'ordre** des étapes (1 → 2 → 3 → 4)
3. **Valider** que chaque étape précédente est complétée
4. **Gérer les erreurs** et retry en cas de problème réseau
5. **Logger** les réponses pour traçabilité

## Migration depuis les anciens prompts

### Comment adapter vos analyses existantes

Pour migrer depuis l'ancien système vers les nouveaux endpoints structurés :

#### 1. Analyse Macro (Étape 1)
**Ancien prompt :** Analyse globale en texte libre
**Nouveau format :** Structurer la réponse en JSON avec :
```javascript
// Au lieu de retourner du texte libre, structurer ainsi :
{
  "overallRisk": "medium", // Évaluer le risque global
  "marketPotential": "high", // Potentiel de marché
  "technicalFeasibility": "high", // Faisabilité technique
  "financialViability": "medium", // Viabilité financière
  "competitiveAdvantage": "medium", // Avantage concurrentiel
  "summary": "Votre analyse globale en résumé",
  "keyStrengths": ["Point fort 1", "Point fort 2"],
  "keyWeaknesses": ["Point faible 1", "Point faible 2"],
  "recommendedActions": ["Action 1", "Action 2"]
}
```

#### 2. Analyse Détaillée (Étape 2)  
**Ancien prompt :** Vue d'ensemble concise
**Nouveau format :** Développer l'analyse en sections détaillées :
```javascript
{
  "businessModel": {
    "description": "Description du modèle économique",
    "revenueStreams": ["Source 1", "Source 2"],
    // ...
  },
  "marketAnalysis": {
    "targetMarket": "Description du marché cible",
    // ...
  }
  // ... autres sections
}
```

#### 3. Documents Manquants (Étape 3)
**Ancien prompt :** Liste par catégories
**Nouveau format :** Structurer chaque document :
```javascript
{
  "missingDocuments": [
    {
      "name": "Nom du document",
      "whyMissing": "Pourquoi il manque",
      "priority": "high|medium|low",
      "category": "legal|financial|technical|business|regulatory",
      "impactOnProject": "Impact sur le projet",
      "suggestedSources": ["Source 1", "Source 2"]
    }
  ]
}
```

#### 4. Points de Vigilance (Étape 4)
**Ancien prompt :** Analyse par catégories de risques
**Nouveau format :** Structurer chaque point :
```javascript
{
  "vigilancePoints": [
    {
      "title": "Titre du point de vigilance",
      "whyVigilance": "Raison de la vigilance",
      "riskLevel": "high|medium|low",
      "category": "financial|technical|legal|market|operational|regulatory",
      "potentialImpact": "Impact potentiel",
      "mitigationStrategies": ["Stratégie 1", "Stratégie 2"],
      "monitoringRecommendations": ["Recommandation 1", "Recommandation 2"]
    }
  ]
}
```

### Endpoints de transition

Pendant la migration, vous pouvez utiliser :
- **Anciens endpoints** : `/api/workflow/step-1-overview`, `/api/workflow/step-2-analysis`, etc. (format texte libre)
- **Nouveaux endpoints** : `/api/workflow/analysis-macro/{id}`, `/api/workflow/analysis-description/{id}`, etc. (format JSON structuré)

### Récupération des prompts depuis la base

Pour récupérer vos prompts existants via API :
```bash
GET /api/workflow/steps
```

Réponse :
```json
[
  {
    "id": 1,
    "name": "Analyse globale",
    "description": "Une analyse détaillée et approfondie du projet",
    "prompt": "Réalisez une analyse détaillée et structurée...",
    "order": 1,
    "isActive": 1
  }
  // ... autres étapes
]
```

## Contraintes et limites

- **Taille maximale** : 10MB par payload JSON
- **Timeout** : 30 secondes par requête
- **Rate limiting** : 100 requêtes/minute par IP
- **Authentification** : Aucune (endpoints publics pour l'IA)

## Exemples d'utilisation

### Curl
```bash
curl -X POST "https://api.example.com/api/workflow/analysis-macro/PROJ_001" \
  -H "Content-Type: application/json" \
  -d @analysis-macro-payload.json
```

### Python
```python
import requests
import json

payload = {
  "projectUniqueId": "PROJ_001",
  "macroAnalysis": {
    # ... données d'analyse
  }
}

response = requests.post(
  "https://api.example.com/api/workflow/analysis-macro/PROJ_001",
  json=payload
)

if response.status_code == 200:
  print("Analyse envoyée avec succès")
else:
  print(f"Erreur: {response.json()}")
```

## Prompts enrichis pour l'IA

### Instructions complètes par étape

#### Étape 1 : Analyse Macro
```
Réalisez une analyse détaillée et structurée du projet d'investissement. Incluez : 1) Analyse financière (rentabilité, cash-flow, ROI), 2) Analyse du marché local, 3) Évaluation des risques, 4) Points forts et faiblesses, 5) Recommandations stratégiques. Soyez précis et utilisez les données des documents fournis.

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
}
```

#### Étape 2 : Analyse Détaillée
```
Analysez les documents fournis et rédigez une vue d'ensemble concise du projet d'investissement immobilier en 3-5 lignes maximum. Focalisez-vous sur les éléments clés : type de bien, localisation, objectif d'investissement et rentabilité attendue.

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
}
```

#### Étape 3 : Documents Manquants
```
Identifiez et listez tous les documents manquants qui seraient nécessaires pour compléter l'analyse de ce projet d'investissement immobilier. Organisez-les par catégorie (financier, juridique, technique, marché) et précisez l'importance de chaque document pour la prise de décision.

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
}
```

#### Étape 4 : Points de Vigilance
```
Analysez le projet d'investissement immobilier et identifiez tous les points de vigilance critiques qui pourraient compromettre l'obtention du financement. Organisez votre analyse en catégories : 1) Risques financiers (ratio d'endettement, capacité de remboursement, apport personnel), 2) Risques juridiques (servitudes, litiges, conformité), 3) Risques techniques (état du bien, travaux nécessaires, diagnostics), 4) Risques de marché (localisation, évolution des prix, demande locative). Pour chaque point, évaluez le niveau de criticité et proposez des solutions ou documents complémentaires.

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
}
```

## Support et contact

Pour toute question sur l'intégration, contacter l'équipe technique à : tech@example.com 