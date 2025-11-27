#!/bin/bash

# 🇨🇭 SimpliFaq - Script de Inicio Rápido
# Este script inicia la aplicación completa para pruebas

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🇨🇭 SimpliFaq - Iniciando aplicación completa...${NC}"

# Función para verificar si un comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Verificar dependencias
echo -e "${YELLOW}📋 Verificando dependencias...${NC}"

if ! command_exists node; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}❌ npm no está instalado${NC}"
    exit 1
fi

if ! command_exists psql; then
    echo -e "${YELLOW}⚠️  PostgreSQL client no encontrado. Asegúrate de que PostgreSQL esté instalado.${NC}"
fi

echo -e "${GREEN}✅ Dependencias verificadas${NC}"

# Verificar si las dependencias están instaladas
echo -e "${YELLOW}📦 Verificando node_modules...${NC}"

if [ ! -d "backend/node_modules" ]; then
    echo -e "${YELLOW}📦 Instalando dependencias del backend...${NC}"
    cd backend
    npm install
    cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}📦 Instalando dependencias del frontend...${NC}"
    cd frontend
    npm install
    cd ..
fi

echo -e "${GREEN}✅ Dependencias instaladas${NC}"

# Verificar base de datos
echo -e "${YELLOW}🗄️  Verificando base de datos...${NC}"

# Intentar conectar a la base de datos
if psql -d "postgresql://roberto@localhost:5432/simplifaq" -c "SELECT 1;" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Base de datos conectada${NC}"
else
    echo -e "${YELLOW}⚠️  No se pudo conectar a la base de datos. Intentando crear...${NC}"
    
    # Intentar crear la base de datos
    if createdb simplifaq 2>/dev/null; then
        echo -e "${GREEN}✅ Base de datos 'simplifaq' creada${NC}"
    else
        echo -e "${YELLOW}⚠️  No se pudo crear la base de datos automáticamente${NC}"
        echo -e "${YELLOW}   Por favor, crea la base de datos manualmente:${NC}"
        echo -e "${YELLOW}   createdb simplifaq${NC}"
    fi
fi

# Ejecutar migraciones de Prisma
echo -e "${YELLOW}🔄 Ejecutando migraciones de base de datos...${NC}"
cd backend
if npm run db:push >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Migraciones ejecutadas${NC}"
else
    echo -e "${YELLOW}⚠️  Error en migraciones. Continuando...${NC}"
fi

# Generar cliente Prisma
if npm run db:generate >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Cliente Prisma generado${NC}"
else
    echo -e "${YELLOW}⚠️  Error generando cliente Prisma${NC}"
fi

cd ..

# Función para matar procesos en puertos específicos
kill_port() {
    local port=$1
    local pid=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        echo -e "${YELLOW}🔄 Liberando puerto $port (PID: $pid)${NC}"
        kill -9 $pid 2>/dev/null || true
        sleep 1
    fi
}

# Liberar puertos si están ocupados
kill_port 3001  # Backend
kill_port 3000  # Frontend

echo -e "${GREEN}🚀 Iniciando SimpliFaq...${NC}"

# Función para manejar la interrupción
cleanup() {
    echo -e "\n${YELLOW}🛑 Deteniendo SimpliFaq...${NC}"
    kill_port 3001
    kill_port 3000
    exit 0
}

# Capturar Ctrl+C
trap cleanup INT

# Iniciar backend en background
echo -e "${BLUE}🔧 Iniciando backend en puerto 3001...${NC}"
cd backend
npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Esperar a que el backend esté listo
echo -e "${YELLOW}⏳ Esperando que el backend esté listo...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:3001/api/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend listo en http://localhost:3001${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Backend no respondió en 30 segundos${NC}"
        echo -e "${YELLOW}📋 Log del backend:${NC}"
        tail -20 backend.log
        exit 1
    fi
    sleep 1
done

# Iniciar frontend en background
echo -e "${BLUE}🎨 Iniciando frontend en puerto 3000...${NC}"
cd frontend
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Esperar a que el frontend esté listo
echo -e "${YELLOW}⏳ Esperando que el frontend esté listo...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:3000 >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend listo en http://localhost:3000${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Frontend no respondió en 30 segundos${NC}"
        echo -e "${YELLOW}📋 Log del frontend:${NC}"
        tail -20 frontend.log
        exit 1
    fi
    sleep 1
done

# Mostrar información de la aplicación
echo -e "\n${GREEN}🎉 ¡SimpliFaq está funcionando!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📱 Frontend:${NC} http://localhost:3000"
echo -e "${GREEN}🔧 Backend API:${NC} http://localhost:3001"
echo -e "${GREEN}📊 Health Check:${NC} http://localhost:3001/api/health"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "\n${YELLOW}🔐 Credenciales de prueba:${NC}"
echo -e "${GREEN}📧 Email:${NC} demo@chocolaterie-suisse.ch"
echo -e "${GREEN}🔑 Password:${NC} DemoSimpliFaq2024!"

echo -e "\n${YELLOW}🎯 Funcionalidades disponibles:${NC}"
echo -e "${GREEN}✅${NC} Sistema de autenticación completo"
echo -e "${GREEN}✅${NC} Gestión de clientes"
echo -e "${GREEN}✅${NC} Gestión de productos"
echo -e "${GREEN}✅${NC} Creación de facturas con TVA suiza"
echo -e "${GREEN}✅${NC} Importación CSV de productos"
echo -e "${GREEN}✅${NC} Generación de Swiss QR Bills"
echo -e "${GREEN}✅${NC} Sistema de reportes"
echo -e "${GREEN}✅${NC} Panel administrativo SaaS"
echo -e "${GREEN}✅${NC} Sistema centralizado de TVA"

echo -e "\n${BLUE}🌐 Abriendo navegador...${NC}"

# Intentar abrir el navegador
if command_exists xdg-open; then
    xdg-open http://localhost:3000 >/dev/null 2>&1 &
elif command_exists open; then
    open http://localhost:3000 >/dev/null 2>&1 &
elif command_exists start; then
    start http://localhost:3000 >/dev/null 2>&1 &
fi

echo -e "\n${YELLOW}📋 Logs en tiempo real:${NC}"
echo -e "${BLUE}Backend:${NC} tail -f backend.log"
echo -e "${BLUE}Frontend:${NC} tail -f frontend.log"

echo -e "\n${YELLOW}⏹️  Para detener la aplicación, presiona Ctrl+C${NC}"

# Mantener el script corriendo y mostrar logs
while true; do
    sleep 5
    
    # Verificar si los procesos siguen corriendo
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo -e "\n${RED}❌ Backend se detuvo inesperadamente${NC}"
        echo -e "${YELLOW}📋 Últimas líneas del log:${NC}"
        tail -10 backend.log
        break
    fi
    
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        echo -e "\n${RED}❌ Frontend se detuvo inesperadamente${NC}"
        echo -e "${YELLOW}📋 Últimas líneas del log:${NC}"
        tail -10 frontend.log
        break
    fi
done

cleanup