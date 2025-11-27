# 🇨🇭 SimpliFaq - Guía de Inicio Rápido

## 🚀 **Ejecutar la Aplicación Completa**

### **Opción 1: Script Automático (Recomendado)**

```bash
# Ejecutar el script de inicio automático
./start-simplifaq.sh
```

Este script:
- ✅ Verifica todas las dependencias
- ✅ Instala node_modules si es necesario
- ✅ Configura la base de datos automáticamente
- ✅ Inicia backend y frontend simultáneamente
- ✅ Abre el navegador automáticamente
- ✅ Muestra logs en tiempo real

### **Opción 2: Inicio Manual**

#### **1. Preparar Backend**
```bash
cd backend
npm install
npm run db:push
npm run db:generate
npm run dev
```

#### **2. Preparar Frontend (en otra terminal)**
```bash
cd frontend
npm install
npm run dev
```

## 🌐 **URLs de la Aplicación**

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/api/health

## 🔐 **Credenciales de Prueba**

### **Usuarios Regulares**
```
📧 Email: demo@chocolaterie-suisse.ch
🔑 Password: DemoSimpliFaq2024!

📧 Email: contact@consulting-geneve.ch  
🔑 Password: ConsultSimpliFaq2024!

📧 Email: info@tech-lausanne.ch
🔑 Password: TechSimpliFaq2024!
```

### **Administradores**
```
📧 Email: admin@simplifaq.ch
🔑 Password: AdminSimpliFaq2024!

📧 Email: support@simplifaq.ch
🔑 Password: SupportSimpliFaq2024!

📧 Email: billing@simplifaq.ch
🔑 Password: BillingSimpliFaq2024!
```

## 🎯 **Funcionalidades para Probar**

### **1. Autenticación**
- ✅ Login/Logout
- ✅ Registro de nuevos usuarios
- ✅ Validación de formularios

### **2. Gestión de Clientes**
- ✅ Crear cliente con dirección suiza
- ✅ Editar información de cliente
- ✅ Búsqueda y filtros

### **3. Gestión de Productos**
- ✅ Crear productos con diferentes tasas TVA
- ✅ Categorías: 0% (Exonéré), 0% (Non assujetti), 2.6%, 3.8%, 8.1%
- ✅ Validación de precios

### **4. Creación de Facturas**
- ✅ Formulario completo de factura
- ✅ Selección de cliente
- ✅ Múltiples artículos
- ✅ Cálculo automático de TVA
- ✅ **Importación CSV** (¡Nueva funcionalidad!)

### **5. Importación CSV**
- ✅ Descargar template CSV
- ✅ Cargar archivo con productos
- ✅ Validación automática
- ✅ Preview antes de importar
- ✅ Integración con formulario de factura

### **6. Sistema TVA Centralizado**
- ✅ Configuración por cantón
- ✅ Exención automática (< 100,000 CHF/año)
- ✅ Múltiples categorías 0% TVA
- ✅ Panel administrativo

### **7. Reportes**
- ✅ Resumen financiero
- ✅ Reportes de TVA
- ✅ Análisis por cliente
- ✅ Exportación de datos

### **8. Panel Administrativo**
- ✅ Dashboard SaaS
- ✅ Gestión de usuarios
- ✅ Configuración de TVA
- ✅ Analytics y métricas

## 📋 **Casos de Prueba Sugeridos**

### **Caso 1: Consultor IT**
1. Login como `demo@chocolaterie-suisse.ch`
2. Crear cliente "Empresa Tech SA"
3. Crear productos de consultoría
4. Generar factura con múltiples servicios
5. Probar importación CSV con servicios

### **Caso 2: Médico (TVA Exenta)**
1. Crear productos médicos con categoría EXEMPT
2. Generar factura médica
3. Verificar que TVA = 0%

### **Caso 3: Empresa Export**
1. Crear servicios internacionales
2. Usar categoría NOT_SUBJECT
3. Verificar diferencia con EXEMPT

### **Caso 4: Importación CSV Masiva**
1. Descargar template CSV
2. Llenar con 10+ productos
3. Importar y verificar validación
4. Crear factura con productos importados

### **Caso 5: Administración**
1. Login como admin
2. Cambiar tasas de TVA
3. Verificar aplicación inmediata
4. Ver analytics del sistema

## 🛠️ **Solución de Problemas**

### **Error de Base de Datos**
```bash
# Crear base de datos manualmente
createdb simplifaq

# Ejecutar migraciones
cd backend
npm run db:push
npm run db:generate
```

### **Puerto Ocupado**
```bash
# Liberar puerto 3001 (backend)
lsof -ti:3001 | xargs kill -9

# Liberar puerto 5173 (frontend)  
lsof -ti:5173 | xargs kill -9
```

### **Dependencias Faltantes**
```bash
# Reinstalar dependencias backend
cd backend
rm -rf node_modules package-lock.json
npm install

# Reinstalar dependencias frontend
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### **Ver Logs Detallados**
```bash
# Logs del backend
tail -f backend.log

# Logs del frontend
tail -f frontend.log
```

## 🎨 **Template CSV de Ejemplo**

Crea un archivo `productos.csv`:

```csv
Description,Quantité,Prix Unitaire,Catégorie TVA
"Consultation IT",1,150.00,STANDARD
"Formation développement",8,75.50,STANDARD
"Hébergement web",1,29.90,STANDARD
"Livre technique",2,45.00,REDUCED
"Service export",1,200.00,NOT_SUBJECT
"Consultation médicale",1,120.00,EXEMPT
```

## 🎉 **¡Listo para Probar!**

La aplicación **SimpliFaq** está completamente funcional con:

- 🇨🇭 **Sistema de facturación suizo completo**
- 📊 **TVA centralizada por cantones**
- 📄 **Importación CSV inteligente**
- 🏢 **Panel administrativo SaaS**
- 🔒 **Autenticación y seguridad**
- 📱 **Interface responsive**

¡Disfruta probando todas las funcionalidades! 🚀