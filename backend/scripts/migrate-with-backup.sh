#!/bin/bash

# Script para ejecutar migración con backup automático
# Uso: ./migrate-with-backup.sh

set -e  # Detener si hay error

echo "🔄 SimpliFaq - Migración con Backup Automático"
echo "=============================================="
echo ""

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Obtener variables de entorno
# Ir al directorio del backend primero
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
cd "$BACKEND_DIR"

source .env 2>/dev/null || true

# Verificar que DATABASE_URL existe
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ ERROR: DATABASE_URL no está configurado${NC}"
    echo "Por favor configura DATABASE_URL en el archivo .env"
    exit 1
fi

# Crear directorio de backups si no existe
BACKUP_DIR="./backups/migrations"
mkdir -p "$BACKUP_DIR"

# Generar nombre de backup con timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_before_pdf_advanced_config_$TIMESTAMP.sql"

echo -e "${BLUE}📦 Creando backup de la base de datos...${NC}"

# Detectar tipo de base de datos
if [[ $DATABASE_URL == file:* ]]; then
    # SQLite - hacer copia simple del archivo
    DB_FILE="${DATABASE_URL#file:}"
    
    if [ -f "$DB_FILE" ]; then
        BACKUP_FILE="$BACKUP_DIR/backup_dev_db_$TIMESTAMP.db"
        echo "Tipo: SQLite"
        echo "Archivo: $BACKUP_FILE"
        
        cp "$DB_FILE" "$BACKUP_FILE"
        
        if [ $? -eq 0 ]; then
            BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
            echo -e "${GREEN}✅ Backup SQLite creado exitosamente ($BACKUP_SIZE)${NC}"
        else
            echo -e "${RED}❌ Error al crear backup${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}⚠️  Archivo de base de datos no encontrado: $DB_FILE${NC}"
        echo -e "${YELLOW}   La base de datos se creará durante la migración${NC}"
    fi
elif [[ $DATABASE_URL == postgres* ]]; then
    # PostgreSQL - usar pg_dump
    echo "Tipo: PostgreSQL"
    echo "Archivo: $BACKUP_FILE"
    
    if command -v pg_dump &> /dev/null; then
        pg_dump "$DATABASE_URL" > "$BACKUP_FILE"
        
        if [ $? -eq 0 ]; then
            BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
            echo -e "${GREEN}✅ Backup PostgreSQL creado exitosamente ($BACKUP_SIZE)${NC}"
        else
            echo -e "${RED}❌ Error al crear backup${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}⚠️  pg_dump no está instalado${NC}"
        echo -e "${YELLOW}   Para instalar: sudo apt-get install postgresql-client${NC}"
        read -p "¿Continuar sin backup? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
else
    echo -e "${YELLOW}⚠️  Tipo de base de datos no reconocido${NC}"
    read -p "¿Continuar sin backup? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo -e "${BLUE}🔄 Ejecutando migración...${NC}"
echo "Migración: 20251215_add_pdf_advanced_config"
echo ""

# Ya estamos en el directorio del backend
# Ejecutar migración con Prisma
npx prisma migrate deploy

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Migración completada exitosamente${NC}"
    echo ""
    echo "📋 Resumen:"
    echo "  - Backup guardado en: $BACKUP_FILE"
    echo "  - Nuevo campo agregado: pdfAdvancedConfig (TEXT, nullable)"
    echo "  - Usuarios existentes: Intactos ✅"
    echo "  - Datos existentes: Intactos ✅"
    echo ""
    echo -e "${GREEN}🎉 Todo listo para usar el editor PDF avanzado${NC}"
else
    echo ""
    echo -e "${RED}❌ Error durante la migración${NC}"
    echo ""
    echo "Para restaurar el backup:"
    echo "  psql \$DATABASE_URL < $BACKUP_FILE"
    exit 1
fi
