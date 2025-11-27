#!/bin/bash

# Script to test invoice PDF generation with QR Bill
# This script tests the actual API endpoint

echo "🧪 Testing Invoice PDF Generation with QR Bill"
echo "=============================================="
echo ""

# Configuration
API_URL="http://localhost:3001"
OUTPUT_DIR="/var/www/simplifaq/my/backend/test-output"

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# First, we need to login to get a token
echo "📝 Step 1: Getting authentication token..."

# You'll need to replace these with actual credentials
# For testing, we can use a test user or get the first user from the database
read -p "Enter email: " EMAIL
read -sp "Enter password: " PASSWORD
echo ""

LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Failed to get authentication token"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Authentication successful"
echo ""

# Get list of invoices
echo "📝 Step 2: Fetching invoices list..."
INVOICES_RESPONSE=$(curl -s -X GET "$API_URL/api/invoices" \
  -H "Authorization: Bearer $TOKEN")

# Extract first invoice ID
INVOICE_ID=$(echo "$INVOICES_RESPONSE" | jq -r '.data[0].id')

if [ "$INVOICE_ID" == "null" ] || [ -z "$INVOICE_ID" ]; then
  echo "❌ No invoices found"
  echo "Response: $INVOICES_RESPONSE"
  exit 1
fi

echo "✅ Found invoice: $INVOICE_ID"
echo ""

# Generate PDF
echo "📝 Step 3: Generating PDF with QR Bill..."
OUTPUT_FILE="$OUTPUT_DIR/invoice-$INVOICE_ID.pdf"

curl -s -X GET "$API_URL/api/invoices/$INVOICE_ID/pdf" \
  -H "Authorization: Bearer $TOKEN" \
  -o "$OUTPUT_FILE"

if [ -f "$OUTPUT_FILE" ]; then
  FILE_SIZE=$(stat -f%z "$OUTPUT_FILE" 2>/dev/null || stat -c%s "$OUTPUT_FILE" 2>/dev/null)
  
  if [ $FILE_SIZE -gt 0 ]; then
    echo "✅ PDF generated successfully"
    echo "   File: $OUTPUT_FILE"
    echo "   Size: $FILE_SIZE bytes"
    echo ""
    
    # Check if file is a valid PDF
    if file "$OUTPUT_FILE" | grep -q "PDF"; then
      echo "✅ Valid PDF file"
    else
      echo "⚠️  File may not be a valid PDF"
      head -n 5 "$OUTPUT_FILE"
    fi
  else
    echo "❌ PDF file is empty"
    exit 1
  fi
else
  echo "❌ Failed to create PDF file"
  exit 1
fi

echo ""
echo "📋 Checking backend logs for QR Bill errors..."
pm2 logs simplifaq-my-backend --lines 50 --nostream | grep -i "qrbill\|qr bill" || echo "No QR Bill logs found in recent output"

echo ""
echo "🎉 Test completed!"
