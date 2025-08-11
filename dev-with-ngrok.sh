#!/bin/bash

echo "🚀 Démarrage complet du projet avec ngrok..."

# Fonction pour nettoyer à l'arrêt
cleanup() {
    echo ""
    echo "🛑 Arrêt de tous les services..."
    
    # Arrêter ngrok
    if [ -f ngrok.pid ]; then
        PID=$(cat ngrok.pid)
        kill $PID 2>/dev/null
        rm ngrok.pid
    fi
    pkill -f ngrok 2>/dev/null
    
    # Arrêter les processus npm
    pkill -f "npm run dev" 2>/dev/null
    
    # Nettoyer les fichiers temporaires
    rm -f ngrok-urls.txt
    
    echo "✅ Tous les services ont été arrêtés"
    exit 0
}

# Capturer les signaux d'arrêt
trap cleanup SIGINT SIGTERM

# 1. Lancer ngrok et attendre qu'il soit prêt
echo "📡 Étape 1/3: Lancement de ngrok..."
./start-ngrok.sh &
NGROK_SCRIPT_PID=$!

# Attendre que ngrok soit complètement prêt
sleep 10

# Vérifier que ngrok fonctionne
if ! curl -s http://localhost:4040/api/tunnels > /dev/null 2>&1; then
    echo "❌ Erreur: ngrok n'a pas pu démarrer"
    exit 1
fi

echo "✅ Ngrok est prêt !"

# 2. Lancer le backend et frontend
echo ""
echo "🔧 Étape 2/3: Lancement du backend et frontend..."
concurrently -n BACK,FRONT -c green,cyan "npm run dev -w back" "npm run dev -w front" &
DEV_PID=$!

echo ""
echo "🎉 Étape 3/3: Tous les services sont actifs !"
echo "📊 Dashboard ngrok: http://localhost:4040"
echo "🌐 URLs actuelles:"
cat ngrok-urls.txt
echo ""
echo "🔄 Services en cours d'exécution... (Ctrl+C pour tout arrêter)"

# Attendre que les processus se terminent
wait $DEV_PID 