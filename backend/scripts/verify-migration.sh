#!/bin/bash

##############################################################################
# SCRIPT DE VERIFICACIÓN POST-MIGRACIÓN
# Verifica que la migración no haya causado pérdida de datos
##############################################################################

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         VERIFICACIÓN DE INTEGRIDAD DE DATOS               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Cargar variables de entorno
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL no está configurada${NC}"
    exit 1
fi

echo -e "${BLUE}🔍 Verificando tablas principales...${NC}"
echo ""

# Verificar cada tabla
check_table() {
    local table=$1
    local count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | xargs || echo "ERROR")
    
    if [ "$count" = "ERROR" ]; then
        echo -e "${RED}❌ $table: ERROR AL CONSULTAR${NC}"
        return 1
    else
        echo -e "${GREEN}✅ $table: $count registros${NC}"
        return 0
    fi
}

# Verificar tablas críticas
ERRORS=0

check_table "users" || ((ERRORS++))
check_table "accounts" || ((ERRORS++))
check_table "invoices" || ((ERRORS++))
check_table "clients" || ((ERRORS++))
check_table "products" || ((ERRORS++))
check_table "plans" || ((ERRORS++))
check_table "subscriptions" || ((ERRORS++))

echo ""
echo -e "${BLUE}🔍 Verificando nuevas columnas en 'plans'...${NC}"
echo ""

# Verificar columnas específicas
check_column() {
    local column=$1
    local exists=$(psql "$DATABASE_URL" -t -c "
        SELECT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'plans' 
            AND column_name = '$column'
        );
    " 2>/dev/null | xargs || echo "f")
    
    if [ "$exists" = "t" ]; then
        echo -e "${GREEN}✅ Columna '$column' existe${NC}"
        return 0
    else
        echo -e "${RED}❌ Columna '$column' NO existe${NC}"
        return 1
    fi
}

check_column "hasInvoices" || ((ERRORS++))
check_column "hasQuotes" || ((ERRORS++))
check_column "hasExpenses" || ((ERRORS++))
check_column "hasAIAssistant" || ((ERRORS++))
check_column "hasMultiUser" || ((ERRORS++))
check_column "maxUsers" || ((ERRORS++))
check_column "hasMultiCompany" || ((ERRORS++))
check_column "maxCompanies" || ((ERRORS++))

echo ""
echo -e "${BLUE}🔍 Verificando integridad referencial...${NC}"
echo ""

# Verificar relaciones
ORPHAN_INVOICES=$(psql "$DATABASE_URL" -t -c "
    SELECT COUNT(*) 
    FROM invoices i 
    LEFT JOIN accounts a ON i.\"accountId\" = a.id 
    WHERE a.id IS NULL;
" 2>/dev/null | xargs || echo "ERROR")

if [ "$ORPHAN_INVOICES" = "0" ]; then
    echo -e "${GREEN}✅ No hay facturas huérfanas${NC}"
elif [ "$ORPHAN_INVOICES" = "ERROR" ]; then
    echo -e "${RED}❌ Error al verificar facturas huérfanas${NC}"
    ((ERRORS++))
else
    echo -e "${YELLOW}⚠️  Se encontraron $ORPHAN_INVOICES facturas sin cuenta${NC}"
    ((ERRORS++))
fi

ORPHAN_CLIENTS=$(psql "$DATABASE_URL" -t -c "
    SELECT COUNT(*) 
    FROM clients c 
    LEFT JOIN accounts a ON c.\"accountId\" = a.id 
    WHERE a.id IS NULL;
" 2>/dev/null | xargs || echo "ERROR")

if [ "$ORPHAN_CLIENTS" = "0" ]; then
    echo -e "${GREEN}✅ No hay clientes huérfanos${NC}"
elif [ "$ORPHAN_CLIENTS" = "ERROR" ]; then
    echo -e "${RED}❌ Error al verificar clientes huérfanos${NC}"
    ((ERRORS++))
else
    echo -e "${YELLOW}⚠️  Se encontraron $ORPHAN_CLIENTS clientes sin cuenta${NC}"
    ((ERRORS++))
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ VERIFICACIÓN EXITOSA: Todo está correcto${NC}"
    exit 0
else
    echo -e "${RED}❌ SE ENCONTRARON $ERRORS ERRORES${NC}"
    echo -e "${YELLOW}⚠️  Revisa los mensajes anteriores y considera restaurar el backup${NC}"
    exit 1
fi
