#!/bin/bash

echo "🧪 Test de redirection vers preprod"
echo "=================================="

# URL de base (à adapter selon votre environnement)
BASE_URL="http://localhost:3001"

# Données de test avec le paramètre toPreprod
TEST_DATA='{
  "projectUniqueId": "test-preprod-' $(date +%s) '",
  "projectName": "Test Redirection Preprod",
  "description": "Test de redirection vers l environnement preprod",
  "budgetTotal": 100000,
  "estimatedRoi": 15,
  "startDate": "2024-01-01T00:00:00.000Z",
  "fundingExpectedDate": "2024-06-01T00:00:00.000Z",
  "fileUrls": ["https://example.com/test.pdf"],
  "toPreprod": true
}'

echo "📡 Envoi de la requête avec toPreprod=true..."
echo "URL: $BASE_URL/api/projects"
echo "Data: $TEST_DATA"
echo ""

# Faire l'appel API
curl -X POST \
  -H "Content-Type: application/json" \
  -d "$TEST_DATA" \
  "$BASE_URL/api/projects" \
  -v

echo ""
echo "✅ Test terminé"
