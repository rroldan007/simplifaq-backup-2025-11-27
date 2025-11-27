#!/bin/bash

# 🇨🇭 SimpliFaq - Database Backup Script
# Crea backups automáticos de la base de datos

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuración
BACKUP_DIR="/var/www/simplifaq/my/backups/db"
DB_PATH="/var/www/simplifaq/my/backend/dev.db"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="dev.db.backup-${TIMESTAMP}"
MAX_BACKUPS=30  # Mantener últimos 30 backups

echo -e "${BLUE}🔒 SimpliFaq Database Backup${NC}"
echo -e "${BLUE}================================${NC}\n"

# Crear directorio si no existe
mkdir -p "$BACKUP_DIR"

# Verificar que existe la base de datos
if [ ! -f "$DB_PATH" ]; then
    echo -e "${RED}❌ Error: Base de datos no encontrada en $DB_PATH${NC}"
    exit 1
fi

# Crear backup
echo -e "${BLUE}📦 Creando backup...${NC}"
cp "$DB_PATH" "$BACKUP_DIR/$BACKUP_FILE"

if [ $? -eq 0 ]; then
    SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✅ Backup creado exitosamente${NC}"
    echo -e "   📁 Archivo: $BACKUP_FILE"
    echo -e "   💾 Tamaño: $SIZE"
else
    echo -e "${RED}❌ Error al crear backup${NC}"
    exit 1
fi

# Limpiar backups antiguos (mantener solo los últimos MAX_BACKUPS)
echo -e "\n${BLUE}🧹 Limpiando backups antiguos...${NC}"
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/dev.db.backup-* 2>/dev/null | wc -l)

if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
    REMOVE_COUNT=$((BACKUP_COUNT - MAX_BACKUPS))
    ls -1t "$BACKUP_DIR"/dev.db.backup-* | tail -n "$REMOVE_COUNT" | xargs rm -f
    echo -e "${GREEN}✅ Eliminados $REMOVE_COUNT backups antiguos${NC}"
    echo -e "   📊 Backups actuales: $MAX_BACKUPS"
else
    echo -e "${GREEN}✅ Total de backups: $BACKUP_COUNT${NC}"
fi

# Resumen
echo -e "\n${GREEN}================================${NC}"
echo -e "${GREEN}✅ Backup completado${NC}"
echo -e "${GREEN}================================${NC}"

exit 0
