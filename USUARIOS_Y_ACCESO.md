# 🔐 Usuarios y Acceso - SimpliFaq Test

## 🌐 URL de Acceso
**https://test.simplifaq.ch**

---

## 👥 Usuarios Creados

### **Administradores del Sistema (Admin Panel)**

#### 1. Super Administrador
- **Email:** `admin@simplifaq.ch`
- **Password:** `AdminSimpliFaq2024!`
- **Rol:** Super Admin (acceso total)

#### 2. Soporte
- **Email:** `support@simplifaq.ch`
- **Password:** `SupportSimpliFaq2024!`
- **Rol:** Support Admin (soporte y gestión de usuarios)

#### 3. Facturación
- **Email:** `billing@simplifaq.ch`
- **Password:** `BillingSimpliFaq2024!`
- **Rol:** Billing Admin (gestión de facturación y suscripciones)

---

### **Usuarios Regulares (Aplicación Principal)**

#### 1. Usuario Demo Principal
- **Email:** `demo@chocolaterie-suisse.ch`
- **Password:** `DemoUser2024!`
- **Empresa:** Chocolaterie Suisse SA
- **Plan:** Free
- **VAT:** CHE-XXXXXX.XXX.XXX TVA

#### 2. Usuario Consulting
- **Email:** `contact@consulting-geneve.ch`
- **Password:** `ConsultDemo2024!`
- **Empresa:** Consulting Genève Sàrl
- **Plan:** Free

#### 3. Usuario Tech
- **Email:** `info@tech-lausanne.ch`
- **Password:** `TechDemo2024!`
- **Empresa:** Tech Solutions Lausanne SA
- **Plan:** Free

---

## 📋 Planes Disponibles

### 1. **Plan Gratuit** (Free)
- 5 facturas por mes
- 10 clientes máximo
- 5 productos máximo
- QR Bill suizo incluido
- 50 MB almacenamiento

### 2. **Plan Basique** (Basic)
- CHF 19.90/mes
- 50 facturas por mes
- 100 clientes máximo
- 50 productos máximo
- Soporte por email
- Multi-moneda y multi-idioma
- 500 MB almacenamiento

### 3. **Plan Premium**
- CHF 49.90/mes
- 500 facturas por mes
- 1000 clientes máximo
- 200 productos máximo
- Soporte prioritario
- API access
- Branding personalizado
- 2 GB almacenamiento

---

## 🔧 Solución de Problemas

### Error de Conexión
Si ves errores de "NetworkError" o "Content-Security-Policy":
1. Borra la caché del navegador (Ctrl+Shift+Del)
2. Recarga la página con Ctrl+F5 (forzar recarga)
3. Verifica que el backend esté corriendo: `pm2 status`

### Backend No Responde
```bash
# Ver estado
pm2 status

# Ver logs
pm2 logs simplifaq-test-backend

# Reiniciar
pm2 restart simplifaq-test-backend
```

### Frontend No Actualiza
```bash
# Reconstruir frontend
cd /var/www/simplifaq/test/frontend
npm run build

# Recargar Nginx
sudo systemctl reload nginx
```

---

## 🚀 Estado del Deployment

✅ **Frontend:** Corriendo en https://test.simplifaq.ch  
✅ **Backend API:** Corriendo en puerto 3003 (interno)  
✅ **Base de Datos:** SQLite (test.db)  
✅ **Usuarios:** Creados y funcionales  
✅ **SSL:** Certificado Let's Encrypt activo  
✅ **Nginx:** Proxy configurado correctamente  

---

## 📞 Próximos Pasos

1. **Probar el login** con cualquiera de los usuarios demo
2. **Crear una factura** de prueba
3. **Subir un logo** de empresa (opcional)
4. **Generar un PDF** con QR Bill suizo

**Nota:** Todos los datos son de prueba y pueden ser eliminados/recreados en cualquier momento.

---

**Fecha de Deployment:** 12 de Noviembre, 2025  
**Versión:** 1.0.0-test
