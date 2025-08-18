#!/bin/bash

# Test de l'API workflow status pour vérifier que l'étape 0 apparaît

PROJECT_ID="1754764846020x119524286754193400"  # Premier projet de la liste
API_BASE_URL="https://ai-bricks-analyst-production.up.railway.app"

echo "🧪 Test de l'API workflow status"
echo "================================="
echo "📊 Projet: $PROJECT_ID"
echo "🔗 URL: $API_BASE_URL/api/workflow/status/$PROJECT_ID"
echo ""

echo "🚀 Requête GET /api/workflow/status/$PROJECT_ID"
curl -s "$API_BASE_URL/api/workflow/status/$PROJECT_ID" | jq '.'

echo ""
echo "✅ Test terminé"
