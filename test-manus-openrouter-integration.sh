#!/bin/bash

# Script de test pour l'intégration Manus -> OpenRouter GPT-4o
BASE_URL="http://localhost:3001"

echo "🧪 Test de l'intégration Manus -> OpenRouter GPT-4o"
echo "=================================================="

# Récupérer un projectUniqueId existant (vous devrez adapter ceci)
PROJECT_ID="1754572154850x513821003567071200"

echo ""
echo "📋 Test du workflow final-message avec reformulation GPT-4o..."
echo "Project ID: $PROJECT_ID"

# Simuler l'appel de Manus avec un message de test
curl -s -X POST "$BASE_URL/api/workflow/final-message/$PROJECT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Voici mon analyse préliminaire du projet. Les points clés sont les suivants : 1) Le modèle économique semble solide avec des revenus récurrents. 2) L équipe dirigeante a une expérience pertinente dans le secteur. 3) Il y a quelques risques concernant la concurrence qui s intensifie. 4) Les projections financières paraissent optimistes mais réalisables. En conclusion, ce projet présente un potentiel intéressant malgré certains défis à relever.",
    "projectUniqueId": "'$PROJECT_ID'"
  }' | jq '.' || echo "❌ Erreur lors de l'appel"

echo ""
echo "✅ Test terminé !"
echo ""
echo "🔍 Vérifiez les logs du serveur pour voir :"
echo "   - Le message original stocké avec sender='IA'"
echo "   - L'appel OpenRouter GPT-4o"
echo "   - Le message reformulé stocké avec sender='IA_REFORMULATED'"
