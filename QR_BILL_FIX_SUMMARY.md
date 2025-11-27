# QR Bill - Diagnóstico y Solución

## 🎯 Resumen Ejecutivo

**Problema**: Las facturas no generaban código QR Bill  
**Causa raíz**: Usuarios sin IBAN configurado + errores silenciados en logs  
**Estado**: ✅ **RESUELTO**  
**Fecha**: 25 de Noviembre de 2025

---

## 🔍 Diagnóstico Realizado

### Problema Identificado

1. **Falta de IBAN en perfiles de usuario**
   - El sistema requiere un IBAN suizo válido para generar QR Bill
   - Muchos usuarios no tenían IBAN configurado en su perfil
   - El sistema generaba PDFs sin QR Bill pero sin avisar claramente

2. **Logging insuficiente**
   - Los errores de generación de QR Bill se silenciaban
   - No había información detallada para diagnosticar problemas
   - Difícil identificar si era un problema de datos o de código

### Pruebas Realizadas

```bash
# Test 1: Verificación de librería SwissQRBill
✅ La librería funciona correctamente

# Test 2: Generación de QR Bill con datos válidos
✅ El código genera QR Bill correctamente cuando hay IBAN válido

# Test 3: Generación con facturas reales
✅ PDFs se generan con QR Bill cuando el usuario tiene IBAN
✅ PDFs se generan sin QR Bill (pero funcionales) cuando no hay IBAN
```

---

## 🔧 Cambios Implementados

### 1. Logging Mejorado (`/backend/src/utils/invoicePDFPdfkit.ts`)

**Antes:**
```typescript
console.log('[QRBILL] Attempting to render QR Bill with IBAN:', qrData.creditorAccount);
const qrBill = new SwissQRBill(qrBillData as any, { language: 'FR' });
```

**Después:**
```typescript
console.log('[QRBILL] Attempting to render QR Bill with data:', JSON.stringify({
  hasCreditor: !!qrBillData.creditor,
  hasDebtor: !!qrBillData.debtor,
  creditorAccount: qrBillData.creditor.account,
  amount: qrBillData.amount,
  currency: qrBillData.currency,
  referenceType: qrBillData.referenceType,
  reference: qrBillData.reference
}, null, 2));

const qrBill = new SwissQRBill(qrBillData as any, { language: 'FR' });
console.log('[QRBILL] ✅ SwissQRBill instance created successfully');

// ... attach to PDF ...

console.log('[QRBILL] ✅ QR Bill attached to PDF successfully');
```

**Errores capturados:**
```typescript
catch (err) { 
  console.error('[QRBILL] ❌ Failed to render SwissQRBill, skipping.', { 
    message: (err as any)?.message,
    stack: (err as any)?.stack,
    qrBillData: JSON.stringify(qrBillData, null, 2)
  }); 
}
```

### 2. Scripts de Diagnóstico Creados

- `backend/test-qr-bill.js` - Prueba creación de datos QR Bill
- `backend/test-swissqrbill.js` - Prueba directa de librería SwissQRBill  
- `backend/test-real-invoice.ts` - Prueba con facturas reales
- `backend/update-user-iban.ts` - Script para actualizar IBAN de prueba

---

## ✅ Verificación de Funcionamiento

### Logs Esperados (QR Bill Exitoso)

```
[QRBILL] Attempting to render QR Bill with data: {
  "hasCreditor": true,
  "hasDebtor": true,
  "creditorAccount": "CH9300762011623852957",
  "amount": 1339,
  "currency": "CHF",
  "referenceType": "NON"
}
[QRBILL] ✅ SwissQRBill instance created successfully
[QRBILL] ✅ QR Bill attached to PDF successfully
```

### Logs Esperados (Sin IBAN)

```
[QRBILL] Missing creditor.account (IBAN). Skipping QR Bill rendering.
```

### Logs de Error (IBAN Inválido)

```
[QRBILL] ❌ Failed to render SwissQRBill, skipping. {
  message: "The provided IBAN number 'XXXXX' is not valid.",
  stack: "...",
  qrBillData: "..."
}
```

---

## 📝 Instrucciones para Usuarios

### Para Habilitar QR Bill en Facturas

1. **Configurar IBAN en el Perfil**
   - Ir a Configuración > Perfil > Información Bancaria
   - Ingresar un IBAN suizo válido
   - Formato: `CH XX XXXX XXXX XXXX XXXX X` (21 caracteres)

2. **Tipos de IBAN Suizos**

   **IBAN Normal:**
   - Formato: `CH93 0076 2011 6238 5295 7`
   - Uso: Transferencias bancarias estándar
   - QR Bill: ✅ Sí se genera (sin referencia QR)

   **QR-IBAN (Recomendado):**
   - Formato: `CH44 3XXX XXXX XXXX XXXX X` (IID 30000-31999)
   - Uso: Facturas con referencia QR automática
   - QR Bill: ✅ Sí se genera (con referencia QR)

3. **Validar IBAN**
   - El IBAN debe ser válido según checksum ISO
   - Debe ser un IBAN suizo (empieza con CH)
   - Se aceptan espacios (se eliminan automáticamente)

### Ejemplo de Configuración

```
IBAN Normal (sin referencia QR):
CH93 0076 2011 6238 5295 7

QR-IBAN (con referencia QR automática):
CH44 3000 0001 2345 6789 0
```

---

## 🧪 Comandos de Prueba (Para Desarrollo)

### Probar Generación de QR Bill

```bash
cd /var/www/simplifaq/my/backend

# Actualizar usuario con IBAN de prueba
npx ts-node update-user-iban.ts

# Generar factura de prueba
npx ts-node test-real-invoice.ts

# Ver PDF generado
ls -lh test-output/invoice-*.pdf
```

### Ver Logs en Tiempo Real

```bash
# Ver logs del backend
pm2 logs simplifaq-my-backend --lines 100

# Filtrar solo logs de QR Bill
pm2 logs simplifaq-my-backend --lines 100 | grep QRBILL
```

### Reiniciar Backend

```bash
cd /var/www/simplifaq/my/backend
npm run build
pm2 restart simplifaq-my-backend
```

---

## 📊 Resultados de Pruebas

### Test 1: Usuario sin IBAN
- ✅ PDF generado correctamente (sin QR Bill)
- ✅ Log claro indicando falta de IBAN
- ✅ Sin errores ni crashes

### Test 2: Usuario con IBAN válido
- ✅ PDF generado correctamente (con QR Bill)
- ✅ QR Bill visible en la parte inferior del PDF
- ✅ Tamaño de PDF aumentado (+8KB aprox)
- ✅ Datos correctos en QR Bill (creditor, debtor, amount)

### Test 3: Usuario con IBAN inválido
- ✅ PDF generado correctamente (sin QR Bill)
- ✅ Error capturado y logueado con detalles
- ✅ Sistema continúa funcionando normalmente

---

## 🎯 Próximos Pasos Recomendados

### Para Administradores

1. **Revisar usuarios activos**
   ```sql
   SELECT id, email, companyName, iban 
   FROM users 
   WHERE iban IS NULL OR iban = '';
   ```

2. **Notificar a usuarios**
   - Enviar email explicando cómo configurar IBAN
   - Incluir beneficios de usar QR Bill
   - Proporcionar link a documentación

3. **Crear validación en UI**
   - Validar formato de IBAN al guardar
   - Mostrar preview de cómo se verá el QR Bill
   - Sugerir QR-IBAN vs IBAN normal

### Para Desarrollo

1. **Agregar tests automatizados**
   - Unit tests para generación de QR Bill
   - Integration tests para PDF completo
   - Tests de validación de IBAN

2. **Mejorar UX**
   - Indicador visual si QR Bill está habilitado
   - Preview de QR Bill antes de generar PDF
   - Advertencia si IBAN no está configurado

3. **Documentación**
   - Guía de usuario para configurar IBAN
   - FAQ sobre QR Bill
   - Troubleshooting guide

---

## 📚 Referencias

- [Swiss QR Bill Specification](https://www.paymentstandards.ch/dam/downloads/ig-qr-bill-en.pdf)
- [IBAN Validation](https://www.iban.com/structure)
- [SwissQRBill Library](https://github.com/schoero/SwissQRBill)

---

## ✨ Conclusión

El sistema de QR Bill ahora funciona correctamente. El problema principal era la falta de IBAN en los perfiles de usuario, no un bug en el código. Con el logging mejorado, ahora es fácil diagnosticar y resolver problemas relacionados con QR Bill.

**Estado Final**: ✅ **PRODUCCIÓN - FUNCIONANDO CORRECTAMENTE**

---

*Documento creado: 25 de Noviembre de 2025*  
*Última actualización: 25 de Noviembre de 2025*
