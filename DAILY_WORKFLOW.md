# 📅 Workflow Diario SimpliFaq

## 🌅 Al Empezar el Día

```bash
# 1. Ver estado del proyecto
cd backend
npm run backup:list  # Ver backups disponibles

# 2. Arrancar servidor
npm run dev

# 3. Verificar que todo funciona
# → Abrir navegador: http://localhost:3000
# → Login debe funcionar
# → No debe haber errores en console
```

---

## 💻 Durante Desarrollo

### Antes de Cambiar Base de Datos

```bash
# ⚠️ SIEMPRE hacer backup primero
cd backend
npm run backup:quick

# Modificar schema.dev.prisma
# ...

# Aplicar cambios
npx prisma migrate dev --name descripcion_del_cambio

# Verificar que funcionó
npm run dev
```

### Antes de Agregar Endpoint Nuevo

**Usa snippets en VSCode:**
- Escribe `endpoint-auth` + TAB → Endpoint completo
- Escribe `api-success` + TAB → Respuesta exitosa
- Escribe `prisma-userid` + TAB → Query con userId

**Checklist mental:**
1. ✅ Importar `successResponse` de utils/apiResponse
2. ✅ Llamar `ensureDevUser(req)`
3. ✅ Obtener `userId` del request
4. ✅ Filtrar por `userId` en query
5. ✅ Devolver array directo (NO objeto anidado)
6. ✅ Agregar en AMBOS servidores (modular + index.dev.ts)

### Al Crear Nueva Feature

**Ejemplo: Agregar módulo "Projects"**

```bash
# 1. Backup preventivo
cd backend
npm run backup:quick

# 2. Agregar al schema
# Editar: backend/prisma/schema.dev.prisma
# Agregar modelo Project con userId

# 3. Migrar
npx prisma migrate dev --name add_projects

# 4. Crear controller
# Archivo: backend/src/controllers/projectController.ts
# Usar snippet: endpoint-auth

# 5. Crear routes
# Archivo: backend/src/routes/projects.ts

# 6. Registrar en sistema modular
# Editar: backend/src/routes/index.ts
# import projectRoutes from './projects';
# router.use('/projects', projectRoutes);

# 7. ⚠️ IMPORTANTE: Agregar en index.dev.ts
# Copiar TODOS los endpoints

# 8. Crear frontend
# Archivo: frontend/src/services/projectsApi.ts
# Archivo: frontend/src/hooks/useProjects.ts
# Archivo: frontend/src/pages/ProjectsPage.tsx

# 9. Registrar ruta
# Editar: frontend/src/router/index.tsx
```

---

## 🧪 Antes de Commit

### Checklist Automático

```bash
# 1. Verificar formato de APIs
cd backend
npm run verify:api

# 2. Verificar que backend arranca
npm run dev
# Ctrl+C después de verificar

# 3. Testing manual
# → Login funciona ✅
# → Nueva feature funciona ✅
# → No hay errores en console ✅
```

### En VSCode

**Usar Tasks (Ctrl+Shift+P → "Run Task"):**
- 🔍 Verificar Formato API
- 💾 Backup Base de Datos
- 👤 Crear Usuario Demo (si login roto)

---

## 🚨 Si Algo se Rompe

### Login no funciona

```bash
# Opción 1: Restaurar usuario demo
cd backend
npm run demo:user

# Opción 2: Recrear desde seed
npm run seed
```

### Base de datos corrupta

```bash
cd backend

# Opción 1: Restaurar último backup
ls backups/  # Ver backups disponibles
cp backups/dev.db.TIMESTAMP dev.db

# Opción 2: Recrear desde cero
rm dev.db
npx prisma migrate dev
npm run seed
```

### TypeError en frontend

**Causa probable:** Formato de API incorrecto

```bash
# Verificar endpoints
cd backend
npm run verify:api

# Revisar PREVENTION_GUIDE.md
# Sección: "TypeError: rows.reduce is not a function"
```

### 404 en nuevos endpoints

**Causa:** Falta agregar en index.dev.ts

1. Abrir `backend/src/index.dev.ts`
2. Buscar el último endpoint similar
3. Copiar patrón y agregar tu endpoint
4. Reiniciar backend

---

## 🎯 Patrones Comunes

### Crear Endpoint de Lista

```typescript
import { successResponse } from '../utils/apiResponse';

router.get('/api/items', async (req, res) => {
  await ensureDevUser(req);
  const userId = (req as any).userId;
  
  const items = await prisma.item.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });
  
  // ✅ CORRECTO
  return res.json(successResponse(items));
  
  // ❌ NUNCA
  // return res.json({ success: true, data: { items } });
});
```

### Crear Endpoint de Detalle

```typescript
router.get('/api/items/:id', async (req, res) => {
  await ensureDevUser(req);
  const userId = (req as any).userId;
  const { id } = req.params;
  
  const item = await prisma.item.findFirst({
    where: { id, userId }  // ⚠️ CRÍTICO: verificar userId
  });
  
  if (!item) {
    return res.status(404).json(errorResponse(
      ErrorCodes.NOT_FOUND,
      'Item no encontrado'
    ));
  }
  
  return res.json(successResponse(item));
});
```

### Actualizar Usuario en Settings

```typescript
// ⚠️ IMPORTANTE: Devolver TODOS los campos
const updated = await prisma.user.update({
  where: { id: userId },
  data: { ...cambios },
  select: {
    id: true,
    email: true,
    companyName: true,
    // ... TODOS los campos (ver DEVELOPMENT_CHECKLIST.md)
  }
});
```

---

## 📊 Métricas de Salud

### ✅ Todo va bien si:
- Backend arranca sin errores
- Login funciona
- No hay errores 500 en Network tab
- No hay errores rojos en console
- Backups recientes existen

### ⚠️ Señales de alerta:
- Backend reinicia continuamente
- Errores "table does not exist"
- Errores "is not a function"
- Login falla con credenciales correctas
- Datos desaparecen al guardar

---

## 🔧 Comandos Rápidos

```bash
# Backend
cd backend
npm run dev              # Arrancar desarrollo
npm run backup:quick     # Backup ahora
npm run seed            # Recrear datos de prueba
npm run demo:user       # Restaurar usuario demo
npm run verify:api      # Verificar formato APIs
npm run backup:list     # Ver backups

# Frontend
cd frontend
npm run dev             # Arrancar desarrollo

# Ambos
npm run dev             # En la raíz (si existe)
```

---

## 📚 Documentación Rápida

- **PREVENTION_GUIDE.md** - Problemas comunes y soluciones
- **DEVELOPMENT_CHECKLIST.md** - Checklist completo
- **README_PREVENTION.md** - Resumen de herramientas

**En VSCode:**
- Snippets: Escribe `api-` + TAB
- Tasks: Ctrl+Shift+P → "Run Task"

---

## 🎓 Tips de Productividad

1. **Usa los snippets** - Ahorra tiempo y evita errores
2. **Backups frecuentes** - Mejor prevenir que lamentar
3. **Lee los logs** - Te dicen exactamente qué falló
4. **Commits pequeños** - Más fácil de revertir si falla
5. **Consulta docs** - PREVENTION_GUIDE tiene la respuesta

---

**¡Desarrollo feliz!** 🚀

*Última actualización: 5 Noviembre 2025*
