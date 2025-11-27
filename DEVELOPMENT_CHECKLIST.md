# 🔒 Checklist de Desarrollo SimpliFaq

## Antes de Hacer Cambios en Base de Datos

- [ ] ✅ Hacer backup de `dev.db` si tiene datos importantes
  ```bash
  cp backend/dev.db backend/dev.db.backup
  ```

- [ ] ✅ Usar migrations en lugar de reset
  ```bash
  npx prisma migrate dev --name mi_cambio
  ```

- [ ] ✅ Verificar que el seed está actualizado
  ```bash
  npm run prisma:seed
  ```

## Antes de Agregar/Modificar Endpoints

- [ ] ✅ Usar formato estándar de respuesta
  ```typescript
  import { successResponse, errorResponse } from '../utils/apiResponse';
  
  // Para listas: devolver array directo
  return res.json(successResponse(items));
  // NO: res.json({ success: true, data: { items } })
  
  // Para objetos únicos: devolver objeto directo
  return res.json(successResponse(item));
  ```

- [ ] ✅ Agregar endpoint en AMBOS servidores (si usas index.dev.ts)
  - [ ] `backend/src/routes/` (sistema modular)
  - [ ] `backend/src/index.dev.ts` (inline)

- [ ] ✅ Agregar autenticación
  ```typescript
  router.use(authenticateToken);
  // o
  await ensureDevUser(req);
  const userId = (req as any).userId;
  ```

- [ ] ✅ Filtrar por userId (CRÍTICO para seguridad)
  ```typescript
  where: { userId }
  ```

## Antes de Modificar Modelo Prisma

- [ ] ✅ Actualizar AMBOS schemas si usas dual setup
  - [ ] `prisma/schema.prisma`
  - [ ] `prisma/schema.dev.prisma`

- [ ] ✅ Verificar compatibilidad SQLite vs PostgreSQL
  - [ ] Decimal → Float en SQLite
  - [ ] JSON → String en SQLite
  - [ ] No usar JSONB en SQLite

- [ ] ✅ Regenerar cliente Prisma
  ```bash
  npx prisma generate
  ```

## Al Agregar Campos al Modelo User

- [ ] ✅ Agregar campo en schema Prisma
- [ ] ✅ Agregar campo en endpoint GET /api/auth/me (select)
- [ ] ✅ Agregar campo en endpoint PUT /api/auth/me (whitelist + select)
- [ ] ✅ Actualizar TypeScript types si es necesario

## Testing Manual Antes de Commit

- [ ] ✅ Login funciona
- [ ] ✅ Endpoints principales responden (no 404)
- [ ] ✅ No hay errores en console del navegador
- [ ] ✅ No hay errores en terminal del backend

## Convenciones de Código

### API Responses (IMPORTANTE)

**✅ CORRECTO - Arrays directos:**
```typescript
// Listas
return res.json(successResponse(users));
// { success: true, data: [...] }

// Objetos
return res.json(successResponse(user));
// { success: true, data: {...} }
```

**❌ INCORRECTO - Objetos anidados:**
```typescript
// NO hacer esto
return res.json({ success: true, data: { users } });
// { success: true, data: { users: [...] } }  ← Array anidado
```

### Frontend API Calls

**Siempre verificar formato de respuesta:**
```typescript
// Si el endpoint devuelve array directo
const response = await api.get('/api/items');
const items = response.data || [];  // NO response.data.items

// Si el endpoint devuelve objeto directo
const response = await api.get('/api/item/123');
const item = response.data;  // NO response.data.item
```

## Comandos Útiles de Emergencia

### Restaurar Usuario Demo
```bash
cd backend
node -e "
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createDemoUser() {
  const hashedPassword = await bcrypt.hash('DemoUser2024!', 10);
  await prisma.user.upsert({
    where: { email: 'demo@chocolaterie-suisse.ch' },
    update: {},
    create: {
      email: 'demo@chocolaterie-suisse.ch',
      password: hashedPassword,
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
  });
  console.log('✅ Usuario demo creado');
}

createDemoUser().then(() => process.exit(0));
"
```

### Verificar Tablas
```bash
cd backend
sqlite3 dev.db "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```

### Backup Rápido
```bash
cd backend
cp dev.db "backups/dev.db.$(date +%Y%m%d_%H%M%S)"
```

## Estructura de Carpetas Recomendada

```
backend/
├── src/
│   ├── controllers/    # Lógica de negocio (reusable)
│   ├── routes/         # Definición de rutas (sistema modular)
│   ├── middleware/     # Autenticación, validación
│   ├── utils/          # Helpers (apiResponse, etc)
│   ├── types/          # TypeScript types
│   ├── index.ts        # Servidor producción
│   └── index.dev.ts    # Servidor desarrollo (a migrar)
├── prisma/
│   ├── schema.prisma       # Schema producción
│   ├── schema.dev.prisma   # Schema desarrollo
│   ├── migrations/         # Historial de cambios
│   └── seed.ts            # Datos iniciales
├── tests/              # Tests automáticos
└── backups/            # Backups de dev.db
```

## Migración Recomendada

**Problema Actual:** Sistema dual (index.ts vs index.dev.ts)

**Solución a Largo Plazo:**
Hacer que `index.dev.ts` use el sistema modular como `index.ts`:

```typescript
// index.dev.ts simplificado
import routes from './routes';

app.use('/api', routes);  // Usa el mismo sistema que producción
```

Esto eliminaría:
- ❌ Endpoints duplicados
- ❌ Inconsistencias entre dev/prod
- ❌ Olvidar agregar rutas en ambos archivos
- ❌ Vulnerabilidades de seguridad

## Cuando Algo se Rompe

1. **No entrar en pánico** 🧘
2. **Leer el error completo** - Backend terminal + Browser console
3. **Verificar últimos cambios** - `git diff`
4. **Revisar este checklist** - Probablemente faltó algo
5. **Hacer rollback si es necesario** - `git checkout .`
6. **Pedir ayuda con contexto** - Logs completos, qué cambiaste

## Estado Actual del Proyecto

### ✅ Funcionando
- Login/Register
- CRUD de Clients, Products, Invoices, Quotes
- Sistema de Expenses
- Settings (Numérotation, PDF, etc)
- Generación de PDFs

### ⚠️ Requiere Atención
- Migrar index.dev.ts a sistema modular
- Agregar tests automáticos
- Implementar CI/CD
- Documentar API endpoints

### 🔒 Seguridad
- Todos los endpoints filtran por userId ✅
- Autenticación con JWT ✅
- CORS configurado ✅
- Passwords hasheados ✅

---

**Última actualización:** 5 Noviembre 2025
**Mantenido por:** Equipo SimpliFaq
