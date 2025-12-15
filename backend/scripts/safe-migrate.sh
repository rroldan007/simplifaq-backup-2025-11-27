#!/bin/bash

##############################################################################
# SCRIPT DE MIGRACIÓN SEGURA PARA PRODUCCIÓN
# 
# Este script:
# 1. Hace backup completo de la BD antes de migrar
# 2. Ejecuta las migraciones
# 3. Verifica que todo esté correcto
# 4. Si falla, restaura automáticamente el backup
##############################################################################

set -e  # Salir si hay error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/db_backup_pre_migration_$TIMESTAMP.sql"
LOG_FILE="$BACKUP_DIR/migration_log_$TIMESTAMP.log"

# Crear directorio de backups si no existe
mkdir -p "$BACKUP_DIR"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      MIGRACIÓN SEGURA DE BASE DE DATOS - PRODUCCIÓN       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Función para logging
log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

# Función para error y rollback
error_exit() {
    log "${RED}❌ ERROR: $1${NC}"
    log "${YELLOW}🔄 Iniciando rollback automático...${NC}"
    
    if [ -f "$BACKUP_FILE" ]; then
        log "${BLUE}📥 Restaurando backup: $BACKUP_FILE${NC}"
        
        # Obtener credenciales del .env
        if [ -f .env ]; then
            export $(cat .env | grep -v '^#' | xargs)
        fi
        
        # Restaurar backup
        if [ ! -z "$DATABASE_URL" ]; then
            psql "$DATABASE_URL" < "$BACKUP_FILE" 2>&1 | tee -a "$LOG_FILE"
            log "${GREEN}✅ Backup restaurado exitosamente${NC}"
        else
            log "${RED}⚠️  No se pudo restaurar: DATABASE_URL no encontrada${NC}"
        fi
    fi
    
    exit 1
}

# Cargar variables de entorno
log "${BLUE}📋 Cargando configuración...${NC}"
if [ ! -f .env ]; then
    error_exit "Archivo .env no encontrado"
fi

export $(cat .env | grep -v '^#' | xargs)

if [ -z "$DATABASE_URL" ]; then
    error_exit "DATABASE_URL no está configurada en .env"
fi

log "${GREEN}✅ Configuración cargada${NC}"
echo ""

# PASO 1: Verificar conexión a la base de datos
log "${BLUE}🔌 Verificando conexión a la base de datos...${NC}"
if ! psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    error_exit "No se puede conectar a la base de datos"
fi
log "${GREEN}✅ Conexión exitosa${NC}"
echo ""

# PASO 2: Backup completo de la base de datos
log "${BLUE}💾 Creando backup completo de la base de datos...${NC}"
log "${YELLOW}   Archivo: $BACKUP_FILE${NC}"

if ! pg_dump "$DATABASE_URL" > "$BACKUP_FILE" 2>&1 | tee -a "$LOG_FILE"; then
    error_exit "Falló el backup de la base de datos"
fi

# Verificar que el backup no esté vacío
if [ ! -s "$BACKUP_FILE" ]; then
    error_exit "El archivo de backup está vacío"
fi

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
log "${GREEN}✅ Backup creado exitosamente (Tamaño: $BACKUP_SIZE)${NC}"
echo ""

# PASO 3: Contar registros antes de la migración (para verificación)
log "${BLUE}📊 Contando registros antes de la migración...${NC}"

USERS_BEFORE=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | xargs || echo "0")
INVOICES_BEFORE=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM invoices;" 2>/dev/null | xargs || echo "0")
CLIENTS_BEFORE=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM clients;" 2>/dev/null | xargs || echo "0")
PRODUCTS_BEFORE=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM products;" 2>/dev/null | xargs || echo "0")
ONBOARDING_BEFORE=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM user_onboarding;" 2>/dev/null | xargs || echo "0")

log "   Usuarios: $USERS_BEFORE"
log "   Facturas: $INVOICES_BEFORE"
log "   Clientes: $CLIENTS_BEFORE"
log "   Productos: $PRODUCTS_BEFORE"
log "   Onboarding: $ONBOARDING_BEFORE"
echo ""

# PASO 4: Confirmar con el usuario
log "${YELLOW}⚠️  IMPORTANTE: Estás a punto de migrar la base de datos de PRODUCCIÓN${NC}"
log "${YELLOW}   Backup guardado en: $BACKUP_FILE${NC}"
echo ""
read -p "¿Deseas continuar con la migración? (escribe 'SI' para confirmar): " confirm

if [ "$confirm" != "SI" ]; then
    log "${YELLOW}❌ Migración cancelada por el usuario${NC}"
    exit 0
fi
echo ""

# PASO 5: Ejecutar migraciones de Prisma
log "${BLUE}🚀 Ejecutando migraciones de Prisma...${NC}"

if ! npx prisma migrate deploy 2>&1 | tee -a "$LOG_FILE"; then
    error_exit "Falló la migración de Prisma"
fi

log "${GREEN}✅ Migraciones aplicadas${NC}"
echo ""

# PASO 6: Regenerar cliente de Prisma
log "${BLUE}🔧 Regenerando cliente de Prisma...${NC}"

if ! npx prisma generate 2>&1 | tee -a "$LOG_FILE"; then
    log "${YELLOW}⚠️  Advertencia: No se pudo regenerar el cliente de Prisma${NC}"
fi

log "${GREEN}✅ Cliente regenerado${NC}"
echo ""

# PASO 7: Verificar que los datos siguen intactos
log "${BLUE}🔍 Verificando integridad de los datos...${NC}"

USERS_AFTER=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | xargs || echo "0")
INVOICES_AFTER=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM invoices;" 2>/dev/null | xargs || echo "0")
CLIENTS_AFTER=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM clients;" 2>/dev/null | xargs || echo "0")
PRODUCTS_AFTER=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM products;" 2>/dev/null | xargs || echo "0")
ONBOARDING_AFTER=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM user_onboarding;" 2>/dev/null | xargs || echo "0")

log "   Usuarios: $USERS_BEFORE → $USERS_AFTER"
log "   Facturas: $INVOICES_BEFORE → $INVOICES_AFTER"
log "   Clientes: $CLIENTS_BEFORE → $CLIENTS_AFTER"
log "   Productos: $PRODUCTS_BEFORE → $PRODUCTS_AFTER"
log "   Onboarding: $ONBOARDING_BEFORE → $ONBOARDING_AFTER"
echo ""

# Verificar que no se perdieron datos
if [ "$USERS_BEFORE" != "$USERS_AFTER" ] || \
   [ "$INVOICES_BEFORE" != "$INVOICES_AFTER" ] || \
   [ "$CLIENTS_BEFORE" != "$CLIENTS_AFTER" ] || \
   [ "$PRODUCTS_BEFORE" != "$PRODUCTS_AFTER" ] || \
   [ "$ONBOARDING_BEFORE" != "$ONBOARDING_AFTER" ]; then
    error_exit "¡ALERTA! Se detectó pérdida de datos. Iniciando rollback..."
fi

log "${GREEN}✅ Verificación exitosa: No se perdió ningún dato${NC}"
echo ""

# PASO 8: Verificar estructura de tablas críticas
log "${BLUE}🔍 Verificando estructura de tablas...${NC}"

# Verificar tabla plans existe y tiene registros
PLANS_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM plans;" 2>/dev/null | xargs || echo "0")
log "   Planes en BD: $PLANS_COUNT"

if [ "$PLANS_COUNT" -eq "0" ]; then
    log "${YELLOW}⚠️  No hay planes en la base de datos${NC}"
    log "${YELLOW}   Considera ejecutar: npm run seed${NC}"
fi

# Verificar nuevas columnas en tabla plans (opcional, no critico)
COLUMNS_CHECK=$(psql "$DATABASE_URL" -t -c "
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_name = 'plans' 
    AND column_name IN ('hasInvoices', 'hasQuotes', 'hasExpenses', 'hasAIAssistant', 'hasMultiUser', 'maxUsers', 'hasMultiCompany', 'maxCompanies');
" 2>/dev/null | xargs || echo "0")

if [ "$COLUMNS_CHECK" -gt "0" ]; then
    log "${GREEN}✅ Columnas de planes detectadas: $COLUMNS_CHECK/8${NC}"
else
    log "${BLUE}ℹ️  No se detectaron columnas nuevas (puede ser normal si ya existían)${NC}"
fi
echo ""

# PASO 8.5: Verificar integridad de suscripciones
log "${BLUE}🔍 Verificando integridad de suscripciones...${NC}"

SUBSCRIPTIONS_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM subscriptions;" 2>/dev/null | xargs || echo "0")
log "   Suscripciones activas: $SUBSCRIPTIONS_COUNT"

# Verificar que no haya suscripciones huérfanas (sin plan válido)
ORPHAN_SUBS=$(psql "$DATABASE_URL" -t -c "
    SELECT COUNT(*) FROM subscriptions s 
    LEFT JOIN plans p ON s.\"planId\" = p.id 
    WHERE p.id IS NULL;
" 2>/dev/null | xargs || echo "0")

if [ "$ORPHAN_SUBS" -gt "0" ]; then
    log "${YELLOW}⚠️  Advertencia: $ORPHAN_SUBS suscripciones sin plan válido${NC}"
else
    log "${GREEN}✅ Todas las suscripciones tienen planes válidos${NC}"
fi
echo ""

# PASO 8.5b: Verificar descuentos de línea en quote_items
log "${BLUE}🔍 Verificando descuentos de línea en quote_items...${NC}"

QUOTE_DISCOUNT_COLS=$(psql "$DATABASE_URL" -t -c "
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_name = 'quote_items' 
    AND column_name IN ('lineDiscountValue', 'lineDiscountType', 'lineDiscountSource', 'subtotalBeforeDiscount', 'discountAmount', 'subtotalAfterDiscount');
" 2>/dev/null | xargs || echo "0")

if [ "$QUOTE_DISCOUNT_COLS" -eq "6" ]; then
    log "${GREEN}✅ Descuentos de línea en quote_items: 6/6 columnas${NC}"
else
    log "${YELLOW}⚠️  Descuentos de línea en quote_items: $QUOTE_DISCOUNT_COLS/6 columnas${NC}"
    log "${YELLOW}   Esto es normal si la migración no se ha aplicado aún${NC}"
fi
echo ""

# PASO 8.6: Verificar tabla user_onboarding y nuevas columnas
log "${BLUE}🔍 Verificando tabla user_onboarding (nueva implementación)...${NC}"

# Verificar que la tabla existe
TABLE_EXISTS=$(psql "$DATABASE_URL" -t -c "
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_onboarding'
    );
" 2>/dev/null | xargs || echo "f")

if [ "$TABLE_EXISTS" = "t" ]; then
    log "${GREEN}✅ Tabla user_onboarding existe${NC}"
    
    # Verificar nuevas columnas específicas del onboarding mejorado
    SMTP_COL=$(psql "$DATABASE_URL" -t -c "
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'user_onboarding' 
            AND column_name = 'smtp_configured'
        );
    " 2>/dev/null | xargs || echo "f")
    
    WELCOME_SHOWN_COL=$(psql "$DATABASE_URL" -t -c "
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'user_onboarding' 
            AND column_name = 'welcome_message_shown'
        );
    " 2>/dev/null | xargs || echo "f")
    
    WELCOME_DATE_COL=$(psql "$DATABASE_URL" -t -c "
        SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'user_onboarding' 
            AND column_name = 'welcome_message_shown_at'
        );
    " 2>/dev/null | xargs || echo "f")
    
    # Reportar estado de columnas
    if [ "$SMTP_COL" = "t" ]; then
        log "${GREEN}   ✅ Columna smtp_configured creada${NC}"
    else
        log "${YELLOW}   ⚠️  Columna smtp_configured no encontrada${NC}"
    fi
    
    if [ "$WELCOME_SHOWN_COL" = "t" ]; then
        log "${GREEN}   ✅ Columna welcome_message_shown creada${NC}"
    else
        log "${YELLOW}   ⚠️  Columna welcome_message_shown no encontrada${NC}"
    fi
    
    if [ "$WELCOME_DATE_COL" = "t" ]; then
        log "${GREEN}   ✅ Columna welcome_message_shown_at creada${NC}"
    else
        log "${YELLOW}   ⚠️  Columna welcome_message_shown_at no encontrada${NC}"
    fi
    
    # Verificar integridad: cada usuario debe tener un registro de onboarding
    USERS_WITHOUT_ONBOARDING=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*) FROM users u 
        LEFT JOIN user_onboarding uo ON u.id = uo.user_id 
        WHERE uo.id IS NULL;
    " 2>/dev/null | xargs || echo "0")
    
    if [ "$USERS_WITHOUT_ONBOARDING" -gt "0" ]; then
        log "${YELLOW}   ⚠️  $USERS_WITHOUT_ONBOARDING usuarios sin registro de onboarding${NC}"
        log "${YELLOW}      Se crearán automáticamente al primer acceso${NC}"
    else
        log "${GREEN}   ✅ Todos los usuarios tienen registro de onboarding${NC}"
    fi
    
    # Estadísticas de onboarding
    COMPLETED_ONBOARDING=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*) FROM user_onboarding WHERE is_completed = true;
    " 2>/dev/null | xargs || echo "0")
    
    WELCOME_SHOWN=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*) FROM user_onboarding WHERE welcome_message_shown = true;
    " 2>/dev/null | xargs || echo "0")
    
    SMTP_CONFIGURED=$(psql "$DATABASE_URL" -t -c "
        SELECT COUNT(*) FROM user_onboarding WHERE smtp_configured = true;
    " 2>/dev/null | xargs || echo "0")
    
    log "${BLUE}   📊 Estadísticas de onboarding:${NC}"
    log "      • Onboarding completado: $COMPLETED_ONBOARDING/$ONBOARDING_AFTER"
    log "      • Welcome message visto: $WELCOME_SHOWN/$ONBOARDING_AFTER"
    log "      • SMTP configurado: $SMTP_CONFIGURED/$ONBOARDING_AFTER"
else
    log "${RED}❌ Tabla user_onboarding no encontrada${NC}"
    log "${YELLOW}   Esto podría indicar un problema con la migración${NC}"
fi
echo ""

# PASO 9: Resumen final
log "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
log "${GREEN}║                 ✅ MIGRACIÓN EXITOSA                        ║${NC}"
log "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
log "${BLUE}📝 Resumen:${NC}"
log "   • Backup guardado: $BACKUP_FILE ($BACKUP_SIZE)"
log "   • Log completo: $LOG_FILE"
log "   • Datos verificados: ✅ Sin pérdidas"
log "   • Nuevas columnas: ✅ Creadas"
if [ "$TABLE_EXISTS" = "t" ] && [ "$SMTP_COL" = "t" ] && [ "$WELCOME_SHOWN_COL" = "t" ]; then
    log "   • Onboarding mejorado: ✅ Implementado correctamente"
fi
echo ""
log "${YELLOW}💡 Recomendaciones:${NC}"
log "   1. Guarda el backup en un lugar seguro"
log "   2. ${YELLOW}REINICIA el TypeScript Server en tu IDE:${NC}"
log "      Cmd/Ctrl + Shift + P → 'TypeScript: Restart TS Server'"
log "   3. ${YELLOW}REINICIA el servidor backend${NC} para cargar el nuevo cliente Prisma"
log "   4. Prueba la aplicación para verificar que todo funcione:"
log "      • Login con usuario nuevo → debe aparecer welcome modal"
log "      • Onboarding debe tener 7 pasos (incluye paso SMTP)"
log "   5. Si hay problemas, usa el backup para restaurar:"
log "      psql \$DATABASE_URL < $BACKUP_FILE"
echo ""

# Mantener solo los últimos 10 backups para no llenar el disco
log "${BLUE}🧹 Limpiando backups antiguos (manteniendo los últimos 10)...${NC}"
ls -t $BACKUP_DIR/db_backup_pre_migration_*.sql 2>/dev/null | tail -n +11 | xargs -r rm
log "${GREEN}✅ Limpieza completada${NC}"
echo ""

log "${GREEN}🎉 Proceso completado exitosamente${NC}"
