#!/bin/bash

# Script de Backup de Base de Datos
# Uso: ./scripts/backup-db.sh

DB_FILE="dev.db"
BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/dev.db.${TIMESTAMP}"

# Crear directorio de backups si no existe
mkdir -p "$BACKUP_DIR"

# Verificar que existe la base de datos
if [ ! -f "$DB_FILE" ]; then
    echo "❌ Error: $DB_FILE no existe"
    exit 1
fi

# Hacer backup
echo "📦 Creando backup de $DB_FILE..."
cp "$DB_FILE" "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Backup creado: $BACKUP_FILE"
    
    # Mostrar tamaño
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "📊 Tamaño: $SIZE"
    
    # Mantener solo los últimos 10 backups
    BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/dev.db.* 2>/dev/null | wc -l)
    if [ "$BACKUP_COUNT" -gt 10 ]; then
        echo "🧹 Limpiando backups antiguos..."
        ls -1t "$BACKUP_DIR"/dev.db.* | tail -n +11 | xargs rm -f
        echo "✅ Mantenidos los últimos 10 backups"
    fi
    
    echo ""
    echo "Para restaurar este backup:"
    echo "  cp $BACKUP_FILE $DB_FILE"
else
    echo "❌ Error al crear backup"
    exit 1
fi
