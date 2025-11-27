#!/bin/bash

echo "🔍 Probando endpoints de analytics admin..."
echo ""

# Primero hacer login como admin
echo "1️⃣ Login admin..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@simplifaq.ch",
    "password": "AdminSimpliFaq2024!"
  }')

echo "Login response: $LOGIN_RESPONSE"
echo ""

# Extraer el token
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Error: No se pudo obtener el token"
  exit 1
fi

echo "✅ Token obtenido: ${TOKEN:0:50}..."
echo ""

# Probar endpoint de dashboard analytics
echo "2️⃣ Probando /api/admin/analytics/dashboard..."
curl -s -X GET "http://localhost:5000/api/admin/analytics/dashboard?period=30d" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.'

echo ""
echo "✅ Test completado"
