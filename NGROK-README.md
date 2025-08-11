# 🚀 Scripts Ngrok - Gestion automatique des URLs

Ce projet contient des scripts pour automatiser la gestion des URLs ngrok et la mise à jour du fichier `.env`.

## 🎯 Workflow de développement simplifié

### 🟢 Option 1 : Lancement via npm (Recommandé)
```bash
npm run dev
```
**Lance automatiquement :**
- Backend (port 3001)
- Frontend (port 3000) 
- Ngrok avec mise à jour du `.env`

### 🟡 Option 2 : Lancement séquentiel (Si problèmes de timing)
```bash
npm run dev:sequential
```
**Lance dans l'ordre :**
1. Ngrok d'abord
2. Puis backend et frontend une fois ngrok prêt

## 📋 Scripts disponibles

### 🔧 Scripts npm
- `npm run dev` - Lance tout en parallèle (backend + frontend + ngrok)
- `npm run dev:sequential` - Lance tout séquentiellement 
- `npm run dev:back` - Backend uniquement
- `npm run dev:front` - Frontend uniquement
- `npm run dev:ngrok` - Ngrok uniquement
- `npm run stop:ngrok` - Arrête ngrok

### 🛠️ Scripts bash standalone
- `./start-ngrok.sh` - Lance ngrok et met à jour le .env
- `./get-ngrok-urls.sh` - Récupère les URLs actuelles
- `./update-env.sh` - Met à jour uniquement le .env
- `./stop-ngrok.sh` - Arrête ngrok proprement
- `./dev-with-ngrok.sh` - Lance tout séquentiellement

## 🎯 Workflows recommandés

### 🚀 Développement quotidien :
```bash
npm run dev
# Tout se lance automatiquement !
# Ctrl+C pour tout arrêter
```

### 🔧 Si vous avez des problèmes de timing :
```bash
npm run dev:sequential
# Lance ngrok d'abord, puis le reste
```

### 🎛️ Contrôle granulaire :
```bash
# Lancer seulement ngrok
npm run dev:ngrok

# Puis dans un autre terminal
npm run dev:back
npm run dev:front
```

## 📁 Fichiers générés

- `ngrok-urls.txt` - URLs actuelles (ignoré par git)
- `ngrok.pid` - PID du processus ngrok (ignoré par git)  
- `front/.env.backup` - Sauvegarde du .env précédent (ignoré par git)

## ⚙️ Configuration

Le fichier `ngrok.yml` contient la configuration des tunnels :
- `app3000` → Port 3000 (Frontend)
- `app3001` → Port 3001 (Backend)

## 🔗 URLs dans .env

Le script met automatiquement à jour :
- `VITE_AI_INTERFACE_ACTION_URL` → URL du port 3000
- `VITE_AI_BRICKS_ANALYST_URL` → URL du port 3001

## 🚨 Prérequis

- ngrok installé et configuré avec votre authtoken
- jq installé (`brew install jq`)
- Ports 3000 et 3001 disponibles

## 💡 Avantages

✅ **Un seul commande** : `npm run dev` lance tout  
✅ **Pas de manipulation manuelle** du `.env`  
✅ **URLs automatiquement sauvegardées**  
✅ **Arrêt propre** avec Ctrl+C  
✅ **Sauvegarde automatique** avant modification  
✅ **Compatible plan gratuit** ngrok  
✅ **Gestion d'erreurs** et cleanup automatique

## 🔄 Migration depuis l'ancienne méthode

**Avant :**
```bash
# Terminal 1
npm run dev:back

# Terminal 2  
npm run dev:front

# Terminal 3
./start-ngrok.sh

# Copier/coller les URLs dans .env manuellement
```

**Maintenant :**
```bash
npm run dev
# C'est tout ! 🎉
``` 