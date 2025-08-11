#!/bin/bash

# Script pour lancer ngrok et sauvegarder les URLs
echo "🚀 Lancement de ngrok..."

# Fonction pour nettoyer à l'arrêt
cleanup() {
    echo "🛑 Arrêt de ngrok..."
    if [ -f ngrok.pid ]; then
        PID=$(cat ngrok.pid)
        kill $PID 2>/dev/null
        rm ngrok.pid
    fi
    pkill -f ngrok 2>/dev/null
    rm -f ngrok-urls.txt
    exit 0
}

# Capturer les signaux d'arrêt
trap cleanup SIGINT SIGTERM

# Arrêter les instances ngrok existantes
pkill -f ngrok 2>/dev/null || true
sleep 2

# Lancer ngrok en arrière-plan
ngrok start app3000 app3001 --config ngrok.yml &
NGROK_PID=$!

# Attendre que ngrok soit prêt
echo "⏳ Attente que ngrok soit prêt..."
sleep 8

# Récupérer les URLs via l'API ngrok
echo "📋 Récupération des URLs..."

# Vérifier que ngrok est bien démarré
if ! curl -s http://localhost:4040/api/tunnels > /dev/null 2>&1; then
    echo "❌ Erreur: ngrok n'a pas pu démarrer correctement"
    exit 1
fi

# Sauvegarder les URLs dans un fichier
curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[] | "\(.name): \(.public_url)"' > ngrok-urls.txt

echo "✅ URLs sauvegardées dans ngrok-urls.txt"
echo "📊 Dashboard ngrok: http://localhost:4040"

# Afficher les URLs
echo "🌐 URLs actuelles:"
cat ngrok-urls.txt

# Mettre à jour automatiquement le fichier .env
echo ""
echo "🔄 Mise à jour automatique du fichier .env..."

# Exécuter le script de mise à jour directement (sans appeler le fichier externe)
ENV_FILE="front/.env"
TUNNELS_JSON=$(curl -s http://localhost:4040/api/tunnels)
URL_3000=$(echo $TUNNELS_JSON | jq -r '.tunnels[] | select(.config.addr | contains("3000")) | .public_url')
URL_3001=$(echo $TUNNELS_JSON | jq -r '.tunnels[] | select(.config.addr | contains("3001")) | .public_url')

if [ "$URL_3000" != "null" ] && [ "$URL_3001" != "null" ]; then
    cp $ENV_FILE "${ENV_FILE}.backup"
    sed -i.tmp "s|VITE_AI_INTERFACE_ACTION_URL=.*|VITE_AI_INTERFACE_ACTION_URL=$URL_3000|" $ENV_FILE
    sed -i.tmp "s|VITE_AI_BRICKS_ANALYST_URL=.*|VITE_AI_BRICKS_ANALYST_URL=$URL_3001|" $ENV_FILE
    rm "${ENV_FILE}.tmp"
    echo "✅ Fichier .env mis à jour !"
fi

echo ""
echo "💡 Ngrok est maintenant actif (PID: $NGROK_PID)"
echo $NGROK_PID > ngrok.pid

# Garder le script actif pour concurrently
echo "🔄 Ngrok en cours d'exécution... (Ctrl+C pour arrêter)"
wait $NGROK_PID 