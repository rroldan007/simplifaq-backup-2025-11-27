#!/bin/bash

# 🇨🇭 SimpliFaq - Application Health Check
# Verifica que la aplicación esté funcionando correctamente

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 SimpliFaq Health Check${NC}"
echo -e "${BLUE}================================${NC}\n"

# Variables
ERRORS=0

# Función para verificar endpoint
check_endpoint() {
    local name=$1
    local url=$2
    local expected_code=${3:-200}
    
    echo -n "Verificando $name... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
    
    if [ "$response" == "$expected_code" ] || [ "$response" == "200" ] || [ "$response" == "302" ]; then
        echo -e "${GREEN}✅ OK${NC} (HTTP $response)"
    else
        echo -e "${RED}❌ FAIL${NC} (HTTP $response, esperado $expected_code)"
        ERRORS=$((ERRORS + 1))
    fi
}

# 1. Verificar Archivos Críticos
echo -e "${BLUE}📁 Archivos Críticos${NC}"
echo "-------------------"

check_file() {
    local name=$1
    local path=$2
    
    echo -n "Verificando $name... "
    if [ -f "$path" ]; then
        echo -e "${GREEN}✅ OK${NC}"
    else
        echo -e "${RED}❌ NO ENCONTRADO${NC}"
        ERRORS=$((ERRORS + 1))
    fi
}

check_file "Base de Datos" "/var/www/simplifaq/my/backend/dev.db"
check_file "Frontend Build" "/var/www/simplifaq/my/frontend/dist/index.html"
check_file "Backend Build" "/var/www/simplifaq/my/backend/dist/server.js"

echo ""

# 2. Verificar Procesos
echo -e "${BLUE}🔄 Procesos${NC}"
echo "-----------"

check_process() {
    local name=$1
    local pattern=$2
    
    echo -n "Verificando $name... "
    if pgrep -f "$pattern" > /dev/null; then
        echo -e "${GREEN}✅ RUNNING${NC}"
    else
        echo -e "${YELLOW}⚠️  NO RUNNING${NC}"
    fi
}

check_process "Backend Node" "node.*backend"
check_process "Frontend Vite" "vite"

echo ""

# 3. Verificar Endpoints
echo -e "${BLUE}🌐 Endpoints${NC}"
echo "------------"

check_endpoint "Backend Health" "http://localhost:3001/health"
check_endpoint "Backend API" "http://localhost:3001/api/health"
check_endpoint "Frontend" "http://localhost:5173"

echo ""

# 4. Verificar Base de Datos
echo -e "${BLUE}💾 Base de Datos${NC}"
echo "---------------"

DB_PATH="/var/www/simplifaq/my/backend/dev.db"
if [ -f "$DB_PATH" ]; then
    DB_SIZE=$(du -h "$DB_PATH" | cut -f1)
    TABLES=$(sqlite3 "$DB_PATH" ".tables" 2>/dev/null | wc -w)
    
    echo -e "Tamaño: ${GREEN}$DB_SIZE${NC}"
    echo -e "Tablas: ${GREEN}$TABLES${NC}"
    
    # Verificar que hay datos
    USERS=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM User;" 2>/dev/null)
    if [ "$USERS" -gt 0 ]; then
        echo -e "Usuarios: ${GREEN}$USERS${NC}"
    else
        echo -e "Usuarios: ${YELLOW}0${NC}"
    fi
else
    echo -e "${RED}❌ Base de datos no encontrada${NC}"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# 5. Verificar Backups
echo -e "${BLUE}💾 Backups${NC}"
echo "----------"

BACKUP_DIR="/var/www/simplifaq/my/backups/db"
if [ -d "$BACKUP_DIR" ]; then
    BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/dev.db.backup-* 2>/dev/null | wc -l)
    if [ "$BACKUP_COUNT" -gt 0 ]; then
        LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/dev.db.backup-* 2>/dev/null | head -1)
        BACKUP_NAME=$(basename "$LATEST_BACKUP")
        BACKUP_SIZE=$(du -h "$LATEST_BACKUP" | cut -f1)
        
        echo -e "Total backups: ${GREEN}$BACKUP_COUNT${NC}"
        echo -e "Último backup: ${GREEN}$BACKUP_NAME${NC}"
        echo -e "Tamaño: ${GREEN}$BACKUP_SIZE${NC}"
    else
        echo -e "${YELLOW}⚠️  No hay backups disponibles${NC}"
        echo -e "${YELLOW}Ejecuta: ./scripts/backup-db.sh${NC}"
    fi
else
    echo -e "${RED}❌ Directorio de backups no existe${NC}"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# Resumen
echo -e "${BLUE}================================${NC}"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ Todo funcionando correctamente${NC}"
    echo -e "${GREEN}================================${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Encontrados $ERRORS problema(s)${NC}"
    echo -e "${RED}================================${NC}"
    exit 1
fi
