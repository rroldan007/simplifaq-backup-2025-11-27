# Configuración SMTP

## 🔐 Clave de Encriptación

**IMPORTANTE:** El sistema SMTP requiere una clave de encriptación permanente para guardar las contraseñas de forma segura.

### Problema Resuelto (16 Nov 2025)

**Síntoma:**
- Error al probar SMTP: "Failed to decrypt data"
- Passwords no se podían desencriptar después de reiniciar servidor

**Causa:**
- No existía `ENCRYPTION_KEY` en el archivo `.env`
- Se generaba una clave aleatoria en cada reinicio
- Los passwords guardados se volvían inaccesibles

**Solución Implementada:**

```bash
# Generar clave permanente (32 bytes = 64 caracteres hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Agregar al .env
ENCRYPTION_KEY=64e83e6788265a3e635848daea2f8ef272d7ef75b2b359adee0934707bffc31f
```

### Configuración en Producción

1. **Generar clave única:**
   ```bash
   cd /var/www/simplifaq/test/backend
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Agregar al .env:**
   ```env
   # SMTP Encryption Key - DO NOT SHARE
   ENCRYPTION_KEY=<tu-clave-generada-aquí>
   ```

3. **Reiniciar servidor:**
   ```bash
   pm2 restart simplifaq-test-backend
   ```

### ⚠️ Importante

- **NUNCA** compartir o commitear esta clave
- **NUNCA** cambiar la clave después de tener usuarios con SMTP configurado
- Si cambias la clave, todos los passwords SMTP existentes se vuelven inaccesibles
- Hacer backup del `.env` en un lugar seguro

### Recuperación de Passwords

Si perdiste la `ENCRYPTION_KEY`:
1. Los passwords existentes **NO se pueden recuperar**
2. Los usuarios deben volver a ingresar sus passwords SMTP
3. Generar nueva clave y agregarla al `.env`
4. Reiniciar el servidor

### Algoritmo de Encriptación

- **Algoritmo:** AES-256-CBC
- **Clave:** 256 bits (32 bytes)
- **IV:** Aleatorio por cada encriptación
- **Formato:** `iv:encryptedData` (hex)

### Verificar Configuración

```bash
# Verificar que existe la clave
grep ENCRYPTION_KEY /var/www/simplifaq/test/backend/.env

# Verificar longitud correcta (debe ser 64 caracteres)
grep ENCRYPTION_KEY /var/www/simplifaq/test/backend/.env | awk -F= '{print length($2)}'
```

### Logs de Debug

Si hay problemas con la encriptación:

```bash
# Ver logs del backend
pm2 logs simplifaq-test-backend --lines 50 | grep -i encrypt

# Ver logs de errores SMTP
pm2 logs simplifaq-test-backend --lines 50 | grep -i smtp
```

## 📧 Configuración SMTP Actual

### Servidor Test
- **Host:** mail.infomaniak.com
- **Port:** 587
- **Secure:** false (STARTTLS)
- **Provider:** smtp
- **Daily Limit:** 2000 emails

### Providers Soportados
- SMTP genérico
- SendGrid
- Amazon SES  
- Mailgun
- Gmail
- Outlook/Office365

---
**Fecha:** 16 Noviembre 2025  
**Estado:** ✅ Configurado y funcionando
