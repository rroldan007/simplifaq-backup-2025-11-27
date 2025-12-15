#!/bin/bash

##############################################################################
# SCRIPT PARA RESETEAR ONBOARDING EN SQLITE (DESARROLLO)
##############################################################################

set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║    RESETEAR ONBOARDING PARA PRUEBAS (SQLite)               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Buscar archivo de base de datos
DB_FILE="./dev.db"

if [ ! -f "$DB_FILE" ]; then
    echo -e "${RED}❌ Base de datos no encontrada: $DB_FILE${NC}"
    echo -e "${YELLOW}Intentando buscar en prisma/...${NC}"
    DB_FILE="./prisma/dev.db"
    
    if [ ! -f "$DB_FILE" ]; then
        echo -e "${RED}❌ No se encuentra dev.db${NC}"
        echo -e "${YELLOW}Ejecuta primero: npx prisma migrate dev${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Base de datos encontrada: $DB_FILE${NC}"
echo ""

# Listar usuarios
echo -e "${BLUE}📋 Usuarios disponibles:${NC}"
echo ""

sqlite3 "$DB_FILE" <<EOF
.headers on
.mode column
SELECT 
    id, 
    email, 
    companyName,
    CASE WHEN EXISTS(
        SELECT 1 FROM user_onboarding uo 
        WHERE uo.userId = users.id AND uo.isCompleted = 1
    ) THEN '✅ Completo' ELSE '⏳ Pendiente' END as onboarding,
    CASE WHEN EXISTS(
        SELECT 1 FROM user_onboarding uo 
        WHERE uo.userId = users.id AND uo.welcomeMessageShown = 1
    ) THEN '✅ Visto' ELSE '❌ No visto' END as welcome
FROM users
ORDER BY createdAt DESC
LIMIT 10;
EOF

echo ""
echo -e "${YELLOW}Ingresa el EMAIL del usuario para resetear su onboarding:${NC}"
read -p "Email: " USER_EMAIL

if [ -z "$USER_EMAIL" ]; then
    echo -e "${RED}❌ Email no puede estar vacío${NC}"
    exit 1
fi

# Verificar que el usuario existe
USER_ID=$(sqlite3 "$DB_FILE" "SELECT id FROM users WHERE email = '$USER_EMAIL' LIMIT 1;")

if [ -z "$USER_ID" ]; then
    echo -e "${RED}❌ Usuario no encontrado: $USER_EMAIL${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Usuario encontrado: $USER_ID${NC}"
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

# Resetear onboarding
sqlite3 "$DB_FILE" <<EOF
-- Eliminar registro existente
DELETE FROM user_onboarding WHERE userId = '$USER_ID';

-- Crear nuevo registro limpio
INSERT INTO user_onboarding (
    id,
    userId,
    companyInfoCompleted,
    logoUploaded,
    financialInfoCompleted,
    smtpConfigured,
    firstClientCreated,
    firstProductCreated,
    firstInvoiceCreated,
    isCompleted,
    currentStep,
    skippedSteps,
    welcomeMessageShown,
    createdAt,
    updatedAt
) VALUES (
    lower(hex(randomblob(16))),
    '$USER_ID',
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    'company_info',
    '[]',
    0,
    datetime('now'),
    datetime('now')
);
EOF

echo -e "${GREEN}✅ Onboarding reseteado exitosamente${NC}"
echo ""
echo -e "${BLUE}📝 Estado actual:${NC}"

sqlite3 "$DB_FILE" <<EOF
.headers on
.mode column
SELECT 
    u.email,
    uo.currentStep as "Paso_Actual",
    uo.isCompleted as "Completado",
    uo.welcomeMessageShown as "Welcome_Visto"
FROM users u
JOIN user_onboarding uo ON u.id = uo.userId
WHERE u.email = '$USER_EMAIL';
EOF

echo ""
echo -e "${GREEN}🎉 ¡Listo para probar!${NC}"
echo ""
echo -e "${YELLOW}💡 Próximos pasos:${NC}"
echo -e "   1. Ve a http://localhost:3000"
echo -e "   2. Cierra sesión si estás logueado"
echo -e "   3. Inicia sesión con: ${BLUE}$USER_EMAIL${NC}"
echo -e "   4. ${GREEN}✨ El Welcome Modal debería aparecer automáticamente${NC}"
echo -e "   5. Prueba el flujo completo del onboarding (7 pasos)"
echo ""
