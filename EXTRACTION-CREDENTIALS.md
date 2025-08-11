# 🔐 Guide d'Extraction des Credentials IA

Ce guide vous explique comment extraire automatiquement vos credentials d'authentification depuis différentes plateformes IA pour les utiliser avec votre système de gestion de credentials.

## 📋 Vue d'ensemble

Le système permet de stocker et gérer vos sessions d'authentification pour :
- **Manus.ai** - Assistant IA avancé
- **ChatGPT** - OpenAI ChatGPT
- **Claude** - Anthropic Claude
- **Perplexity** - Moteur de recherche IA
- **Gemini** - Google Gemini
- **Mistral** - Mistral AI

## 🚀 Méthode Automatique (Recommandée)

### Étape 1: Accéder à l'interface
1. Connectez-vous à votre système AI Bricks Analyst
2. Cliquez sur l'onglet **"Credentials IA"**
3. Cliquez sur **"Ajouter un Credential"**

### Étape 2: Suivre le guide intégré
1. La documentation apparaît automatiquement avec le formulaire
2. Suivez les **6 étapes** détaillées dans l'interface
3. Cliquez sur **"📋 Copier le script"** pour obtenir le script d'extraction
4. Le script est automatiquement copié dans votre presse-papier

### Étape 3: Exécuter le script
1. **Connectez-vous** sur la plateforme IA (ex: https://www.manus.ai)
2. **Ouvrez la console** développeur (F12 → onglet Console)
3. **Collez le script** et appuyez sur Entrée
4. **Les données sont automatiquement copiées** dans votre presse-papier
5. **Retournez à l'interface** et collez dans le champ "Données de session"

## 📁 Méthode Manuelle (Script séparé)

Si vous préférez utiliser le script directement :

### 1. Utiliser le fichier script
```bash
# Le script est disponible dans :
./extraction-script-manus.js
```

### 2. Étapes d'exécution
1. Ouvrez le fichier `extraction-script-manus.js`
2. Copiez tout le contenu
3. Connectez-vous sur https://www.manus.ai
4. Ouvrez la console (F12)
5. Collez et exécutez le script
6. Les données sont automatiquement extraites et copiées

## 🔍 Que fait le script ?

Le script d'extraction récupère automatiquement :

### 🍪 Cookies
- `session_id` - Identifiant de session principal
- `manus-theme` - Préférences utilisateur
- Tous les cookies d'authentification

### 💾 Local Storage
- `UserService.userInfo` - Informations utilisateur (ID, email, nom)
- `usage_info` - Informations d'abonnement
- Toutes les données de session locales

### 🔄 Session Storage
- Données de session temporaires
- Tokens d'authentification temporaires

### 👤 Informations Utilisateur
- ID utilisateur unique
- Adresse email
- Nom d'affichage
- Statut du compte

### 🔑 Tokens de Session
- Token de session principal
- Tokens d'authentification secondaires
- Clés d'API (si disponibles)

### 📋 Métadonnées
- User Agent du navigateur
- URL actuelle
- Horodatage d'extraction
- Domaine de la plateforme

## 📊 Format des Données

Le script génère un JSON structuré comme ceci :

```json
{
  "platform": "manus",
  "userIdentifier": "votre-email@example.com",
  "credentialName": "default",
  "sessionData": {
    "session_token": "abc123...",
    "user_id": "310419663026821823",
    "cookies": {
      "session_id": "...",
      "manus-theme": "dark"
    },
    "local_storage": {
      "UserService.userInfo": "...",
      "usage_info": "premium"
    },
    "user_info": {
      "userId": "...",
      "email": "...",
      "displayname": "..."
    },
    "user_agent": "Mozilla/5.0...",
    "extracted_at": "2024-01-15T10:30:00.000Z"
  },
  "notes": "Extracted from browser console on 15/01/2024"
}
```

## ⚠️ Sécurité et Bonnes Pratiques

### 🔒 Sécurité Critique
- **Ne partagez JAMAIS** ces données avec qui que ce soit
- **Utilisez uniquement** sur vos propres comptes
- **Stockez de manière sécurisée** dans votre système
- **Respectez** les conditions d'utilisation des plateformes

### ⏰ Durée de Vie
- **Manus.ai** : ~30 jours
- **ChatGPT** : ~14 jours  
- **Claude** : ~7 jours
- **Autres** : Variable selon la plateforme

### 🔄 Renouvellement
- Surveillez les dates d'expiration
- Renouvelez avant expiration
- Testez régulièrement la validité

## 🛠️ Dépannage

### ❌ "Session ID non trouvé"
- Vérifiez que vous êtes bien connecté
- Actualisez la page et reconnectez-vous
- Vérifiez que les cookies sont activés

### ❌ "Impossible de copier automatiquement"
- Copiez manuellement le JSON `sessionData`
- Vérifiez les permissions du navigateur
- Utilisez un navigateur moderne (Chrome, Firefox, Safari)

### ❌ "UserService.userInfo introuvable"
- Attendez quelques secondes après la connexion
- Naviguez sur une page de l'application
- Rafraîchissez et réessayez

### ❌ "Credential invalide"
- Vérifiez que toutes les données sont présentes
- Assurez-vous que le JSON est valide
- Renouvelez la session si elle a expiré

## 📞 Support

Si vous rencontrez des problèmes :

1. **Vérifiez** que vous suivez toutes les étapes
2. **Testez** avec un navigateur différent
3. **Assurez-vous** d'être connecté sur la plateforme
4. **Contactez** le support technique si nécessaire

## 🎯 Utilisation Avancée

### Automatisation
```javascript
// Exemple d'utilisation programmatique
if (window.manusCredentials) {
    const sessionData = window.manusCredentials.sessionData;
    
    // Vérifier la validité
    if (sessionData.session_token) {
        console.log("✅ Credential valide");
        
        // Copier uniquement les données nécessaires
        copy(JSON.stringify(sessionData, null, 2));
    }
}
```

### Validation
```javascript
// Vérifier les champs obligatoires
const requiredFields = ['session_token', 'user_id', 'cookies'];
const isValid = requiredFields.every(field => 
    sessionData[field] && sessionData[field] !== ''
);
```

---

## 📝 Notes Importantes

- Ce système est conçu pour **un usage personnel** uniquement
- Respectez **toujours** les conditions d'utilisation des plateformes
- Gardez vos credentials **confidentiels** et **sécurisés**
- Renouvelez régulièrement pour maintenir l'accès

---

*Dernière mise à jour : Janvier 2024* 