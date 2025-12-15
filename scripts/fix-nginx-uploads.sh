#!/bin/bash

# 🔧 Script para corregir configuración de Nginx en producción
# Agrega soporte para servir archivos /uploads/

set -e

echo "🔧 SimpliFaq - Fix Nginx /uploads Configuration"
echo "================================================"
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Verificar si estamos en el directorio correcto
if [ ! -f "infrastructure/nginx/nginx.conf" ]; then
    echo -e "${RED}❌ Error: No se encuentra infrastructure/nginx/nginx.conf${NC}"
    echo "   Ejecuta este script desde la raíz del proyecto"
    exit 1
fi

# Preguntar host del VPS
echo -e "${BLUE}🌐 Ingresa el host del VPS:${NC}"
read -p "Host (ej: my.simplifaq.ch o IP): " VPS_HOST

if [ -z "$VPS_HOST" ]; then
    echo -e "${RED}❌ Host no puede estar vacío${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}👤 Ingresa el usuario SSH:${NC}"
read -p "Usuario (default: root): " VPS_USER
VPS_USER=${VPS_USER:-root}

echo ""
echo -e "${YELLOW}📋 Configuración:${NC}"
echo "   Host: $VPS_HOST"
echo "   Usuario: $VPS_USER"
echo ""
read -p "¿Continuar? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠️  Operación cancelada${NC}"
    exit 0
fi

echo ""
echo -e "${GREEN}✅ Paso 1: Verificando conexión SSH...${NC}"
if ! ssh -o ConnectTimeout=5 "$VPS_USER@$VPS_HOST" "echo 'Conexión exitosa'" 2>/dev/null; then
    echo -e "${RED}❌ Error: No se pudo conectar al VPS${NC}"
    echo "   Verifica que:"
    echo "   - El host es correcto"
    echo "   - Tienes acceso SSH configurado"
    echo "   - Las llaves SSH están configuradas"
    exit 1
fi
echo -e "${GREEN}   ✓ Conexión SSH exitosa${NC}"

echo ""
echo -e "${GREEN}✅ Paso 2: Creando backup de nginx.conf...${NC}"
BACKUP_NAME="nginx.conf.backup-$(date +%Y%m%d-%H%M%S)"
ssh "$VPS_USER@$VPS_HOST" "sudo cp /etc/nginx/nginx.conf /etc/nginx/$BACKUP_NAME" 2>/dev/null || {
    echo -e "${YELLOW}   ⚠️  No se pudo hacer backup (puede que nginx esté en Docker)${NC}"
}
echo -e "${GREEN}   ✓ Backup creado: $BACKUP_NAME${NC}"

echo ""
echo -e "${GREEN}✅ Paso 3: Subiendo nueva configuración...${NC}"
scp infrastructure/nginx/nginx.conf "$VPS_USER@$VPS_HOST:/tmp/nginx.conf.new"
echo -e "${GREEN}   ✓ Archivo subido a /tmp/nginx.conf.new${NC}"

echo ""
echo -e "${GREEN}✅ Paso 4: Verificando directorio de uploads...${NC}"
ssh "$VPS_USER@$VPS_HOST" "ls -ld /var/www/simplifaq/my/backend/uploads/" 2>/dev/null || {
    echo -e "${YELLOW}   ⚠️  Creando directorio de uploads...${NC}"
    ssh "$VPS_USER@$VPS_HOST" "sudo mkdir -p /var/www/simplifaq/my/backend/uploads/logos"
    ssh "$VPS_USER@$VPS_HOST" "sudo chown -R www-data:www-data /var/www/simplifaq/my/backend/uploads/"
    ssh "$VPS_USER@$VPS_HOST" "sudo chmod -R 755 /var/www/simplifaq/my/backend/uploads/"
    echo -e "${GREEN}   ✓ Directorio creado con permisos correctos${NC}"
}

echo ""
echo -e "${BLUE}🔍 ¿Usas Docker para nginx? (y/n):${NC}"
read -p "> " -n 1 -r
echo ""
USE_DOCKER=$REPLY

if [[ $USE_DOCKER =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${BLUE}🐳 Ingresa el nombre del contenedor de nginx:${NC}"
    read -p "Nombre (default: nginx): " NGINX_CONTAINER
    NGINX_CONTAINER=${NGINX_CONTAINER:-nginx}
    
    echo ""
    echo -e "${GREEN}✅ Paso 5: Copiando configuración a contenedor Docker...${NC}"
    ssh "$VPS_USER@$VPS_HOST" "docker cp /tmp/nginx.conf.new $NGINX_CONTAINER:/etc/nginx/nginx.conf"
    
    echo ""
    echo -e "${GREEN}✅ Paso 6: Verificando sintaxis de nginx...${NC}"
    if ssh "$VPS_USER@$VPS_HOST" "docker exec $NGINX_CONTAINER nginx -t"; then
        echo -e "${GREEN}   ✓ Sintaxis correcta${NC}"
    else
        echo -e "${RED}❌ Error en sintaxis de nginx${NC}"
        echo -e "${YELLOW}   Restaurando backup...${NC}"
        ssh "$VPS_USER@$VPS_HOST" "docker exec $NGINX_CONTAINER cp /etc/nginx/$BACKUP_NAME /etc/nginx/nginx.conf"
        exit 1
    fi
    
    echo ""
    echo -e "${GREEN}✅ Paso 7: Recargando nginx...${NC}"
    ssh "$VPS_USER@$VPS_HOST" "docker exec $NGINX_CONTAINER nginx -s reload"
    echo -e "${GREEN}   ✓ Nginx recargado${NC}"
    
else
    echo ""
    echo -e "${GREEN}✅ Paso 5: Copiando configuración...${NC}"
    ssh "$VPS_USER@$VPS_HOST" "sudo cp /tmp/nginx.conf.new /etc/nginx/nginx.conf"
    
    echo ""
    echo -e "${GREEN}✅ Paso 6: Verificando sintaxis de nginx...${NC}"
    if ssh "$VPS_USER@$VPS_HOST" "sudo nginx -t"; then
        echo -e "${GREEN}   ✓ Sintaxis correcta${NC}"
    else
        echo -e "${RED}❌ Error en sintaxis de nginx${NC}"
        echo -e "${YELLOW}   Restaurando backup...${NC}"
        ssh "$VPS_USER@$VPS_HOST" "sudo cp /etc/nginx/$BACKUP_NAME /etc/nginx/nginx.conf"
        exit 1
    fi
    
    echo ""
    echo -e "${GREEN}✅ Paso 7: Recargando nginx...${NC}"
    ssh "$VPS_USER@$VPS_HOST" "sudo systemctl reload nginx"
    echo -e "${GREEN}   ✓ Nginx recargado${NC}"
fi

echo ""
echo -e "${GREEN}✅ Paso 8: Verificando configuración...${NC}"
echo -e "${BLUE}   Probando URL de uploads...${NC}"
sleep 2

# Intentar cargar una imagen de test si existe
TEST_URL="https://$VPS_HOST/uploads/test.txt"
echo "Test from fix-nginx-uploads.sh" | ssh "$VPS_USER@$VPS_HOST" "sudo tee /var/www/simplifaq/my/backend/uploads/test.txt > /dev/null"
ssh "$VPS_USER@$VPS_HOST" "sudo chmod 644 /var/www/simplifaq/my/backend/uploads/test.txt"

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$TEST_URL" 2>/dev/null || echo "000")

if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}   ✓ URL de uploads funciona correctamente (HTTP 200)${NC}"
else
    echo -e "${YELLOW}   ⚠️  URL de uploads responde con HTTP $HTTP_STATUS${NC}"
    echo -e "${YELLOW}   Esto puede ser normal si no hay archivos aún${NC}"
fi

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ CONFIGURACIÓN APLICADA EXITOSAMENTE${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}📋 Próximos pasos:${NC}"
echo ""
echo "1. Prueba subir un logo desde la aplicación:"
echo "   https://$VPS_HOST → Configuración → Logo"
echo ""
echo "2. Verifica que la imagen se carga sin error 404"
echo ""
echo "3. Si hay problemas, revisa los logs:"
if [[ $USE_DOCKER =~ ^[Yy]$ ]]; then
    echo "   docker logs $NGINX_CONTAINER"
else
    echo "   sudo tail -f /var/log/nginx/error.log"
fi
echo ""
echo -e "${YELLOW}💾 Backup guardado en:${NC} /etc/nginx/$BACKUP_NAME"
echo ""
