# 🚨 Guide des Notifications Slack - AI Bricks Analyst

## 📋 Vue d'ensemble

Ce système de notifications Slack permet de recevoir des alertes en temps réel pour les erreurs critiques du workflow d'analyse IA. Il couvre **11 points critiques** identifiés dans le funnel complet.

## 🔧 Configuration

### 1. Variables d'environnement

Ajoutez ces variables à votre fichier `.env` :

```bash
# Configuration Slack
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_APP_TOKEN=xapp-your-app-token  # Optionnel

# Canaux Slack
SLACK_CHANNEL_ANALYSIS_ALERTS=#alertes-analyse-ia
SLACK_CHANNEL_SYSTEM_ALERTS=#alertes-systeme
SLACK_CHANNEL_GENERAL=#bot-notifications
SLACK_CHANNEL_TEST=#test-bot
```

### 2. Configuration du Bot Slack

1. **Créer une app Slack** sur https://api.slack.com/apps
2. **Configurer les permissions** (OAuth & Permissions) :
   - `chat:write` - Envoyer des messages
   - `chat:write.public` - Envoyer dans les canaux publics
3. **Installer l'app** dans votre workspace
4. **Récupérer les tokens** depuis la page de l'app

## 🚨 Types d'Alertes Implémentées

### Phase 1 : Création et Upload
- **ALERTE 1** - Échec conversion S3 des documents
- **ALERTE 2** - Échec génération ZIP

### Phase 2 : Workflow et Retries
- **ALERTE 3** - Échec définitif après épuisement des retries
- **ALERTE 4** - Échec Étape 2 (Consolidation données)
- **ALERTE 4-BIS** - Échec Étape 3 (Analyse réputation)
- **ALERTE 5** - Échec Étape 4 (Documents manquants)
- **ALERTE 6** - Échec Étape 5 (Atouts & vigilance)
- **ALERTE 7** - Échec Étape 6 (Message final)

### Phase 3 : Erreurs Système
- **ALERTE 8** - Erreur système critique (BDD)
- **ALERTE 9** - API IA inaccessible
- **ALERTE 10** - Erreur stockage S3

## 🧪 Tests et Validation

### Endpoints de test disponibles

```bash
# Tester la connexion Slack
GET /api/slack/test-connection

# Envoyer un message de test
POST /api/slack/test-message
{
  "message": "Test de notification",
  "channel": "#test-bot"
}

# Tester toutes les alertes
POST /api/slack/test-alerts

# Tester une alerte spécifique
POST /api/slack/test-alert/document-upload
{
  "projectId": "TEST_123",
  "projectName": "Projet Test",
  "message": "Test d'erreur de conversion"
}
```

### Types d'alertes testables

- `document-upload` - Erreur conversion S3
- `zip-generation` - Erreur génération ZIP
- `workflow-retry` - Échec après retries
- `step-failure` - Échec d'une étape
- `ai-connection` - Erreur API IA
- `database` - Erreur base de données
- `storage` - Erreur stockage S3

## 📊 Format des Messages

### Exemple de message d'alerte critique

```
🚨 **ALERTE 3 - Échec définitif workflow**
📁 Projet: <https://app.com/projects/PROJECT_123|Mon Super Projet>
🔧 Étape: Analyse globale
❌ 3 tentatives épuisées
⚠️ Impact: Workflow complètement bloqué, intervention manuelle requise
```

### Exemple de message d'erreur système

```
🚨 **ALERTE 9 - API IA inaccessible**
📁 Projet: Mon Super Projet
💥 `Connection refused: ECONNREFUSED`
⚠️ Impact: Aucune analyse possible, workflow impossible
```

## 🔧 Utilisation dans le Code

### Méthode simple avec helpers

```typescript
import { sendSlackErrorNotification } from '@/lib/slack-helpers';
import { ErrorType, AlertPriority } from '@/config/slack.config';

// Erreur simple
await sendSlackErrorNotification(
  projectUniqueId,
  projectName,
  ErrorType.DOCUMENT_UPLOAD,
  'Erreur de conversion S3',
  {
    priority: AlertPriority.HIGH,
    additionalData: { documentIndex: 1, totalDocuments: 5 }
  }
);

// Erreur d'étape avec retry
await sendSlackErrorNotification(
  projectUniqueId,
  projectName,
  ErrorType.STEP_FAILURE,
  'Échec analyse réputation',
  {
    priority: AlertPriority.CRITICAL,
    stepName: 'Analyse de réputation',
    stepOrder: 3,
    retryCount: 2,
    maxRetries: 3
  }
);
```

### Méthode avancée avec service complet

```typescript
import { slackNotificationService } from '@/services/slack-notification.service';

await slackNotificationService.sendErrorNotification({
  project: {
    projectUniqueId: 'PROJECT_123',
    projectName: 'Mon Projet',
    projectUrl: 'https://app.com/projects/PROJECT_123'
  },
  workflow: {
    stepId: 2,
    stepName: 'Consolidation des données',
    stepOrder: 2,
    retryCount: 1,
    maxRetries: 3
  },
  error: {
    errorType: ErrorType.STEP_FAILURE,
    priority: AlertPriority.CRITICAL,
    errorMessage: 'Timeout de 10 minutes dépassé'
  }
});
```

## 🛠️ Points d'Intégration Actuels

### Controllers modifiés

1. **`projects.controller.ts`**
   - Erreur de création projet (ligne ~450)
   - Erreur conversion S3 (ligne ~335)

2. **`workflow.controller.ts`**
   - Échec définitif après retries (ligne ~190)
   - Erreur connexion API IA (ligne ~130)
   - Erreur génération ZIP (ligne ~2600)

### Nouveaux fichiers ajoutés

- `src/config/slack.config.ts` - Configuration Slack
- `src/services/slack-notification.service.ts` - Service principal
- `src/lib/slack-helpers.ts` - Helpers utilitaires
- `src/controllers/slack-test.controller.ts` - Tests
- `src/routes/slack-test.routes.ts` - Routes de test
- `shared/types/slack.d.ts` - Types TypeScript

## 🚀 Déploiement

### 1. Installation des dépendances

```bash
cd back
npm install @slack/web-api
```

### 2. Configuration des variables

Ajoutez les variables Slack à votre environnement de production.

### 3. Test de fonctionnement

```bash
# Test de connexion
curl -X GET "https://your-api.com/api/slack/test-connection"

# Test d'alerte
curl -X POST "https://your-api.com/api/slack/test-alert/document-upload" \
  -H "Content-Type: application/json" \
  -d '{"message": "Test de production"}'
```

## 📈 Monitoring et Maintenance

### Logs à surveiller

- `✅ Message Slack envoyé` - Notification réussie
- `⚠️ Erreur envoi notification Slack` - Échec d'envoi
- `🔇 Slack non configuré` - Service désactivé

### Métriques recommandées

- Nombre d'alertes par type
- Taux de succès d'envoi
- Temps de réponse du service Slack

## 🔒 Sécurité

- Les tokens Slack sont stockés en variables d'environnement
- Les endpoints de test sont publics (à sécuriser en production)
- Pas de données sensibles dans les messages Slack
- Gestion gracieuse des erreurs (pas de crash si Slack indisponible)

## 🆘 Dépannage

### Problèmes courants

1. **"Service non configuré"**
   - Vérifier les variables d'environnement
   - Tester avec `/api/slack/test-connection`

2. **"Échec de l'authentification Slack"**
   - Vérifier le token bot (`xoxb-...`)
   - Vérifier les permissions de l'app

3. **Messages non reçus**
   - Vérifier que le bot est dans le canal
   - Tester avec un canal public d'abord

### Support

Pour toute question ou problème, vérifiez :
1. Les logs du serveur
2. La configuration Slack
3. Les permissions du bot
4. La connectivité réseau
