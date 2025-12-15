#!/bin/bash

# 🇨🇭 SimpliFaq - Script de Desarrollo Simplificado
# Este script inicia la aplicación en modo desarrollo sin Docker

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}🇨🇭 SimpliFaq - Iniciando en modo desarrollo...${NC}"

# Función para verificar si un comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Función para matar procesos en puertos específicos
kill_port() {
    local port=$1
    local pid=$(lsof -ti:$port 2>/dev/null || true)
    if [ ! -z "$pid" ]; then
        echo -e "${YELLOW}🔄 Liberando puerto $port (PID: $pid)${NC}"
        kill -9 $pid 2>/dev/null || true
        sleep 1
    fi
}

# Verificar dependencias básicas
echo -e "${YELLOW}📋 Verificando dependencias...${NC}"

if ! command_exists node; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    echo -e "${YELLOW}   Instala Node.js desde: https://nodejs.org/${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}❌ npm no está instalado${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node --version) y npm $(npm --version) encontrados${NC}"

# Verificar e instalar dependencias
echo -e "${YELLOW}📦 Verificando dependencias del proyecto...${NC}"

if [ ! -d "backend/node_modules" ]; then
    echo -e "${CYAN}📦 Instalando dependencias del backend...${NC}"
    cd backend
    npm install
    cd ..
    echo -e "${GREEN}✅ Dependencias del backend instaladas${NC}"
else
    echo -e "${GREEN}✅ Dependencias del backend ya instaladas${NC}"
fi

if [ ! -d "frontend/node_modules" ]; then
    echo -e "${CYAN}📦 Instalando dependencias del frontend...${NC}"
    cd frontend
    npm install
    cd ..
    echo -e "${GREEN}✅ Dependencias del frontend instaladas${NC}"
else
    echo -e "${GREEN}✅ Dependencias del frontend ya instaladas${NC}"
fi

# Configurar base de datos SQLite para desarrollo (más simple)
echo -e "${YELLOW}🗄️  Configurando base de datos de desarrollo...${NC}"

# Crear/actualizar archivo .env para el backend
echo -e "${CYAN}📝 Configurando archivo .env para desarrollo...${NC}"
cat > backend/.env << EOF
# SimpliFaq - Development Environment
NODE_ENV=development
PORT=3001

# Database (SQLite para desarrollo)
DATABASE_URL="file:./dev.db"

# JWT
JWT_SECRET=dev_jwt_secret_key_for_testing_only_32_chars_long
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:3000

# Swiss Configuration
SWISS_QR_BILL_ENABLED=true
SWISS_TVA_RATES_STANDARD=0.081
SWISS_TVA_RATES_REDUCED=0.026
SWISS_TVA_RATES_SPECIAL=0.038

# File Upload
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,application/pdf

# Logging
LOG_LEVEL=debug
EOF
echo -e "${GREEN}✅ Archivo .env actualizado${NC}"

# Configurar Prisma para SQLite
echo -e "${CYAN}🔧 Configurando Prisma...${NC}"
cd backend

# Usar esquema de desarrollo
export PRISMA_SCHEMA_FILE="prisma/schema.dev.prisma"

# Generar cliente Prisma
echo -e "${CYAN}📝 Generando cliente Prisma...${NC}"
npx prisma generate --schema=prisma/schema.dev.prisma

# Aplicar migraciones
echo -e "${CYAN}🗄️  Configurando base de datos SQLite...${NC}"
npx prisma db push --schema=prisma/schema.dev.prisma --accept-data-loss

echo -e "${GREEN}✅ Base de datos SQLite configurada${NC}"

cd ..

# Crear archivo .env para el frontend si no existe
if [ ! -f "frontend/.env" ]; then
    echo -e "${CYAN}📝 Creando configuración del frontend...${NC}"
    cat > frontend/.env << EOF
VITE_API_URL=http://localhost:3001
VITE_APP_NAME=SimpliFaq
VITE_APP_VERSION=1.0.0-dev
EOF
    echo -e "${GREEN}✅ Configuración del frontend creada${NC}"
fi

# Liberar puertos si están ocupados
kill_port 3001  # Backend
kill_port 3000  # Frontend

echo -e "${GREEN}🚀 Iniciando SimpliFaq en modo desarrollo...${NC}"

# Función para manejar la interrupción
cleanup() {
    echo -e "\n${YELLOW}🛑 Deteniendo SimpliFaq...${NC}"
    kill_port 3001
    kill_port 3000
    exit 0
}

# Capturar Ctrl+C
trap cleanup INT

# Crear directorios de logs si no existen
mkdir -p logs

# Iniciar backend en background
echo -e "${BLUE}🔧 Iniciando backend en puerto 3001...${NC}"
cd backend
# Seleccionar entrypoint correcto
ENTRY_FILE="src/index.dev.ts"
if [ ! -f "$ENTRY_FILE" ]; then
  ENTRY_FILE="src/index.ts"
fi
echo -e "${CYAN}▶ Ejecutando: $ENTRY_FILE con ts-node-dev${NC}"
npx ts-node-dev --respawn --transpile-only "$ENTRY_FILE" > ../logs/backend-dev.log 2>&1 &
BACKEND_PID=$!
cd ..

# Esperar a que el backend esté listo
echo -e "${YELLOW}⏳ Esperando que el backend esté listo...${NC}"
sleep 5  # Dar más tiempo inicial para que el servidor se inicie
for i in {1..30}; do
    if curl -s http://localhost:3001/api/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend listo en http://localhost:3001${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Backend no respondió en 30 segundos${NC}"
        echo -e "${YELLOW}📋 Últimas líneas del log:${NC}"
        tail -20 logs/backend-dev.log
        echo -e "${YELLOW}🔍 Verificando si el proceso está corriendo...${NC}"
        if kill -0 $BACKEND_PID 2>/dev/null; then
            echo -e "${GREEN}✅ El proceso del backend está corriendo (PID: $BACKEND_PID)${NC}"
            echo -e "${YELLOW}🌐 Intentando conexión directa...${NC}"
            curl -v http://localhost:3001/api/health || true
        else
            echo -e "${RED}❌ El proceso del backend se detuvo${NC}"
        fi
        cleanup
        exit 1
    fi
    sleep 1
    echo -n "."
done

# Iniciar frontend en background
echo -e "${BLUE}🎨 Iniciando frontend en puerto 3000...${NC}"
cd frontend
npm run dev > ../logs/frontend-dev.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Esperar a que el frontend esté listo
echo -e "${YELLOW}⏳ Esperando que el frontend esté listo...${NC}"
for i in {1..45}; do
    if curl -s http://localhost:3000 >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend listo en http://localhost:3000${NC}"
        break
    fi
    if [ $i -eq 45 ]; then
        echo -e "${RED}❌ Frontend no respondió en 45 segundos${NC}"
        echo -e "${YELLOW}📋 Últimas líneas del log:${NC}"
        tail -20 logs/frontend-dev.log
        cleanup
        exit 1
    fi
    sleep 1
    echo -n "."
done

# Mostrar información de la aplicación
echo -e "\n${GREEN}🎉 ¡SimpliFaq está funcionando en modo desarrollo!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📱 Aplicación Web:${NC} http://localhost:3000"
echo -e "${GREEN}🔧 API Backend:${NC} http://localhost:3001"
echo -e "${GREEN}📊 Health Check:${NC} http://localhost:3001/api/health"
echo -e "${GREEN}🗄️  Base de datos:${NC} SQLite (backend/dev.db)"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "\n${YELLOW}🎯 Funcionalidades disponibles para probar:${NC}"
echo -e "${GREEN}✅${NC} Registro de empresa suiza"
echo -e "${GREEN}✅${NC} Sistema de autenticación"
echo -e "${GREEN}✅${NC} Gestión de clientes"
echo -e "${GREEN}✅${NC} Gestión de productos/servicios"
echo -e "${GREEN}✅${NC} Creación de facturas con TVA suiza"
echo -e "${GREEN}✅${NC} Generación de Swiss QR Bills"
echo -e "${GREEN}✅${NC} Exportación PDF de facturas"
echo -e "${GREEN}✅${NC} Sistema de reportes"
echo -e "${GREEN}✅${NC} Importación CSV"

echo -e "\n${CYAN}🔐 Para probar la aplicación:${NC}"
echo -e "${YELLOW}1.${NC} Ve a http://localhost:3000"
echo -e "${YELLOW}2.${NC} Haz clic en 'Créer un compte' para registrarte"
echo -e "${YELLOW}3.${NC} Completa el formulario con datos de empresa suiza"
echo -e "${YELLOW}4.${NC} Explora las funcionalidades"

echo -e "\n${CYAN}📋 Comandos útiles:${NC}"
echo -e "${YELLOW}Ver logs backend:${NC} tail -f logs/backend-dev.log"
echo -e "${YELLOW}Ver logs frontend:${NC} tail -f logs/frontend-dev.log"
echo -e "${YELLOW}Base de datos:${NC} cd backend && npx prisma studio"

echo -e "\n${BLUE}🌐 Intentando abrir navegador...${NC}"

# Intentar abrir el navegador
if command_exists xdg-open; then
    xdg-open http://localhost:3000 >/dev/null 2>&1 &
elif command_exists open; then
    open http://localhost:3000 >/dev/null 2>&1 &
elif command_exists start; then
    start http://localhost:3000 >/dev/null 2>&1 &
else
    echo -e "${YELLOW}No se pudo abrir el navegador automáticamente${NC}"
    echo -e "${YELLOW}Abre manualmente: http://localhost:3000${NC}"
fi

echo -e "\n${YELLOW}⏹️  Para detener la aplicación, presiona Ctrl+C${NC}"
echo -e "${BLUE}🔄 Monitoreando servicios...${NC}"

# Mantener el script corriendo y verificar servicios
while true; do
    sleep 10
    
    # Verificar si los procesos siguen corriendo
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo -e "\n${RED}❌ Backend se detuvo inesperadamente${NC}"
        echo -e "${YELLOW}📋 Últimas líneas del log:${NC}"
        tail -10 logs/backend-dev.log
        break
    fi
    
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        echo -e "\n${RED}❌ Frontend se detuvo inesperadamente${NC}"
        echo -e "${YELLOW}📋 Últimas líneas del log:${NC}"
        tail -10 logs/frontend-dev.log
        break
    fi
    
    # Mostrar estado cada minuto
    echo -e "${GREEN}.${NC}" | tr -d '\n'
done

cleanup