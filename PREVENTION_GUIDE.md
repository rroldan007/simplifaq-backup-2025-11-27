# 🛡️ Guía de Prevención de Problemas - SimpliFaq

## 📋 Resumen Ejecutivo

Este documento contiene todas las medidas preventivas para evitar que el sistema se rompa durante el desarrollo.

## 🔥 Problemas Comunes y Cómo Evitarlos

### 1. "Login dejó de funcionar" / "Usuario no existe"

**Causa:** Reset de base de datos que eliminó los usuarios.

**Prevención:**
```bash
# ❌ NUNCA hacer esto sin backup
npx prisma migrate reset

# ✅ SIEMPRE hacer backup primero
cp backend/dev.db backend/dev.db.backup
npx prisma migrate dev --name mi_cambio

# ✅ MEJOR: Usar seed para recrear datos
npm run prisma:seed
```

**Solución Rápida:**
```bash
# Restaurar usuario demo
cd backend
node scripts/create-demo-user.js
```

---

### 2. "TypeError: rows.reduce is not a function" / "accounts.map is not a function"

**Causa:** Formato inconsistente de respuestas API (objeto anidado vs array directo).

**Prevención:**

**✅ SIEMPRE usar este formato:**
```typescript
import { successResponse } from '../utils/apiResponse';

// Para listas
const items = await prisma.item.findMany();
return res.json(successResponse(items));
// Respuesta: { success: true, data: [...] }

// Para objetos únicos
const item = await prisma.item.findUnique();
return res.json(successResponse(item));
// Respuesta: { success: true, data: {...} }
```

**❌ NUNCA hacer esto:**
```typescript
// ❌ Array anidado
return res.json({ success: true, data: { items } });
// Respuesta: { success: true, data: { items: [...] } }

// ❌ Objeto anidado
return res.json({ success: true, data: { item } });
// Respuesta: { success: true, data: { item: {...} } }
```

---

### 3. "500 Error: table does not exist"

**Causa:** Schema de Prisma no sincronizado con la base de datos.

**Prevención:**
```bash
# Después de cambiar schema.prisma
npx prisma migrate dev --name descripcion_cambio
npx prisma generate

# Verificar que tablas existen
sqlite3 backend/dev.db ".tables"
```

**Checklist:**
- [ ] Cambié `schema.prisma` → ✅ Correr migrate dev
- [ ] Cambié `schema.dev.prisma` → ✅ Correr migrate dev
- [ ] Agregué nuevo modelo → ✅ Verificar que tabla existe
- [ ] Backend reiniciado → ✅ Verificar sin errores en terminal

---

### 4. "404 en endpoints nuevos" (solo en desarrollo)

**Causa:** SimpliFaq tiene DOS servidores. Rutas agregadas en sistema modular pero no en `index.dev.ts`.

**Prevención:**

Al agregar ruta nueva:

1. **✅ Crear en sistema modular:**
   ```typescript
   // backend/src/routes/myroute.ts
   router.get('/', async (req, res) => { ... });
   ```

2. **✅ Registrar en routes/index.ts:**
   ```typescript
   import myRoutes from './myroute';
   router.use('/myroute', myRoutes);
   ```

3. **✅ TAMBIÉN agregar en index.dev.ts:**
   ```typescript
   app.get('/api/myroute', async (req, res) => {
     await ensureDevUser(req);
     // Llamar al controller
   });
   ```

**Solución a Largo Plazo:**
Migrar `index.dev.ts` para que use el sistema modular.

---

### 5. "Datos se borran al actualizar Settings"

**Causa:** Backend no devuelve TODOS los campos en respuesta PUT /api/auth/me.

**Prevención:**

Al agregar campos nuevos al modelo User:

```typescript
// ✅ Agregar en GET /api/auth/me
select: {
  id: true,
  email: true,
  // ... TODOS los campos existentes ...
  miNuevoCampo: true,  // ← Agregar aquí
}

// ✅ Agregar en PUT /api/auth/me (whitelist)
['companyName','firstName',...,'miNuevoCampo'].forEach(setIfString);

// ✅ Agregar en PUT /api/auth/me (response select)
select: {
  // ... TODOS los campos existentes ...
  miNuevoCampo: true,  // ← Y aquí también
}
```

**Regla de oro:** El endpoint PUT debe devolver el usuario COMPLETO, no solo los campos actualizados.

---

### 6. "Vulnerabilidad de seguridad" / "Usuario ve datos de otros"

**Causa:** Queries sin filtro `userId`.

**Prevención:**

**✅ SIEMPRE filtrar por userId:**
```typescript
router.get('/api/items', async (req, res) => {
  await ensureDevUser(req);
  const userId = (req as any).userId;
  
  const items = await prisma.item.findMany({
    where: { userId }  // ← CRÍTICO
  });
  
  return res.json(successResponse(items));
});
```

**❌ NUNCA hacer esto:**
```typescript
// ❌ Sin autenticación
const items = await prisma.item.findMany();

// ❌ Sin filtro userId
const items = await prisma.item.findMany({
  where: { active: true }  // Falta userId!
});
```

---

## 🔧 Herramientas Preventivas Creadas

### 1. **apiResponse.ts** - Formato estándar
```typescript
import { successResponse, errorResponse } from '../utils/apiResponse';
```

### 2. **verify-api-format.js** - Script de verificación
```bash
node scripts/verify-api-format.js
```

### 3. **DEVELOPMENT_CHECKLIST.md** - Checklist completo
Lee antes de hacer cambios importantes.

### 4. **seed.ts** - Recrear datos de prueba
```bash
npm run prisma:seed
```

---

## 📝 Workflow Recomendado

### Antes de Modificar Base de Datos

```bash
# 1. Backup
cp backend/dev.db backend/dev.db.backup

# 2. Modificar schema.prisma

# 3. Crear migration
cd backend
npx prisma migrate dev --name mi_cambio

# 4. Verificar
sqlite3 dev.db ".tables"
npm run dev  # Verificar sin errores

# 5. Si algo falla, restaurar
cp backend/dev.db.backup backend/dev.db
```

### Antes de Agregar Endpoint

```bash
# 1. Usar apiResponse helper
import { successResponse } from '../utils/apiResponse';

# 2. Agregar autenticación
await ensureDevUser(req);

# 3. Filtrar por userId
where: { userId }

# 4. Retornar formato correcto
return res.json(successResponse(data));

# 5. Agregar en AMBOS servidores (dev + modular)

# 6. Verificar
node scripts/verify-api-format.js
```

### Antes de Modificar Modelo User

```bash
# 1. Schema
# Agregar campo en prisma/schema.prisma

# 2. Endpoints
# Agregar en GET /api/auth/me (select)
# Agregar en PUT /api/auth/me (whitelist + select)

# 3. Migration
npx prisma migrate dev --name add_field_to_user

# 4. Testing
# Login → Settings → Cambiar campo → Recargar → Verificar que no se perdió
```

---

## 🧪 Testing Manual Rápido

Antes de dar por completada una funcionalidad:

```bash
# 1. Login funciona
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@chocolaterie-suisse.ch","password":"DemoUser2024!"}'

# 2. Endpoints principales responden
curl http://localhost:3001/api/health

# 3. No hay errores en terminal backend
# Verificar terminal donde corre npm run dev

# 4. No hay errores en console navegador
# F12 → Console → No debe haber errors rojos
```

---

## 🚨 Comandos de Emergencia

### Usuario Demo Desapareció
```bash
cd backend
node -e "
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
bcrypt.hash('DemoUser2024!', 10).then(hash => {
  prisma.user.upsert({
    where: { email: 'demo@chocolaterie-suisse.ch' },
    update: {},
    create: {
      email: 'demo@chocolaterie-suisse.ch',
      password: hash,
      companyName: 'Chocolaterie SARL',
      firstName: 'Demo',
      lastName: 'User',
      street: 'Rue de la Chocolaterie 1',
      city: 'Genève',
      postalCode: '1200',
      country: 'Switzerland',
      canton: 'GE',
      language: 'fr',
      currency: 'CHF',
      subscriptionPlan: 'premium',
      isActive: true
    }
  }).then(() => { console.log('✅ OK'); process.exit(0); });
});
"
```

### Base de Datos Corrupta
```bash
cd backend
# Restaurar último backup
cp dev.db.backup dev.db

# O recrear desde cero
rm dev.db
npx prisma migrate dev
npm run prisma:seed
```

### Backend No Arranca
```bash
# Matar procesos en puerto 3001
lsof -ti :3001 | xargs kill -9

# Limpiar y reinstalar
cd backend
rm -rf node_modules package-lock.json
npm install
npx prisma generate
npm run dev
```

---

## 📊 Métricas de Salud del Proyecto

### ✅ Indicadores Positivos
- [ ] Backend arranca sin errores
- [ ] Login funciona
- [ ] No hay errores 500 en endpoints principales
- [ ] No hay errores en console del navegador
- [ ] Tests pasan (cuando se implementen)

### ⚠️ Señales de Alerta
- [ ] Backend reinicia continuamente
- [ ] Errores "table does not exist"
- [ ] Errores "is not a function" en frontend
- [ ] Login falla con credenciales correctas
- [ ] Datos desaparecen al guardar Settings

---

## 🎯 Próximos Pasos Recomendados

### Corto Plazo (1-2 semanas)
1. ✅ Implementar seed.ts con datos de prueba
2. ✅ Hacer backups automáticos de dev.db
3. ✅ Migrar index.dev.ts a sistema modular

### Mediano Plazo (1-2 meses)
4. ⏳ Agregar tests unitarios
5. ⏳ Agregar tests de integración
6. ⏳ Implementar CI/CD
7. ⏳ Documentar API con Swagger/OpenAPI

### Largo Plazo (3+ meses)
8. ⏳ Migrar a TypeScript estricto
9. ⏳ Agregar logging estructurado
10. ⏳ Implementar monitoreo (Sentry, etc)

---

## 📚 Recursos Adicionales

- **DEVELOPMENT_CHECKLIST.md** - Checklist detallado
- **backend/src/utils/apiResponse.ts** - Helper de respuestas
- **scripts/verify-api-format.js** - Verificación automática
- **backend/prisma/seed.ts** - Datos de prueba (crear)

---

**¿Dudas?** Revisa el DEVELOPMENT_CHECKLIST.md o consulta los scripts de ayuda.

**Última actualización:** 5 Noviembre 2025
