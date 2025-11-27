# 🔢 Fix de Numeración de Facturas y Devis

## Problema Identificado

Los documentos (facturas y devis) se estaban creando con números simples como `"1"`, `"2"`, `"3"` en lugar de usar un formato profesional con prefijo y padding.

### Causa Raíz

Los valores por defecto en el schema de Prisma eran:
```prisma
// ANTES (problemático)
invoicePrefix     String?           // NULL
invoicePadding    Int @default(0)   // Sin padding
quotePrefix       String?           // NULL  
quotePadding      Int @default(0)   // Sin padding
```

Esto generaba números no profesionales cuando el usuario no había configurado la numeración en Settings.

## Solución Implementada

### 1. Actualización del Schema

Nuevos valores por defecto más profesionales:
```prisma
// DESPUÉS (mejorado)
invoicePrefix     String @default("FAC")    // Prefijo por defecto
invoicePadding    Int @default(3)           // Padding de 3 dígitos
quotePrefix       String @default("DEV")    // Prefijo por defecto
quotePadding      Int @default(3)           // Padding de 3 dígitos
```

### 2. Formato Resultante

Con estos cambios, los documentos se crearán automáticamente con formato profesional:

**Facturas:**
- `FAC-001`, `FAC-002`, `FAC-003`... 
- En lugar de: `1`, `2`, `3`...

**Devis:**
- `DEV-001`, `DEV-002`, `DEV-003`...
- En lugar de: `1`, `2`, `3`...

## Cómo Aplicar el Fix

### Opción 1: Script Automático (Recomendado)

```bash
cd backend
./apply-numbering-fix.sh
```

Este script hace todo automáticamente:
1. Genera el cliente Prisma
2. Crea la migración
3. Aplica la migración
4. Actualiza los usuarios existentes

### Opción 2: Manual

```bash
cd backend

# 1. Generar cliente Prisma
npx prisma generate

# 2. Crear y aplicar migración
npx prisma migrate dev --name fix_numbering_defaults

# 3. Actualizar datos existentes
npx prisma db execute --file=fix-numbering-defaults.sql --schema=prisma/schema.dev.prisma
```

## Archivos Modificados

1. **`backend/prisma/schema.dev.prisma`**
   - Actualizado valores `@default()` para numeración

2. **`backend/fix-numbering-defaults.sql`** (nuevo)
   - Script SQL para actualizar usuarios existentes

3. **`backend/apply-numbering-fix.sh`** (nuevo)
   - Script bash automatizado para aplicar el fix

## Impacto

### Para Usuarios Nuevos
- ✅ Automáticamente obtendrán numeración profesional desde el inicio
- ✅ Pueden personalizar en Settings → Numérotation si lo desean

### Para Usuarios Existentes
- ✅ Se actualizarán sus defaults a valores profesionales
- ⚠️ Los documentos YA CREADOS mantendrán sus números actuales
- ✅ Los NUEVOS documentos usarán el formato mejorado
- ✅ Pueden ajustar el `nextInvoiceNumber` y `nextQuoteNumber` en Settings si lo desean

## Personalización

Los usuarios siempre pueden personalizar la numeración en:
**Settings → Numérotation**

Opciones disponibles:
- **Préfixe:** Cualquier texto (ej: `"FACT-2025"`, `"INV"`, `"DV-2025"`)
- **Prochain numéro:** El siguiente número a usar
- **Padding:** Cantidad de ceros de relleno (0-10)

### Ejemplos de Personalización

| Configuración | Resultado |
|---------------|-----------|
| Prefix: `FAC-2025`, Padding: 3, Next: 1 | `FAC-2025-001`, `FAC-2025-002`... |
| Prefix: `INVOICE`, Padding: 4, Next: 100 | `INVOICE-0100`, `INVOICE-0101`... |
| Prefix: `F`, Padding: 0, Next: 1 | `F-1`, `F-2`, `F-3`... |
| Prefix: *(vacío)*, Padding: 5, Next: 1 | `00001`, `00002`, `00003`... |

## Testing

Después de aplicar el fix, puedes verificar:

```bash
# Ver la configuración de los usuarios
npx prisma studio

# O con SQL directo
npx prisma db execute --stdin <<< "
SELECT 
  email,
  invoicePrefix,
  invoicePadding,
  nextInvoiceNumber,
  quotePrefix,
  quotePadding,
  nextQuoteNumber
FROM users;
" --schema=prisma/schema.dev.prisma
```

## Verificación en UI

1. Crear una nueva factura → Debería mostrar `FAC-001` (o el siguiente número)
2. Crear un nuevo devis → Debería mostrar `DEV-001` (o el siguiente número)
3. Ir a Settings → Numérotation → Ver la configuración actual

## Sincronización Frontend (2025-11-03)

- **`frontend/src/services/api.ts`**: se añadió `api.getMyProfile()` para normalizar la respuesta de `/auth/me` y reutilizarla desde los hooks.
- **`frontend/src/components/invoices/GuidedInvoiceWizard.tsx`**: el wizard ahora obtiene el usuario más reciente con `api.getMyProfile()` antes de generar la vista previa tanto para facturas como para devis.
- **`frontend/src/hooks/useInvoices.ts`** y **`frontend/src/hooks/useQuotes.ts`**: después de crear un documento se refresca el contexto del usuario con `api.getMyProfile()` para que `nextInvoiceNumber`/`nextQuoteNumber` se actualicen inmediatamente.

Con estos cambios, la vista previa del número en el paso "Détails" refleja siempre el prefijo y el contador configurados en Settings incluso al crear varios documentos consecutivos.

## Notas Importantes

- ⚠️ **Backup:** Aunque el script es seguro, se recomienda hacer backup de la BD antes
- ✅ **Reversible:** Puedes cambiar la numeración en Settings en cualquier momento
- ✅ **Sin pérdida de datos:** Los documentos existentes NO se modifican
- ✅ **Compatible:** Funciona con el sistema actual de numeración

## Soporte

Si tienes problemas al aplicar el fix:

1. Verifica que Prisma esté actualizado: `npx prisma --version`
2. Verifica que la base de datos esté accesible
3. Revisa los logs de error durante la migración
4. Puedes revertir la migración si es necesario: `npx prisma migrate reset`

---

**Fecha del fix:** Octubre 2025  
**Versión:** SimpliFaq v2.0
