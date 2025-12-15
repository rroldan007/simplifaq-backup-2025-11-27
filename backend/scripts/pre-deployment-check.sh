#!/bin/bash

##############################################################################
# PRE-DEPLOYMENT CHECK - Verifica que todo esté listo para desplegar
# 
# Este script verifica:
# 1. Que no haya migraciones pendientes sin aplicar
# 2. Que el código compile correctamente
# 3. Que las variables de entorno estén configuradas
# 4. Que Prisma client esté actualizado
##############################################################################

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           PRE-DEPLOYMENT CHECK - SIMPLIFAQ                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

ERRORS=0

# 1. Verificar que estamos en el directorio correcto
echo -e "${BLUE}📁 Verificando directorio...${NC}"
if [ ! -f "package.json" ] || [ ! -d "prisma" ]; then
    echo -e "${RED}❌ ERROR: Debes ejecutar este script desde el directorio backend/${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Directorio correcto${NC}"
echo ""

# 2. Verificar variables de entorno
echo -e "${BLUE}🔐 Verificando variables de entorno...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ ERROR: Archivo .env no encontrado${NC}"
    ERRORS=$((ERRORS + 1))
else
    export $(cat .env | grep -v '^#' | xargs)
    
    if [ -z "$DATABASE_URL" ]; then
        echo -e "${RED}❌ ERROR: DATABASE_URL no está configurada${NC}"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}✅ DATABASE_URL configurada${NC}"
    fi
    
    if [ -z "$JWT_SECRET" ]; then
        echo -e "${YELLOW}⚠️  WARNING: JWT_SECRET no está configurada${NC}"
    fi
fi
echo ""

# 3. Verificar dependencias instaladas
echo -e "${BLUE}📦 Verificando dependencias...${NC}"
if [ ! -d "node_modules" ]; then
    echo -e "${RED}❌ ERROR: node_modules no encontrado. Ejecuta: npm install${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ Dependencias instaladas${NC}"
fi
echo ""

# 4. Verificar Prisma client actualizado
echo -e "${BLUE}🔧 Verificando Prisma client...${NC}"
PRISMA_CLIENT_EXISTS=$(find node_modules/.prisma/client -name "index.d.ts" 2>/dev/null | wc -l)
if [ "$PRISMA_CLIENT_EXISTS" -eq "0" ]; then
    echo -e "${YELLOW}⚠️  Prisma client no encontrado. Ejecutando: npx prisma generate${NC}"
    npx prisma generate
else
    echo -e "${GREEN}✅ Prisma client encontrado${NC}"
    
    # Verificar si el schema cambió y el client necesita regenerarse
    SCHEMA_HASH=$(md5sum prisma/schema.prisma | cut -d' ' -f1)
    CLIENT_HASH_FILE="node_modules/.prisma/client/schema-hash.txt"
    
    if [ -f "$CLIENT_HASH_FILE" ]; then
        STORED_HASH=$(cat "$CLIENT_HASH_FILE")
        if [ "$SCHEMA_HASH" != "$STORED_HASH" ]; then
            echo -e "${YELLOW}⚠️  Schema cambió. Regenerando client...${NC}"
            npx prisma generate
            echo "$SCHEMA_HASH" > "$CLIENT_HASH_FILE"
        fi
    else
        echo "$SCHEMA_HASH" > "$CLIENT_HASH_FILE"
    fi
fi
echo ""

# 5. Verificar estado de migraciones
echo -e "${BLUE}📊 Verificando estado de migraciones...${NC}"
if [ -n "$DATABASE_URL" ]; then
    # Verificar si hay migraciones pendientes
    MIGRATION_STATUS=$(npx prisma migrate status 2>&1 || echo "error")
    
    if echo "$MIGRATION_STATUS" | grep -q "migrations have not yet been applied"; then
        echo -e "${RED}❌ ADVERTENCIA: Hay migraciones pendientes sin aplicar${NC}"
        echo -e "${YELLOW}   Usa: ./scripts/safe-migrate.sh para aplicarlas de forma segura${NC}"
        ERRORS=$((ERRORS + 1))
    elif echo "$MIGRATION_STATUS" | grep -q "Database schema is up to date"; then
        echo -e "${GREEN}✅ Base de datos actualizada${NC}"
    else
        echo -e "${YELLOW}⚠️  No se pudo verificar el estado de migraciones${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Saltando verificación de migraciones (no hay DATABASE_URL)${NC}"
fi
echo ""

# 6. Verificar que TypeScript compile
echo -e "${BLUE}🔨 Compilando TypeScript...${NC}"
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Compilación exitosa${NC}"
else
    echo -e "${RED}❌ ERROR: El código no compila. Verifica errores de TypeScript${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# 7. Verificar estructura de backups
echo -e "${BLUE}💾 Verificando directorio de backups...${NC}"
if [ ! -d "backups" ]; then
    echo -e "${YELLOW}⚠️  Directorio backups no existe. Creándolo...${NC}"
    mkdir -p backups
fi
echo -e "${GREEN}✅ Directorio de backups listo${NC}"
echo ""

# 8. Verificar scripts de migración
echo -e "${BLUE}🛡️  Verificando scripts de migración...${NC}"
SCRIPTS_OK=true

if [ ! -f "scripts/safe-migrate.sh" ]; then
    echo -e "${RED}❌ ERROR: safe-migrate.sh no encontrado${NC}"
    SCRIPTS_OK=false
    ERRORS=$((ERRORS + 1))
fi

if [ ! -x "scripts/safe-migrate.sh" ]; then
    echo -e "${YELLOW}⚠️  safe-migrate.sh no es ejecutable. Corrigiendo...${NC}"
    chmod +x scripts/safe-migrate.sh 2>/dev/null || true
fi

if [ "$SCRIPTS_OK" = true ]; then
    echo -e "${GREEN}✅ Scripts de migración listos${NC}"
fi
echo ""

# Resumen final
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}║              ✅ TODO LISTO PARA DESPLEGAR                  ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}🚀 Próximos pasos para desplegar:${NC}"
    echo -e "   1. Sube el código al VPS"
    echo -e "   2. Ejecuta: ${YELLOW}./scripts/safe-migrate.sh${NC}"
    echo -e "   3. Ejecuta: ${YELLOW}pm2 restart simplifaq${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}║           ❌ ERRORES ENCONTRADOS: $ERRORS                      ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${RED}⚠️  Corrige los errores antes de desplegar${NC}"
    echo ""
    exit 1
fi
