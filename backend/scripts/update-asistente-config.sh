#!/bin/bash

# Script para actualizar la configuración del Asistente ADM
# Actualiza automáticamente las variables de entorno en el archivo .env

set -e

echo "🤖 Actualizador de Configuración del Asistente ADM"
echo "=================================================="
echo ""

ENV_FILE="$(dirname "$0")/../.env"
NEW_BASE_URL="https://ia.simplifaq.cloud"
NEW_API_KEY="7542790518742e8d2192a2bc1d33f3498c187ef9c4a7a4c4735a138d0c6ff9a3"
TIMEOUT_MS="30000"

# Verificar si el archivo .env existe
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: No se encontró el archivo .env en: $ENV_FILE"
    echo "   Crea el archivo .env copiando .env.example:"
    echo "   cp .env.example .env"
    exit 1
fi

echo "✅ Archivo .env encontrado: $ENV_FILE"
echo ""

# Hacer backup del archivo .env
BACKUP_FILE="${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$ENV_FILE" "$BACKUP_FILE"
echo "📦 Backup creado: $BACKUP_FILE"
echo ""

# Función para actualizar o agregar una variable
update_or_add_env_var() {
    local var_name="$1"
    local var_value="$2"
    local file="$3"
    
    if grep -q "^${var_name}=" "$file"; then
        # La variable existe, actualizarla
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s|^${var_name}=.*|${var_name}=${var_value}|" "$file"
        else
            # Linux
            sed -i "s|^${var_name}=.*|${var_name}=${var_value}|" "$file"
        fi
        echo "  ✏️  Actualizado: ${var_name}"
    else
        # La variable no existe, agregarla
        echo "" >> "$file"
        echo "${var_name}=${var_value}" >> "$file"
        echo "  ➕ Agregado: ${var_name}"
    fi
}

echo "🔧 Actualizando variables de entorno..."
echo ""

# Actualizar las variables
update_or_add_env_var "ASISTENTE_BASE_URL" "$NEW_BASE_URL" "$ENV_FILE"
update_or_add_env_var "ASISTENTE_API_KEY" "$NEW_API_KEY" "$ENV_FILE"
update_or_add_env_var "ASISTENTE_TIMEOUT_MS" "$TIMEOUT_MS" "$ENV_FILE"

echo ""
echo "✅ Configuración actualizada correctamente!"
echo ""
echo "📋 Nueva configuración:"
echo "   ASISTENTE_BASE_URL=${NEW_BASE_URL}"
echo "   ASISTENTE_API_KEY=${NEW_API_KEY:0:20}..." # Mostrar solo los primeros 20 caracteres
echo "   ASISTENTE_TIMEOUT_MS=${TIMEOUT_MS}"
echo ""
echo "🔄 Siguiente paso: Reinicia el servidor backend"
echo "   npm run dev"
echo "   # o si usas PM2:"
echo "   pm2 restart backend"
echo ""
echo "🎉 ¡Listo! El asistente ADM ahora se conectará a https://ia.simplifaq.cloud"
