#!/bin/bash

# Script de test pour l'intégration OpenRouter GPT-5
BASE_URL="http://localhost:3000"

echo "🧪 Test de l'intégration OpenRouter GPT-5"
echo "========================================="

# Test 1: Health check
echo ""
echo "1️⃣ Test de connectivité OpenRouter..."
curl -s "$BASE_URL/api/openrouter/health" | jq '.' || echo "❌ Erreur health check"

# Test 2: Liste des modèles
echo ""
echo "2️⃣ Test liste des modèles..."
curl -s "$BASE_URL/api/openrouter/models" | jq '.models' || echo "❌ Erreur liste modèles"

# Test 3: Test rapide GPT-5
echo ""
echo "3️⃣ Test rapide GPT-5..."
curl -s "$BASE_URL/api/openrouter/gpt5/quick-test" | jq '.' || echo "❌ Erreur test rapide"

# Test 4: Appel GPT-5 personnalisé
echo ""
echo "4️⃣ Test appel GPT-5 personnalisé..."
curl -s -X POST "$BASE_URL/api/openrouter/gpt5" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explique-moi en 2 phrases ce qu'\''est l'\''intelligence artificielle.",
    "systemPrompt": "Tu es un expert en IA qui explique les concepts de manière simple.",
    "temperature": 0.7,
    "max_tokens": 200
  }' | jq '.' || echo "❌ Erreur appel personnalisé"

echo ""
echo "✅ Tests terminés !"
