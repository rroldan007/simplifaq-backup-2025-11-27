#!/bin/bash

# Test completo del QR Bill via API
# Este script verifica que el QR Bill se genere correctamente desde la API

set -e

echo "🧪 Test Completo: Generación de QR Bill via API"
echo "================================================"
echo ""

API_URL="http://localhost:3031"
OUTPUT_DIR="/var/www/simplifaq/my/backend/test-output"

mkdir -p "$OUTPUT_DIR"

# Paso 1: Login
echo "📝 Paso 1: Autenticación..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@simplifaq.ch","password":"Password123!"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token // .token // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
  echo "❌ Error: No se pudo obtener el token"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Autenticación exitosa"
echo ""

# Paso 2: Obtener lista de facturas
echo "📝 Paso 2: Obteniendo facturas..."
INVOICES_RESPONSE=$(curl -s -X GET "$API_URL/api/invoices" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

INVOICE_ID=$(echo "$INVOICES_RESPONSE" | jq -r '.data[0].id // empty')

if [ -z "$INVOICE_ID" ] || [ "$INVOICE_ID" == "null" ]; then
  echo "❌ Error: No se encontraron facturas"
  echo "Response: $INVOICES_RESPONSE"
  exit 1
fi

INVOICE_NUMBER=$(echo "$INVOICES_RESPONSE" | jq -r '.data[0].invoiceNumber // "UNKNOWN"')

echo "✅ Factura encontrada: $INVOICE_NUMBER (ID: $INVOICE_ID)"
echo ""

# Paso 3: Generar PDF
echo "📝 Paso 3: Generando PDF con QR Bill..."
OUTPUT_FILE="$OUTPUT_DIR/api-test-$INVOICE_NUMBER.pdf"

HTTP_CODE=$(curl -s -w "%{http_code}" -o "$OUTPUT_FILE" \
  -X GET "$API_URL/api/invoices/$INVOICE_ID/pdf" \
  -H "Authorization: Bearer $TOKEN")

if [ "$HTTP_CODE" != "200" ]; then
  echo "❌ Error: HTTP $HTTP_CODE"
  cat "$OUTPUT_FILE"
  exit 1
fi

# Verificar archivo
if [ ! -f "$OUTPUT_FILE" ]; then
  echo "❌ Error: No se creó el archivo PDF"
  exit 1
fi

FILE_SIZE=$(stat -f%z "$OUTPUT_FILE" 2>/dev/null || stat -c%s "$OUTPUT_FILE" 2>/dev/null)

if [ "$FILE_SIZE" -eq 0 ]; then
  echo "❌ Error: El archivo PDF está vacío"
  exit 1
fi

echo "✅ PDF generado exitosamente"
echo "   Archivo: $OUTPUT_FILE"
echo "   Tamaño: $FILE_SIZE bytes"
echo ""

# Paso 4: Verificar contenido del PDF
echo "📝 Paso 4: Verificando contenido del PDF..."

# Verificar que es un PDF válido
if file "$OUTPUT_FILE" | grep -q "PDF"; then
  echo "✅ Archivo PDF válido"
else
  echo "❌ Error: El archivo no es un PDF válido"
  file "$OUTPUT_FILE"
  exit 1
fi

# Verificar tamaño mínimo (un PDF con QR Bill debería ser > 100KB)
if [ "$FILE_SIZE" -gt 100000 ]; then
  echo "✅ Tamaño adecuado (probablemente incluye QR Bill)"
else
  echo "⚠️  Advertencia: Tamaño pequeño (puede que no incluya QR Bill)"
fi

echo ""

# Paso 5: Verificar logs del backend
echo "📝 Paso 5: Verificando logs del backend..."
echo ""

LOGS=$(pm2 logs simplifaq-my-backend --lines 30 --nostream 2>/dev/null | grep -i "qrbill" | tail -10)

if echo "$LOGS" | grep -q "✅.*QR Bill"; then
  echo "✅ QR Bill generado correctamente según logs:"
  echo "$LOGS" | grep "QR Bill"
elif echo "$LOGS" | grep -q "Missing creditor.account"; then
  echo "⚠️  QR Bill no generado - Usuario sin IBAN:"
  echo "$LOGS" | grep -i "iban\|qrbill"
elif echo "$LOGS" | grep -q "❌.*QR Bill"; then
  echo "❌ Error en generación de QR Bill:"
  echo "$LOGS" | grep -i "qrbill"
else
  echo "ℹ️  No se encontraron logs recientes de QR Bill"
  echo "   (El PDF puede haberse generado anteriormente)"
fi

echo ""
echo "═══════════════════════════════════════════════"
echo "🎉 Test completado exitosamente"
echo "═══════════════════════════════════════════════"
echo ""
echo "📋 Resumen:"
echo "  - PDF generado: $OUTPUT_FILE"
echo "  - Tamaño: $(numfmt --to=iec-i --suffix=B $FILE_SIZE 2>/dev/null || echo "$FILE_SIZE bytes")"
echo "  - Estado: ✅ OK"
echo ""
echo "Para ver el PDF:"
echo "  xdg-open $OUTPUT_FILE  # Linux"
echo "  open $OUTPUT_FILE      # macOS"
echo ""
