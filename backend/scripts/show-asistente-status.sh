#!/bin/bash

# Script para mostrar el estado actual de la configuración del Asistente ADM

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         🤖 Estado del Asistente ADM - SimpliFaq           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

ENV_FILE="$(dirname "$0")/../.env"

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar si existe .env
if [ -f "$ENV_FILE" ]; then
    echo -e "${GREEN}✅ Archivo .env encontrado${NC}"
    
    # Cargar variables
    source "$ENV_FILE" 2>/dev/null || true
    
    # Verificar cada variable
    echo ""
    echo "📋 Configuración actual:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if [ -n "$ASISTENTE_BASE_URL" ]; then
        if [ "$ASISTENTE_BASE_URL" = "https://ia.simplifaq.cloud" ]; then
            echo -e "  ${GREEN}✅${NC} ASISTENTE_BASE_URL: ${GREEN}$ASISTENTE_BASE_URL${NC} (CORRECTO)"
        else
            echo -e "  ${YELLOW}⚠️${NC}  ASISTENTE_BASE_URL: ${YELLOW}$ASISTENTE_BASE_URL${NC}"
            echo -e "     ${YELLOW}Debería ser: https://ia.simplifaq.cloud${NC}"
        fi
    else
        echo -e "  ${RED}❌${NC} ASISTENTE_BASE_URL: ${RED}NO CONFIGURADO${NC}"
    fi
    
    if [ -n "$ASISTENTE_API_KEY" ]; then
        if [ "$ASISTENTE_API_KEY" = "7542790518742e8d2192a2bc1d33f3498c187ef9c4a7a4c4735a138d0c6ff9a3" ]; then
            echo -e "  ${GREEN}✅${NC} ASISTENTE_API_KEY: ${GREEN}${ASISTENTE_API_KEY:0:30}...${NC} (CORRECTO)"
        else
            echo -e "  ${YELLOW}⚠️${NC}  ASISTENTE_API_KEY: ${YELLOW}${ASISTENTE_API_KEY:0:30}...${NC}"
            echo -e "     ${YELLOW}Puede no ser la clave correcta${NC}"
        fi
    else
        echo -e "  ${RED}❌${NC} ASISTENTE_API_KEY: ${RED}NO CONFIGURADO${NC}"
    fi
    
    if [ -n "$ASISTENTE_TIMEOUT_MS" ]; then
        echo -e "  ${GREEN}✅${NC} ASISTENTE_TIMEOUT_MS: $ASISTENTE_TIMEOUT_MS"
    else
        echo -e "  ${YELLOW}⚠️${NC}  ASISTENTE_TIMEOUT_MS: NO CONFIGURADO (usará default: 30000)"
    fi
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Verificar si todo está correcto
    if [ "$ASISTENTE_BASE_URL" = "https://ia.simplifaq.cloud" ] && \
       [ "$ASISTENTE_API_KEY" = "7542790518742e8d2192a2bc1d33f3498c187ef9c4a7a4c4735a138d0c6ff9a3" ]; then
        echo ""
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${GREEN}  🎉 ¡CONFIGURACIÓN CORRECTA!${NC}"
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo "✅ El asistente ADM está correctamente configurado"
        echo "✅ Conectado a: https://ia.simplifaq.cloud"
        echo ""
        echo "📝 Siguiente paso:"
        echo "   Reinicia el backend si aún no lo has hecho:"
        echo "   $ npm run dev"
        echo ""
        echo "🧪 Para probar la conexión:"
        echo "   $ ./scripts/test-asistente-connection.sh"
    else
        echo ""
        echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${YELLOW}  ⚠️  CONFIGURACIÓN INCORRECTA O INCOMPLETA${NC}"
        echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo "🔧 Para corregir automáticamente:"
        echo "   $ ./scripts/update-asistente-config.sh"
        echo ""
        echo "📝 O edita manualmente el archivo .env y agrega:"
        echo "   ASISTENTE_BASE_URL=https://ia.simplifaq.cloud"
        echo "   ASISTENTE_API_KEY=7542790518742e8d2192a2bc1d33f3498c187ef9c4a7a4c4735a138d0c6ff9a3"
        echo "   ASISTENTE_TIMEOUT_MS=30000"
    fi
    
else
    echo -e "${RED}❌ Archivo .env NO encontrado${NC}"
    echo ""
    echo "🔧 Crea el archivo .env:"
    echo "   1. Opción automática:"
    echo "      $ cp .env.example .env"
    echo "      $ ./scripts/update-asistente-config.sh"
    echo ""
    echo "   2. Opción manual:"
    echo "      Crea backend/.env y agrega:"
    echo "      ASISTENTE_BASE_URL=https://ia.simplifaq.cloud"
    echo "      ASISTENTE_API_KEY=7542790518742e8d2192a2bc1d33f3498c187ef9c4a7a4c4735a138d0c6ff9a3"
    echo "      ASISTENTE_TIMEOUT_MS=30000"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📚 Documentación disponible:"
echo "   - ../../QUICKSTART_ASISTENTE_ADM.md (Guía rápida)"
echo "   - ../../CONFIGURACION_ASISTENTE_IA.md (Guía completa)"
echo "   - ../../RESUMEN_CAMBIOS_ASISTENTE.md (Resumen de cambios)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
