#!/bin/bash

# ============================================
# SimpliFaq - Generador de Secretos para Producción
# ============================================
# Este script genera todos los secretos necesarios
# para el archivo .env.production
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log() { echo -e "${BLUE}$1${NC}"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; exit 1; }

# Header
clear
echo "============================================"
echo "  SimpliFaq - Production Secrets Generator  "
echo "============================================"
echo ""
log "🔐 Generando secretos seguros para producción..."
echo ""

# Check if openssl is available
if ! command -v openssl &> /dev/null; then
    error "openssl no está instalado. Instálalo con: sudo apt install openssl"
fi

# Generate secrets
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
POSTGRES_REPLICATION_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
REDIS_PASSWORD=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-24)
BACKUP_ENCRYPTION_KEY=$(openssl rand -hex 32)
GRAFANA_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)

# Display results
echo "============================================"
echo "  SECRETOS GENERADOS"
echo "============================================"
echo ""

log "📋 Copia estos valores a tu archivo .env.production:"
echo ""

echo -e "${GREEN}# PostgreSQL${NC}"
echo "POSTGRES_PASSWORD=$POSTGRES_PASSWORD"
echo "POSTGRES_REPLICATION_PASSWORD=$POSTGRES_REPLICATION_PASSWORD"
echo ""

echo -e "${GREEN}# Redis${NC}"
echo "REDIS_PASSWORD=$REDIS_PASSWORD"
echo ""

echo -e "${GREEN}# Backup${NC}"
echo "BACKUP_ENCRYPTION_KEY=$BACKUP_ENCRYPTION_KEY"
echo ""

echo -e "${GREEN}# Grafana (Monitoring)${NC}"
echo "GRAFANA_USER=admin"
echo "GRAFANA_PASSWORD=$GRAFANA_PASSWORD"
echo ""

echo "============================================"
warning "⚠️  IMPORTANTE: GUARDA ESTOS VALORES DE FORMA SEGURA"
warning "⚠️  NO los compartas ni los subas a Git"
echo "============================================"
echo ""

# Optionally save to a file
read -p "¿Deseas guardar estos valores en un archivo temporal? (s/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    SECRETS_FILE="production-secrets-$(date +%Y%m%d-%H%M%S).txt"
    
    cat > "$SECRETS_FILE" << EOF
# SimpliFaq Production Secrets
# Generated: $(date)
# ⚠️ DELETE THIS FILE after copying to .env.production

# PostgreSQL
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
POSTGRES_REPLICATION_PASSWORD=$POSTGRES_REPLICATION_PASSWORD

# Redis
REDIS_PASSWORD=$REDIS_PASSWORD

# Backup
BACKUP_ENCRYPTION_KEY=$BACKUP_ENCRYPTION_KEY

# Grafana (Monitoring)
GRAFANA_USER=admin
GRAFANA_PASSWORD=$GRAFANA_PASSWORD

# ============================================
# NEXT STEPS:
# ============================================
# 1. Copia estos valores a backend/.env.production
# 2. Completa también:
#    - COMPANY_IBAN
#    - COMPANY_VAT_NUMBER
# 3. Verifica DATABASE_URL usa "postgres" como host (no "localhost")
# 4. Verifica REDIS_URL usa "redis" como host (no "localhost")
# 5. Verifica PORT=3000 (interno del contenedor)
# 6. DELETE THIS FILE: rm $SECRETS_FILE
# ============================================
EOF

    chmod 600 "$SECRETS_FILE"
    success "Secretos guardados en: $SECRETS_FILE"
    warning "⚠️  BORRA este archivo después de copiar los valores: rm $SECRETS_FILE"
fi

echo ""
log "📝 Próximos pasos:"
echo "1. Copia los valores generados a backend/.env.production"
echo "2. Completa COMPANY_IBAN y COMPANY_VAT_NUMBER"
echo "3. Verifica que DATABASE_URL use 'postgres' como host (no 'localhost')"
echo "4. Verifica que REDIS_URL use 'redis' como host (no 'localhost')"
echo "5. Verifica que PORT=3000 (no 3031)"
echo "6. Protege el archivo: chmod 600 backend/.env.production"
echo ""

success "¡Listo! Secretos generados correctamente."
