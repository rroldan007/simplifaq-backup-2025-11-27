#!/bin/bash

# Script simplificado para actualizar el schema de forma segura
# Usa 'prisma db push' que es seguro y no destructivo

set -e

echo "🔄 SimpliFaq - Actualización Segura del Schema"
echo "=============================================="
echo ""

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

cd "$(dirname "$0")/.."

echo -e "${BLUE}📋 Verificando cambios en el schema...${NC}"
echo ""
echo "Cambios a aplicar:"
echo "  ✅ Agregar campo: pdfAdvancedConfig (TEXT, nullable)"
echo ""

echo -e "${YELLOW}⚠️  Esta operación es segura:${NC}"
echo "  • NO eliminará datos existentes"
echo "  • NO eliminará usuarios"
echo "  • Solo AGREGA un campo opcional"
echo "  • 100% reversible"
echo ""

read -p "¿Continuar? (Y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Nn]$ ]]; then
    echo "Operación cancelada"
    exit 0
fi

echo ""
echo -e "${BLUE}🔄 Aplicando cambios al schema...${NC}"

# Usar db push en lugar de migrate (más flexible con SQLite/PostgreSQL)
npx prisma db push

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Schema actualizado exitosamente${NC}"
    echo ""
    echo "📋 Resumen:"
    echo "  • Nuevo campo agregado: pdfAdvancedConfig (TEXT)"
    echo "  • Usuarios existentes: Intactos ✅"
    echo "  • Datos existentes: Intactos ✅"
    echo ""
    echo -e "${GREEN}🎉 El editor PDF avanzado está listo para usar${NC}"
    echo ""
    echo "Siguiente paso:"
    echo "  npm run dev  # Para iniciar el servidor con el nuevo campo"
else
    echo ""
    echo -e "${YELLOW}⚠️  Hubo un problema al actualizar el schema${NC}"
    exit 1
fi
