# Test de l'endpoint upload-zip-from-url

## ✅ Fonctionnalité implémentée

L'endpoint `POST /api/workflow/upload-zip-from-url` est maintenant fonctionnel et permet :

1. **Génération automatique de ZIP** : Récupère tous les documents d'un projet et les combine dans une archive ZIP
2. **Upload vers S3** : Stocke le ZIP généré sur AWS S3 avec une URL publique
3. **Envoi à Manus** : Utilise l'infrastructure existante pour envoyer le ZIP à Manus avec un message dynamique
4. **Intégration workflow** : Met à jour l'étape 0 et déclenche automatiquement l'étape suivante

## 🎯 Étape 0 créée

L'étape 0 "Upload des documents" a été ajoutée dans la table `analysis_steps` :
- **ID** : 11
- **Nom** : Upload des documents  
- **Ordre** : 0
- **Description** : Génère un fichier ZIP contenant tous les documents du projet et l'envoie à Manus pour analyse
- **Prompt** : "Voici tous les documents du projet {projectUniqueId} dans une archive ZIP. Peux-tu analyser ces documents et me donner un aperçu général du projet ? Il y a {documentCount} documents au total."

## 🚀 Comment utiliser l'endpoint

### Exemple de requête cURL

```bash
curl -X POST "https://ai-bricks-analyst-production.up.railway.app/api/workflow/upload-zip-from-url" \
  -H "Content-Type: application/json" \
  -d '{
    "projectUniqueId": "votre-project-unique-id"
  }'
```

### Réponse attendue

```json
{
  "message": "ZIP créé et envoyé avec succès à Manus",
  "projectUniqueId": "votre-project-unique-id",
  "zipUrl": "https://bucket.s3.region.amazonaws.com/projects/project-id/zips/hash-filename.zip",
  "zipFileName": "project-id-documents-timestamp.zip",
  "zipSize": 1024000,
  "documentCount": 5,
  "conversationUrl": "https://manus.ai/conversation/abc123",
  "nextStepTriggered": true
}
```

## 🔄 Workflow automatique

1. **Création de projet** avec documents → Workflow initié automatiquement
2. **Étape 0** déclenchée automatiquement après 2 secondes
3. **ZIP généré** avec tous les documents du projet
4. **Envoi à Manus** avec message dynamique
5. **Étape 1** déclenchée automatiquement après succès

## 🛠️ Architecture technique

### Fichiers modifiés/créés :

- `back/src/controllers/workflow.controller.ts` : Nouveau endpoint `uploadZipFromUrl`
- `back/src/routes/workflow.routes.ts` : Route ajoutée
- `back/src/lib/s3.ts` : Fonction `createZipFromDocuments` pour générer le ZIP
- `back/src/scripts/add-step-0-upload-zip.ts` : Script de migration pour l'étape 0
- `shared/types/workflow.d.ts` : Types TypeScript pour l'endpoint

### Infrastructure utilisée :

- **Archiver** : Bibliothèque Node.js pour créer des ZIP en mémoire
- **AWS S3** : Stockage des ZIP générés
- **API Python existante** : Interface avec Manus (même que `external-tools.ts`)
- **Workflow Drizzle** : Gestion des étapes et progression

## 🎉 Résultat

L'endpoint est maintenant fonctionnel et respecte l'architecture existante. Il permet d'envoyer automatiquement tous les documents d'un projet à Manus sous forme de ZIP avec un message dynamique personnalisable.
