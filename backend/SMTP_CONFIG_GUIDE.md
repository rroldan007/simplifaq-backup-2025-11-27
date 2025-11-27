# 📧 Guía de Configuración SMTP

## ⚠️ Problema Actual
El sistema de envío de emails está **funcionando correctamente**, pero necesita credenciales SMTP válidas para enviar emails reales.

**Error actual:** `Invalid login: 535 5.7.0 Invalid login or password`

## ✅ Solución Rápida

### Opción 1: Gmail (Recomendado para pruebas)

1. **Crear contraseña de aplicación en Gmail:**
   - Ve a https://myaccount.google.com/apppasswords
   - Inicia sesión con tu cuenta Gmail
   - Selecciona "Correo" y "Otro dispositivo"
   - Copia la contraseña de 16 caracteres

2. **Actualizar `.env`:**
   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=tu-email@gmail.com
   SMTP_PASS=tu-password-de-app-de-16-chars
   EMAIL_FROM=tu-email@gmail.com
   ```

3. **Reiniciar backend:**
   ```bash
   pm2 restart simplifaq-test-backend
   ```

### Opción 2: Infomaniak (Profesional)

```bash
SMTP_HOST=mail.infomaniak.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@simplifaq.ch
SMTP_PASS=tu-contraseña-infomaniak
EMAIL_FROM=noreply@simplifaq.ch
```

### Opción 3: SendGrid (Alto volumen)

```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=tu-api-key-sendgrid
EMAIL_FROM=noreply@simplifaq.ch
```

### Opción 4: Mailgun

```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@tudominio.mailgun.org
SMTP_PASS=tu-password-mailgun
EMAIL_FROM=noreply@simplifaq.ch
```

## 🧪 Probar Configuración

Después de configurar SMTP, prueba el envío:

1. Abre una factura en el sistema
2. Click "Envoyer par email"
3. Ingresa tu email de prueba
4. Click "Envoyer"
5. Revisa tu bandeja de entrada (y spam)

## 📋 Checklist de Verificación

- [ ] Variables SMTP configuradas en `.env`
- [ ] Email y contraseña son correctos
- [ ] Backend reiniciado después de cambios
- [ ] Firewall permite conexiones SMTP (puerto 587)
- [ ] Email de prueba enviado exitosamente

## 🔧 Comandos Útiles

**Ver configuración actual:**
```bash
grep "SMTP_\|EMAIL_" /var/www/simplifaq/test/backend/.env
```

**Ver logs del backend:**
```bash
pm2 logs simplifaq-test-backend --lines 50
```

**Reiniciar backend:**
```bash
cd /var/www/simplifaq/test/backend
pm2 restart simplifaq-test-backend
```

**Test SMTP manual (opcional):**
```bash
cd /var/www/simplifaq/test/backend
node -e "
const nodemailer = require('nodemailer');
const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});
transport.verify().then(() => console.log('✅ SMTP OK')).catch(err => console.error('❌ SMTP Error:', err.message));
"
```

## 🎯 Características del Sistema (Ya Implementadas)

Una vez configurado SMTP, el sistema podrá:

- ✅ Enviar emails con PDF adjunto automáticamente
- ✅ Personalizar subject y body del email
- ✅ Guardar historial de envíos en DB
- ✅ Mostrar feedback visual durante el envío
- ✅ Actualizar status de factura a "sent"
- ✅ Registrar destinatario y fecha de envío
- ✅ Template de email profesional
- ✅ PDF con descuento global visible
- ✅ PDF con QR Bill incluido

## 📞 Soporte

Si tienes problemas:
1. Verifica logs: `pm2 logs simplifaq-test-backend`
2. Revisa firewall: `sudo ufw status`
3. Prueba credenciales en cliente email (Thunderbird, Outlook)
4. Contacta soporte de tu proveedor SMTP
