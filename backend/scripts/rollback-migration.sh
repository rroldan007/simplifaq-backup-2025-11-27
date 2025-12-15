#!/bin/bash

##############################################################################
# SCRIPT DE ROLLBACK
# Restaura el último backup de la base de datos
##############################################################################

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BACKUP_DIR="./backups"

echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║                  🔄 ROLLBACK DE MIGRACIÓN                  ║${NC}"
echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Cargar variables de entorno
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL no está configurada${NC}"
    exit 1
fi

# Buscar el backup más reciente
echo -e "${BLUE}🔍 Buscando backups disponibles...${NC}"
echo ""

if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${RED}❌ No se encontró el directorio de backups${NC}"
    exit 1
fi

LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/db_backup_pre_migration_*.sql 2>/dev/null | head -n 1)

if [ -z "$LATEST_BACKUP" ]; then
    echo -e "${RED}❌ No se encontraron backups${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Backup encontrado:${NC}"
echo -e "   Archivo: $LATEST_BACKUP"
BACKUP_SIZE=$(du -h "$LATEST_BACKUP" | cut -f1)
BACKUP_DATE=$(stat -c %y "$LATEST_BACKUP" 2>/dev/null | cut -d'.' -f1 || stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$LATEST_BACKUP")
echo -e "   Tamaño: $BACKUP_SIZE"
echo -e "   Fecha: $BACKUP_DATE"
echo ""

# Mostrar todos los backups disponibles
echo -e "${BLUE}📋 Otros backups disponibles:${NC}"
ls -lht "$BACKUP_DIR"/db_backup_pre_migration_*.sql 2>/dev/null | tail -n +2 | head -n 5
echo ""

echo -e "${YELLOW}⚠️  ADVERTENCIA: Esto restaurará la base de datos al estado del backup${NC}"
echo -e "${YELLOW}   Todos los cambios posteriores al backup se perderán${NC}"
echo ""

read -p "¿Deseas continuar con el rollback? (escribe 'SI' para confirmar): " confirm

if [ "$confirm" != "SI" ]; then
    echo -e "${YELLOW}❌ Rollback cancelado${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}🔄 Restaurando backup...${NC}"

# Crear un backup del estado actual antes del rollback (por seguridad)
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
SAFETY_BACKUP="$BACKUP_DIR/db_backup_before_rollback_$TIMESTAMP.sql"

echo -e "${YELLOW}💾 Creando backup de seguridad del estado actual...${NC}"
if pg_dump "$DATABASE_URL" > "$SAFETY_BACKUP" 2>/dev/null; then
    echo -e "${GREEN}✅ Backup de seguridad creado: $SAFETY_BACKUP${NC}"
else
    echo -e "${YELLOW}⚠️  No se pudo crear backup de seguridad, continuando...${NC}"
fi
echo ""

# Restaurar el backup
echo -e "${BLUE}📥 Restaurando desde: $LATEST_BACKUP${NC}"

if psql "$DATABASE_URL" < "$LATEST_BACKUP" 2>&1 | grep -v "^$"; then
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              ✅ ROLLBACK COMPLETADO EXITOSAMENTE           ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}📝 Resumen:${NC}"
    echo -e "   • Base de datos restaurada desde: $LATEST_BACKUP"
    echo -e "   • Backup de seguridad: $SAFETY_BACKUP"
    echo ""
    echo -e "${YELLOW}💡 Próximos pasos:${NC}"
    echo -e "   1. Regenera el cliente de Prisma: npx prisma generate"
    echo -e "   2. Reinicia la aplicación"
    echo -e "   3. Verifica que todo funcione correctamente"
    echo ""
else
    echo ""
    echo -e "${RED}❌ Error al restaurar el backup${NC}"
    if [ -f "$SAFETY_BACKUP" ]; then
        echo -e "${BLUE}💡 El backup de seguridad está disponible en: $SAFETY_BACKUP${NC}"
    fi
    exit 1
fi
