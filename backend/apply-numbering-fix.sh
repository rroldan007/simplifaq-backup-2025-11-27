#!/bin/bash

# Script para aplicar fix de numeración
# =====================================

set -e

echo "🔧 Aplicando fix de numeración..."
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Paso 1: Generando cliente Prisma...${NC}"
npx prisma generate

echo -e "${YELLOW}Paso 2: Creando migración...${NC}"
npx prisma migrate dev --name fix_numbering_defaults --create-only

echo ""
echo -e "${GREEN}✓ Migración creada${NC}"
echo ""
echo -e "${YELLOW}Paso 3: Aplicando migración...${NC}"
npx prisma migrate dev

echo ""
echo -e "${YELLOW}Paso 4: Actualizando datos existentes...${NC}"

# Ejecutar el SQL de actualización
npx prisma db execute --file=fix-numbering-defaults.sql --schema=prisma/schema.dev.prisma

echo ""
echo -e "${GREEN}✅ Fix aplicado exitosamente${NC}"
echo ""
echo "Ahora los usuarios tendrán:"
echo "  - Facturas: FAC-001, FAC-002, FAC-003..."
echo "  - Devis: DEV-001, DEV-002, DEV-003..."
echo ""
echo "Los usuarios pueden personalizar esto en Settings → Numérotation"
echo ""
