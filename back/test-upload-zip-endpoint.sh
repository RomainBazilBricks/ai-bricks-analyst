#!/bin/bash

# Script de test pour l'endpoint upload-zip-from-url
# Ce script teste la nouvelle fonctionnalité d'upload de ZIP

echo "🧪 Test de l'endpoint upload-zip-from-url"
echo "========================================="

# Configuration
API_BASE_URL="${API_BASE_URL:-https://ai-bricks-analyst-production.up.railway.app}"
PROJECT_UNIQUE_ID="${1:-test-project-$(date +%s)}"

echo "📡 URL de l'API: $API_BASE_URL"
echo "🆔 ID du projet: $PROJECT_UNIQUE_ID"
echo ""

# Test de l'endpoint
echo "🚀 Envoi de la requête..."
curl -X POST "$API_BASE_URL/api/workflow/upload-zip-from-url" \
  -H "Content-Type: application/json" \
  -d "{
    \"projectUniqueId\": \"$PROJECT_UNIQUE_ID\"
  }" \
  --verbose \
  --max-time 120

echo ""
echo "✅ Test terminé"
