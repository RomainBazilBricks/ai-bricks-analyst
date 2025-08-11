#!/bin/bash

# Script pour mettre à jour le fichier .env avec les URLs ngrok actuelles
echo "🔄 Mise à jour du fichier .env avec les URLs ngrok..."

ENV_FILE="front/.env"

# Vérifier que ngrok est en cours d'exécution
if ! curl -s http://localhost:4040/api/tunnels > /dev/null 2>&1; then
    echo "❌ Ngrok ne semble pas être en cours d'exécution"
    echo "💡 Lancez d'abord: ./start-ngrok.sh"
    exit 1
fi

# Récupérer les URLs depuis l'API ngrok
TUNNELS_JSON=$(curl -s http://localhost:4040/api/tunnels)

# Extraire les URLs pour chaque port
URL_3000=$(echo $TUNNELS_JSON | jq -r '.tunnels[] | select(.config.addr | contains("3000")) | .public_url')
URL_3001=$(echo $TUNNELS_JSON | jq -r '.tunnels[] | select(.config.addr | contains("3001")) | .public_url')

if [ "$URL_3000" = "null" ] || [ "$URL_3001" = "null" ]; then
    echo "❌ Impossible de récupérer les URLs ngrok"
    exit 1
fi

echo "🌐 URLs détectées:"
echo "  Port 3000 (AI Interface): $URL_3000"
echo "  Port 3001 (AI Bricks Analyst): $URL_3001"

# Sauvegarder l'ancien .env
cp $ENV_FILE "${ENV_FILE}.backup"

# Mettre à jour le fichier .env
sed -i.tmp "s|VITE_AI_INTERFACE_ACTION_URL=.*|VITE_AI_INTERFACE_ACTION_URL=$URL_3000|" $ENV_FILE
sed -i.tmp "s|VITE_AI_BRICKS_ANALYST_URL=.*|VITE_AI_BRICKS_ANALYST_URL=$URL_3001|" $ENV_FILE

# Nettoyer le fichier temporaire
rm "${ENV_FILE}.tmp"

echo "✅ Fichier .env mis à jour !"
echo "📋 Nouveau contenu:"
cat $ENV_FILE

echo ""
echo "💾 Sauvegarde créée: ${ENV_FILE}.backup" 