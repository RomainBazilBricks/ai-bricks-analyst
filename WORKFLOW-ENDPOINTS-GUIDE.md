# 📋 Guide des Endpoints Workflow - État des Lieux

## 🎯 Vue d'ensemble

Le système de workflow comprend **3 catégories principales** d'endpoints :
1. **Configuration & Gestion** - Gestion des étapes et du workflow
2. **Génération & Déclenchement** - Génération ZIP et déclenchement IA  
3. **Réception IA** - Endpoints appelés par l'IA externe

---

## 📁 1. CONFIGURATION & GESTION

### Gestion des étapes d'analyse

| Endpoint | Méthode | Authentification | Rôle |
|----------|---------|------------------|------|
| `/api/workflow/steps` | POST | ✅ JWT | Crée une nouvelle étape d'analyse |
| `/api/workflow/steps` | GET | ❌ Public | Récupère toutes les étapes d'analyse |
| `/api/workflow/steps/:id` | PUT | ✅ JWT | Met à jour une étape d'analyse |

### Gestion du workflow de projet

| Endpoint | Méthode | Authentification | Rôle |
|----------|---------|------------------|------|
| `/api/workflow/initiate` | POST | ✅ JWT | Initie le workflow d'analyse pour un projet |
| `/api/workflow/status/:projectUniqueId` | GET | ❌ Public | Récupère le statut du workflow |
| `/api/workflow/update-step` | POST | ✅ JWT | Met à jour le statut d'une étape |

---

## 🚀 2. GÉNÉRATION & DÉCLENCHEMENT

### ⚡ **Endpoints de Génération**

| Endpoint | Rôle | Déclenche IA ? | Usage |
|----------|------|----------------|-------|
| **`/api/workflow/generate-zip`** | 📦 **Génère SEULEMENT le ZIP** | ❌ **NON** | Régénérer un ZIP sans déclencher l'IA |
| **`/api/workflow/upload-zip-and-trigger-ai`** | 📦➡️🤖 **Génère ZIP + Déclenche IA** | ✅ **OUI** | Démarrer l'analyse complète (Étape 0) |

### 🎯 **Déclenchement Manuel**

| Endpoint | Rôle | Usage |
|----------|------|-------|
| `/api/workflow/trigger-step-1/:projectUniqueId` | 🤖 Déclenche manuellement l'étape 1 | Relancer l'analyse si nécessaire |

---

## 🤖 3. RÉCEPTION IA (Appelés par l'IA externe)

### Endpoints par étapes du workflow

| Étape | Endpoint | Rôle |
|-------|----------|------|
| **Étape 1** | `/api/workflow/step-1-overview` | Reçoit l'analyse globale |
| **Étape 1** | `/api/workflow/analysis-macro/:projectUniqueId` | Reçoit l'analyse macro structurée |
| **Étape 2** | `/api/workflow/step-2-analysis` | Reçoit la vue d'ensemble |
| **Étape 2** | `/api/workflow/consolidated-data/:projectUniqueId` | Reçoit les données consolidées |
| **Étape 3** | `/api/workflow/step-3-documents` | Reçoit l'analyse documents |
| **Étape 3** | `/api/workflow/missing-documents/:projectUniqueId` | Reçoit la liste des documents manquants |
| **Étape 4** | `/api/workflow/step-4-vigilance` | Reçoit les points de vigilance |
| **Étape 4** | `/api/workflow/strengths-and-weaknesses/:projectUniqueId` | Reçoit forces et faiblesses |
| **Étape 5** | `/api/workflow/step-5-message` | Reçoit le message final |
| **Étape 5** | `/api/workflow/final-message/:projectUniqueId` | Reçoit la synthèse finale |

---

## 🔄 4. FLUX DE TRAVAIL RECOMMANDÉ

### 📋 **Scénario 1 : Nouveau projet avec analyse complète**

```bash
# 1. Créer le projet avec documents
POST /api/projects
{
  "projectUniqueId": "PROJECT_123",
  "projectName": "Mon Projet",
  "fileUrls": ["https://..."],
  "conversation": "...",
  "fiche": "..."
}

# 2. Démarrer l'analyse complète (génère ZIP + déclenche IA)
POST /api/workflow/upload-zip-and-trigger-ai
{
  "projectUniqueId": "PROJECT_123"
}

# 3. L'IA appelle automatiquement les endpoints step-X et structured endpoints
```

### 📋 **Scénario 2 : Régénérer seulement le ZIP**

```bash
# Régénérer le ZIP sans relancer l'analyse
POST /api/workflow/generate-zip
{
  "projectUniqueId": "PROJECT_123"
}
```

### 📋 **Scénario 3 : Relancer une analyse**

```bash
# Option A: Tout relancer (ZIP + IA)
POST /api/workflow/upload-zip-and-trigger-ai
{
  "projectUniqueId": "PROJECT_123"
}

# Option B: Relancer seulement depuis l'étape 1
POST /api/workflow/trigger-step-1/PROJECT_123
```

---

## 🛠️ 5. OUTILS & DEBUG

| Endpoint | Rôle | Usage |
|----------|------|-------|
| `/api/workflow/test-prompt/:projectUniqueId?prompt=...` | 🧪 Test des placeholders dans les prompts | Debug et développement |

---

## ✅ 6. NOUVELLES FONCTIONNALITÉS AJOUTÉES

### 📝 **Champs conversation et fiche**

- ✅ **Stockage résilient** : Les champs vides/whitespace sont ignorés
- ✅ **Génération automatique** : Fichiers `conversation.txt` et `fiche.txt` dans le ZIP
- ✅ **Gestion d'erreurs** : Les erreurs ne bloquent pas la génération du ZIP

### 📦 **Génération ZIP améliorée**

- ✅ **Contenu enrichi** : Documents + conversation.txt + fiche.txt
- ✅ **Introductions personnalisées** pour chaque fichier texte
- ✅ **Résilience** : Continue même si certains fichiers échouent

---

## 🚨 7. POINTS D'ATTENTION

### ⚠️ **Différences importantes**
- **`generate-zip`** : ZIP seulement, aucune IA déclenchée
- **`upload-zip-and-trigger-ai`** : ZIP + déclenchement complet de l'IA

### ⚠️ **Authentification**
- Endpoints de **gestion** : JWT requis
- Endpoints **IA** et **génération** : Publics (pour intégrations externes)

---

## 📞 8. EXEMPLES D'UTILISATION

### Génération ZIP seule
```bash
curl -X POST http://localhost:3001/api/workflow/generate-zip \
  -H "Content-Type: application/json" \
  -d '{"projectUniqueId": "PROJECT_123"}'
```

### Démarrer analyse complète
```bash
curl -X POST http://localhost:3001/api/workflow/upload-zip-and-trigger-ai \
  -H "Content-Type: application/json" \
  -d '{"projectUniqueId": "PROJECT_123"}'
```

### Vérifier le statut
```bash
curl http://localhost:3001/api/workflow/status/PROJECT_123
```

---

*Dernière mise à jour : 19/08/2025 - Version avec support conversation/fiche*
