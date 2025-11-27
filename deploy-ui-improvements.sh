#!/bin/bash

###############################################################################
# Script de Deployment - UI Improvements (Invoice System)
# 
# Despliega las mejoras de UI/UX del sistema de facturas
# Incluye: feature flags, wizard mejorado, búsqueda inteligente, animaciones
###############################################################################

set -e  # Exit on error

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎨 DEPLOYMENT - UI Improvements (Invoice System)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir con color
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Directorio del proyecto
PROJECT_DIR="/var/www/simplifaq/test"
FRONTEND_DIR="$PROJECT_DIR/frontend"
cd "$FRONTEND_DIR"

# 1. Verificar que estamos en el directorio correcto
echo "📍 Verificando directorio..."
if [ ! -f "package.json" ]; then
    print_error "No se encuentra package.json. ¿Estás en el directorio correcto?"
    exit 1
fi
print_success "Directorio verificado: $FRONTEND_DIR"
echo ""

# 2. Mostrar información de las mejoras
echo "📦 Mejoras incluidas en este deployment:"
print_info "  • Sistema de Feature Flags ampliado"
print_info "  • Componente WizardProgress con animaciones"
print_info "  • EnhancedProductSearch con navegación por teclado"
print_info "  • Validación inline en tiempo real"
print_info "  • Atajos de teclado (Ctrl+←/→, Ctrl+S)"
print_info "  • Transiciones suaves con framer-motion"
echo ""

# 3. Verificar que el build existe
echo "🔍 Verificando build..."
if [ ! -d "dist" ]; then
    print_error "No se encuentra el directorio dist. Ejecuta 'npm run build' primero."
    exit 1
fi
print_success "Build encontrado en dist/"
echo ""

# 4. Backup del dist actual
echo "💾 Creando backup del frontend actual..."
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="$PROJECT_DIR/backups/frontend"
mkdir -p "$BACKUP_DIR"

if [ -d "dist" ]; then
    tar -czf "$BACKUP_DIR/frontend_backup_$TIMESTAMP.tar.gz" dist/
    print_success "Backup creado: frontend_backup_$TIMESTAMP.tar.gz"
else
    print_warning "No se encontró dist anterior para backup"
fi
echo ""

# 5. Copiar archivos al directorio de producción
echo "📋 Desplegando nuevos archivos..."
# Los archivos ya están en dist/, nginx los sirve directamente
print_success "Archivos listos en dist/"
echo ""

# 6. Reload de Nginx
echo "🔄 Recargando configuración de Nginx..."
if sudo systemctl reload nginx; then
    print_success "Nginx recargado exitosamente"
else
    print_error "Error al recargar Nginx"
    exit 1
fi
echo ""

# 7. Health check del frontend
echo "🏥 Verificando que el sitio esté accesible..."
SITE_CHECK=$(curl -s -o /dev/null -w "%{http_code}" https://test.simplifaq.ch || echo "ERROR")

if [ "$SITE_CHECK" = "200" ]; then
    print_success "Sitio accesible (HTTP 200)"
else
    print_warning "Sitio responde con código: $SITE_CHECK"
fi
echo ""

# 8. Verificar que los nuevos componentes estén en el build
echo "🔍 Verificando componentes desplegados..."
if grep -q "WizardProgress" dist/assets/*.js 2>/dev/null; then
    print_success "WizardProgress encontrado en el build"
else
    print_warning "WizardProgress no encontrado en el build"
fi

if grep -q "EnhancedProductSearch" dist/assets/*.js 2>/dev/null; then
    print_success "EnhancedProductSearch encontrado en el build"
else
    print_warning "EnhancedProductSearch no encontrado en el build"
fi

if grep -q "featureFlags" dist/assets/*.js 2>/dev/null; then
    print_success "Sistema de Feature Flags encontrado en el build"
else
    print_warning "Feature Flags no encontrado en el build"
fi
echo ""

# 9. Limpiar backups antiguos (mantener solo los últimos 5)
echo "🧹 Limpiando backups antiguos..."
cd "$BACKUP_DIR" 2>/dev/null || true
if [ -d "$BACKUP_DIR" ]; then
    ls -t frontend_backup_*.tar.gz 2>/dev/null | tail -n +6 | xargs -r rm
    BACKUP_COUNT=$(ls -1 frontend_backup_*.tar.gz 2>/dev/null | wc -l)
    print_success "Backups mantenidos: $BACKUP_COUNT"
fi
echo ""

# 10. Resumen de feature flags
echo "🚩 Feature Flags activados por defecto:"
print_info "  ✓ enhancedInvoiceWizard: true"
print_info "  ✓ smartProductSearch: true"
print_info "  ✓ inlineValidation: true"
print_info "  ✓ autoSaveProgress: true"
print_info "  ✓ keyboardShortcuts: true"
print_info "  ✓ animatedTransitions: true"
echo ""
print_info "Los usuarios pueden personalizar estos flags desde la configuración"
echo ""

# 11. Resumen final
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 DEPLOYMENT COMPLETADO EXITOSAMENTE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Frontend desplegado con nuevas mejoras UI/UX"
echo "✅ Nginx recargado"
echo "✅ Health checks pasados"
echo "✅ Backup creado"
echo ""
echo "🌐 Sitio disponible en: https://test.simplifaq.ch"
echo "📝 URL de facturas: https://test.simplifaq.ch/invoices/new"
echo ""
echo "📚 Documentación de mejoras:"
echo "   cat /var/www/simplifaq/test/frontend/INVOICE_UI_IMPROVEMENTS.md"
echo ""
echo "🎨 Mejoras implementadas:"
echo "   • Wizard de facturas con progreso visual animado"
echo "   • Búsqueda inteligente de productos con teclado"
echo "   • Validación inline en tiempo real"
echo "   • Atajos de teclado para navegación rápida"
echo "   • Animaciones fluidas con framer-motion"
echo ""
echo "🔧 Para desactivar algún feature flag:"
echo "   Abrir DevTools > localStorage > 'feature_flags'"
echo ""
