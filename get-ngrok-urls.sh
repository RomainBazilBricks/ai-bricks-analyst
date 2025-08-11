#!/bin/bash

# Script pour récupérer les URLs ngrok actuelles
echo "🔍 Récupération des URLs ngrok actuelles..."

if ! curl -s http://localhost:4040/api/tunnels > /dev/null 2>&1; then
    echo "❌ Ngrok ne semble pas être en cours d'exécution"
    echo "💡 Lancez d'abord: ./start-ngrok.sh"
    exit 1
fi

# Récupérer et afficher les URLs
curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[] | "\(.name): \(.public_url)"' | tee ngrok-urls.txt

echo ""
echo "✅ URLs sauvegardées dans ngrok-urls.txt"
echo "📊 Dashboard: http://localhost:4040" 