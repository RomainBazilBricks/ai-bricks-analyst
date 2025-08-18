# Guide des endpoints du workflow d'analyse

## 🎯 Problème résolu

Manus peut maintenant déclencher manuellement chaque étape du workflow grâce aux endpoints de déclenchement.

## 📋 Endpoints de déclenchement par étape

### Étape 0 : Upload des documents
```bash
POST /api/workflow/upload-zip-from-url
Content-Type: application/json

{
  "projectUniqueId": "mon-projet-123"
}
```
**Action** : Génère un ZIP avec tous les documents du projet et l'envoie à Manus

### Étape 1 : Analyse globale
```bash
POST /api/workflow/trigger-step-1/{projectUniqueId}
```
**Action** : Déclenche l'analyse globale du projet

### Étapes 2-5 : Endpoints existants
- **Étape 2** : `POST /api/workflow/step-2-analysis`
- **Étape 3** : `POST /api/workflow/step-3-documents` 
- **Étape 4** : `POST /api/workflow/step-4-vigilance`
- **Étape 5** : `POST /api/workflow/step-5-message`

## 🔄 Flow complet pour Manus

1. **Après l'étape 0** (Upload ZIP), Manus reçoit dans le prompt :
   ```
   Une fois ton analyse terminée, tu peux déclencher l'étape suivante (Analyse globale) 
   en faisant un POST sur : https://ai-bricks-analyst-production.up.railway.app/api/workflow/trigger-step-1/{projectUniqueId}
   ```

2. **Manus fait le POST** vers `trigger-step-1/{projectUniqueId}`

3. **L'étape 1 est déclenchée** automatiquement avec le bon prompt et l'URL de conversation

4. **Le cycle continue** avec les endpoints existants pour les étapes suivantes

## 🎉 Avantages

- ✅ **Contrôle manuel** : Manus peut décider quand déclencher l'étape suivante
- ✅ **Continuité de conversation** : L'URL de conversation de l'étape 0 est transmise à l'étape 1
- ✅ **Architecture cohérente** : Même pattern que les autres étapes
- ✅ **Instruction claire** : Le prompt indique exactement quel endpoint appeler

## 🧪 Test de l'endpoint

```bash
# Test de déclenchement de l'étape 1
curl -X POST "https://ai-bricks-analyst-production.up.railway.app/api/workflow/trigger-step-1/mon-projet-123"
```

**Réponse attendue** :
```json
{
  "message": "Étape 1 (Analyse globale) déclenchée avec succès",
  "projectUniqueId": "mon-projet-123",
  "stepId": 6,
  "stepName": "Analyse globale",
  "conversationUrl": "https://manus.ai/conversation/abc123",
  "status": "in_progress"
}
```
