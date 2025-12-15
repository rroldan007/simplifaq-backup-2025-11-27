#!/bin/bash

##############################################################################
# SCRIPT PARA RESETEAR ONBOARDING DE UN USUARIO (TESTING)
# Permite probar el welcome modal y onboarding completo con usuario existente
##############################################################################

set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        RESETEAR ONBOARDING PARA PRUEBAS                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Cargar variables de entorno
if [ ! -f .env ]; then
    echo -e "${RED}❌ Archivo .env no encontrado${NC}"
    exit 1
fi

export $(cat .env | grep -v '^#' | xargs)

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL no está configurada en .env${NC}"
    exit 1
fi

# Listar usuarios disponibles
echo -e "${BLUE}📋 Usuarios disponibles:${NC}"
echo ""

psql "$DATABASE_URL" -c "
    SELECT 
        u.id, 
        u.email, 
        u.\"companyName\",
        CASE WHEN uo.is_completed THEN '✅ Completo' ELSE '⏳ Pendiente' END as onboarding,
        CASE WHEN uo.welcome_message_shown THEN '✅ Visto' ELSE '❌ No visto' END as welcome
    FROM users u
    LEFT JOIN user_onboarding uo ON u.id = uo.user_id
    ORDER BY u.\"createdAt\" DESC
    LIMIT 10;
"

echo ""
echo -e "${YELLOW}Ingresa el EMAIL del usuario para resetear su onboarding:${NC}"
read -p "Email: " USER_EMAIL

if [ -z "$USER_EMAIL" ]; then
    echo -e "${RED}❌ Email no puede estar vacío${NC}"
    exit 1
fi

# Verificar que el usuario existe
USER_EXISTS=$(psql "$DATABASE_URL" -t -c "SELECT EXISTS(SELECT 1 FROM users WHERE email = '$USER_EMAIL');" | xargs)

if [ "$USER_EXISTS" != "t" ]; then
    echo -e "${RED}❌ Usuario no encontrado: $USER_EMAIL${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}⚠️  Esto reseteará completamente el onboarding del usuario:${NC}"
echo -e "   • Welcome modal volverá a aparecer"
echo -e "   • Todos los pasos se marcarán como no completados"
echo -e "   • El progreso volverá a 0%"
echo ""
read -p "¿Continuar? (escribe 'SI' para confirmar): " CONFIRM

if [ "$CONFIRM" != "SI" ]; then
    echo -e "${YELLOW}❌ Cancelado${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}🔄 Reseteando onboarding...${NC}"

# Obtener user_id
USER_ID=$(psql "$DATABASE_URL" -t -c "SELECT id FROM users WHERE email = '$USER_EMAIL';" | xargs)

# Resetear o crear registro de onboarding
psql "$DATABASE_URL" << EOF
-- Eliminar registro existente si existe
DELETE FROM user_onboarding WHERE user_id = '$USER_ID';

-- Crear nuevo registro limpio
INSERT INTO user_onboarding (
    id,
    user_id,
    company_info_completed,
    logo_uploaded,
    financial_info_completed,
    smtp_configured,
    first_client_created,
    first_product_created,
    first_invoice_created,
    is_completed,
    current_step,
    skipped_steps,
    welcome_message_shown,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    '$USER_ID',
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    'company_info',
    '{}',
    false,
    NOW(),
    NOW()
);
EOF

echo -e "${GREEN}✅ Onboarding reseteado exitosamente${NC}"
echo ""
echo -e "${BLUE}📝 Estado actual:${NC}"

psql "$DATABASE_URL" -c "
    SELECT 
        u.email,
        uo.current_step as \"Paso Actual\",
        uo.is_completed as \"Completado\",
        uo.welcome_message_shown as \"Welcome Visto\"
    FROM users u
    JOIN user_onboarding uo ON u.id = uo.user_id
    WHERE u.email = '$USER_EMAIL';
"

echo ""
echo -e "${GREEN}🎉 ¡Listo para probar!${NC}"
echo ""
echo -e "${YELLOW}💡 Siguiente pasos:${NC}"
echo -e "   1. Cierra sesión si estás logueado"
echo -e "   2. Inicia sesión con: ${BLUE}$USER_EMAIL${NC}"
echo -e "   3. ${GREEN}✨ El Welcome Modal debería aparecer automáticamente${NC}"
echo -e "   4. Prueba el flujo completo del onboarding (7 pasos)"
echo ""
EOF
