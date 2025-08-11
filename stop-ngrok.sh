#!/bin/bash

# Script pour arrêter ngrok
echo "🛑 Arrêt de ngrok..."

# Arrêter via le PID sauvegardé
if [ -f ngrok.pid ]; then
    PID=$(cat ngrok.pid)
    if kill -0 $PID 2>/dev/null; then
        kill $PID
        echo "✅ Ngrok arrêté (PID: $PID)"
    else
        echo "⚠️  Le processus $PID n'existe plus"
    fi
    rm ngrok.pid
else
    # Arrêter tous les processus ngrok
    pkill -f ngrok
    echo "✅ Tous les processus ngrok ont été arrêtés"
fi

# Nettoyer les fichiers temporaires
rm -f ngrok-urls.txt

echo "�� Nettoyage terminé" 