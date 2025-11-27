#!/bin/bash

# Test script for AI expense creation
# Run from /var/www/simplifaq/test/backend

echo "🧪 Testing AI Expense Creation"
echo "=============================="
echo ""

# Get JWT token (replace with actual token)
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWh5ZjI2ZTgwMDAwaXdpaDdsMHFpcHNiIiwiaWF0IjoxNzMxNzQ4ODAwfQ.example"

echo "📤 Sending request: 'Registra un gasto de internet 80 francos Swisscom'"
echo ""

# Test AI ask endpoint
RESPONSE=$(curl -s -X POST https://test.simplifaq.ch/api/ai/ask \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "question": "Registra un gasto de internet 80 francos Swisscom"
  }')

echo "📥 AI Response:"
echo "$RESPONSE" | jq '.'
echo ""

# Extract action from response
HAS_ACTION=$(echo "$RESPONSE" | jq -r '.data.action')

if [ "$HAS_ACTION" != "null" ]; then
  echo "✅ Action detected!"
  echo "Type: $(echo "$RESPONSE" | jq -r '.data.action.type')"
  echo "Parameters: $(echo "$RESPONSE" | jq -r '.data.action.parameters')"
  echo ""
  echo "📊 Confirmation message:"
  echo "$(echo "$RESPONSE" | jq -r '.data.action.confirmationMessage')"
else
  echo "❌ No action detected in response"
  echo ""
  echo "📄 Raw answer:"
  echo "$(echo "$RESPONSE" | jq -r '.data.answer')"
fi

echo ""
echo "=============================="
echo "🔍 Check if expense exists in database:"
echo ""
node check_expenses.js | grep -A 7 "Internet\|Swisscom" || echo "No matching expense found"
