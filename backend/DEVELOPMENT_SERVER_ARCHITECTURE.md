# ⚠️ ARQUITECTURA DE SERVIDORES - LECTURA OBLIGATORIA

## Sistema Dual de Servidores

SimpliFaq utiliza **DOS archivos de servidor diferentes**:

### 🏭 Producción: `src/index.ts`
- ✅ Usa sistema de rutas **MODULAR**
- ✅ Importa `routes/index.ts` con `app.use('/api', routes)`
- ✅ Todas las rutas en `routes/` se cargan automáticamente

### 🛠️ Desarrollo: `src/index.dev.ts`
- ⚠️ Archivo **MONOLÍTICO** con rutas inline
- ⚠️ **NO importa** el sistema de rutas modular
- ⚠️ Solo importa `geoRoutes` directamente
- ⚠️ Todas las rutas deben definirse manualmente

---

## 🚨 PROBLEMA COMÚN: Rutas 404 en Desarrollo

### Síntomas
```
GET /api/quotes → 404 Not Found
Backend recibe la petición pero no ejecuta el controlador
Log: "Endpoint non trouvé"
```

### Causa Raíz
1. Creaste `routes/quotes.ts` ✅
2. Lo registraste en `routes/index.ts` ✅
3. Funciona en producción ✅
4. **OLVIDASTE agregarlo en `index.dev.ts`** ❌
5. El "catch all" devuelve 404 ❌

---

## ✅ SOLUCIÓN: Agregar Rutas en Desarrollo

### Paso 1: Importar Controladores
```typescript
// En index.dev.ts, después de las otras importaciones
import { getQuotes, createQuote, getQuote } from './controllers/quoteController';
```

### Paso 2: Agregar Endpoints (ANTES del "Catch all")
```typescript
// Quotes endpoints
app.get('/api/quotes', async (req, res, next) => {
  try {
    await ensureDevUser(req);
    await getQuotes(req as any, res as any);
  } catch (e) {
    next(e);
  }
});

app.post('/api/quotes', async (req, res, next) => {
  try {
    await ensureDevUser(req);
    await createQuote(req as any, res as any);
  } catch (e) {
    next(e);
  }
});

app.get('/api/quotes/:id', async (req, res, next) => {
  try {
    await ensureDevUser(req);
    await getQuote(req as any, res as any);
  } catch (e) {
    next(e);
  }
});

// ⚠️ IMPORTANTE: Agregar ANTES de este bloque
// Catch all for undefined routes
app.use('*', (req, res) => { ... });
```

---

## 📋 CHECKLIST: Agregar Nuevas Rutas

Cuando agregues una nueva ruta:

- [ ] **1. Crear archivo en `routes/`** (ej: `routes/quotes.ts`)
- [ ] **2. Registrar en `routes/index.ts`:**
  ```typescript
  import quoteRoutes from './quotes';
  router.use('/quotes', quoteRoutes);
  ```
- [ ] **3. ⚠️ CRÍTICO: Agregar en `index.dev.ts`** (ver ejemplo arriba)
- [ ] **4. Actualizar tipos si es necesario** (`types/express.d.ts`)
- [ ] **5. Probar en DESARROLLO** (`npm run dev`)
- [ ] **6. Probar en PRODUCCIÓN** (`npm start`)

---

## 🔧 Cambios Adicionales para Nuevos Recursos

### Si agregas un nuevo tipo de recurso (ej: 'quotes'):

#### 1. Actualizar Tipos TypeScript
**Archivo:** `src/types/express.d.ts`
```typescript
usageInfo?: {
  subscriptionId: string;
  resourceType: 'invoices' | 'clients' | 'products' | 'storage' | 'quotes'; // ← Agregar aquí
  currentUsage: number;
  limit: number;
};
```

#### 2. Actualizar Middleware de Límites
**Archivo:** `src/middleware/usageLimit.ts`
```typescript
switch (resourceType) {
  case 'invoices':
    // ...
    break;
    
  case 'quotes': // ← Agregar caso nuevo
    currentCount = await prisma.quote.count({
      where: { 
        userId: req.user!.id,
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    });
    break;
  // ...
}
```

---

## 🎯 RECOMENDACIÓN: Unificar Servidores

Para evitar este problema en el futuro:

### Opción A: Hacer que `index.dev.ts` use el sistema modular
```typescript
// Reemplazar rutas inline con:
import routes from './routes';
app.use('/api', routes);
```

### Opción B: Eliminar `index.dev.ts` y usar `index.ts` para desarrollo
```bash
# En package.json
"dev": "nodemon --exec ts-node src/index.ts"
```

---

## 📝 Historial de Problemas Resueltos

### 2025-10-25: Quotes 404 en Desarrollo
- **Problema:** GET /api/quotes devolvía 404
- **Causa:** Rutas no agregadas en index.dev.ts
- **Solución:** Agregar endpoints de quotes manualmente
- **Archivos modificados:**
  - `src/index.dev.ts` (líneas 9, 1043-1078)
  - `src/types/express.d.ts` (línea 37)
  - `src/middleware/usageLimit.ts` (líneas 150-159)

---

## 🆘 Debug Tips

### Si una ruta da 404 en desarrollo:
1. ✅ Verificar que existe en `routes/`
2. ✅ Verificar que está registrada en `routes/index.ts`
3. ⚠️ **Verificar que está en `index.dev.ts`** ← Problema más común
4. ✅ Verificar que el servidor se reinició
5. ✅ Verificar logs del backend en consola

### Comandos útiles:
```bash
# Ver rutas registradas
grep -r "app\\.get\\|app\\.post\\|app\\.put\\|app\\.delete" src/index.dev.ts

# Buscar importaciones
grep "import.*Controller" src/index.dev.ts

# Reiniciar servidor
npm run dev
```

---

## 📚 Referencias

- Sistema de rutas modular: `src/routes/index.ts`
- Servidor de desarrollo: `src/index.dev.ts`
- Servidor de producción: `src/index.ts`
- Documentación de rutas: `ROUTING_GUIDE.md`

---

**Última actualización:** 2025-10-25  
**Mantenedor:** Equipo SimpliFaq  
**Prioridad:** 🔴 CRÍTICA
