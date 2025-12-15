#!/bin/bash

# Script para probar la conexión del Asistente ADM
# Verifica que el backend pueda comunicarse con https://ia.simplifaq.cloud

set -e

echo "🧪 Test de Conexión del Asistente ADM"
echo "======================================"
echo ""

# Verificar que las variables de entorno estén configuradas
ENV_FILE="$(dirname "$0")/../.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: No se encontró el archivo .env"
    echo "   Ejecuta primero: ./scripts/update-asistente-config.sh"
    exit 1
fi

# Cargar variables de entorno
source "$ENV_FILE"

if [ -z "$ASISTENTE_BASE_URL" ]; then
    echo "❌ Error: ASISTENTE_BASE_URL no está configurado en .env"
    exit 1
fi

if [ -z "$ASISTENTE_API_KEY" ]; then
    echo "❌ Error: ASISTENTE_API_KEY no está configurado en .env"
    exit 1
fi

echo "✅ Variables de entorno encontradas:"
echo "   ASISTENTE_BASE_URL=$ASISTENTE_BASE_URL"
echo "   ASISTENTE_API_KEY=${ASISTENTE_API_KEY:0:20}..."
echo ""

# Verificar conectividad básica
echo "🔍 Verificando conectividad con el servicio de IA..."
echo ""

ENDPOINT="${ASISTENTE_BASE_URL}/asistente/v1/chat"

# Nota: Esta prueba requiere un JWT válido
echo "⚠️  NOTA: Para probar completamente, necesitas un JWT de usuario válido."
echo "   Este script solo verifica si el endpoint responde."
echo ""

# Intentar un ping básico al dominio
DOMAIN=$(echo "$ASISTENTE_BASE_URL" | sed -e 's|^https\?://||' -e 's|/.*||')

if ping -c 1 "$DOMAIN" &> /dev/null; then
    echo "✅ Conectividad de red OK: $DOMAIN es alcanzable"
else
    echo "⚠️  No se pudo hacer ping a $DOMAIN (esto puede ser normal si el firewall bloquea ICMP)"
fi

echo ""
echo "🌐 Endpoint de prueba: $ENDPOINT"
echo ""

# Intentar una conexión HTTP simple (esperamos un 401 o 400, no un error de conexión)
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$ENDPOINT" \
    -H "Content-Type: application/json" \
    -H "x-api-key: $ASISTENTE_API_KEY" \
    --connect-timeout 10 \
    -d '{"message":"test","sessionId":"test"}' 2>&1 || echo "000")

echo "📊 Código de respuesta HTTP: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" = "000" ]; then
    echo "❌ Error: No se pudo conectar al servicio de IA"
    echo "   Verifica:"
    echo "   1. Que la URL sea correcta: $ASISTENTE_BASE_URL"
    echo "   2. Que tengas conexión a Internet"
    echo "   3. Que no haya un firewall bloqueando la conexión"
    exit 1
elif [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
    echo "⚠️  Autenticación requerida (código $HTTP_CODE)"
    echo "   Esto es NORMAL - el endpoint está respondiendo pero requiere un JWT válido"
    echo "   ✅ El servicio de IA está ACCESIBLE"
elif [ "$HTTP_CODE" = "400" ]; then
    echo "⚠️  Bad Request (código 400)"
    echo "   Esto puede ser normal - el endpoint está respondiendo"
    echo "   ✅ El servicio de IA está ACCESIBLE"
elif [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo "✅ ¡Conexión exitosa! El servicio de IA está funcionando correctamente"
else
    echo "⚠️  Respuesta inesperada (código $HTTP_CODE)"
    echo "   El servicio responde pero con un código inusual"
fi

echo ""
echo "📝 Siguiente paso: Prueba desde tu aplicación frontend"
echo "   El endpoint /api/asistente/chat en tu backend está listo"
echo ""
echo "🔧 Para pruebas completas con autenticación, usa:"
echo "   curl -X POST http://localhost:3001/api/asistente/chat \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -H \"Authorization: Bearer <TU_JWT_TOKEN>\" \\"
echo "     -d '{\"message\":\"Hola\",\"sessionId\":\"test-123\",\"channel\":\"dashboard-web\",\"locale\":\"fr-CH\"}'"
echo ""
