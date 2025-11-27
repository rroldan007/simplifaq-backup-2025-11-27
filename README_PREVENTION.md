# 🛡️ Sistema de Prevención SimpliFaq

## Documentos Creados

Para evitar que el sistema se rompa en el futuro, he creado un conjunto completo de herramientas y documentación:

### 📚 Documentación

1. **`PREVENTION_GUIDE.md`** - Guía completa de prevención
   - Problemas comunes y cómo evitarlos
   - Workflow recomendado para cambios
   - Comandos de emergencia
   - Testing manual

2. **`DEVELOPMENT_CHECKLIST.md`** - Checklist detallado
   - Antes de cambiar base de datos
   - Antes de agregar endpoints
   - Antes de modificar modelos
   - Convenciones de código

### 🛠️ Herramientas

3. **`backend/src/utils/apiResponse.ts`** - Helper de respuestas estándar
   ```typescript
   import { successResponse, errorResponse } from '../utils/apiResponse';
   return res.json(successResponse(data));
   ```

4. **`scripts/verify-api-format.js`** - Verificación automática
   ```bash
   node scripts/verify-api-format.js
   ```

5. **`backend/prisma/seed.ts`** - Datos de prueba
   ```bash
   npm run prisma:seed
   ```

6. **`backend/scripts/backup-db.sh`** - Backup automático
   ```bash
   ./scripts/backup-db.sh
   ```

7. **`backend/scripts/create-demo-user.js`** - Restaurar usuario demo
   ```bash
   node scripts/create-demo-user.js
   ```

8. **`backend/tests/api-format.test.ts`** - Tests (placeholder)
   Para implementar cuando agregues Jest

---

## 🚀 Quick Start

### Después de cambios en base de datos:

```bash
# 1. Backup
cd backend
./scripts/backup-db.sh

# 2. Aplicar cambios
npx prisma migrate dev --name mi_cambio

# 3. Recrear datos de prueba
npx ts-node prisma/seed.ts

# 4. Verificar
npm run dev
```

### Si algo se rompe:

```bash
# 1. Restaurar último backup
cd backend
cp backups/dev.db.YYYYMMDD_HHMMSS dev.db

# 2. O recrear desde cero
rm dev.db
npx prisma migrate dev
npx ts-node prisma/seed.ts

# 3. Restaurar usuario demo
node scripts/create-demo-user.js
```

### Antes de commit:

```bash
# Verificar formato de APIs
node scripts/verify-api-format.js

# Verificar que backend arranca
cd backend && npm run dev

# Verificar que login funciona
# (probar en navegador)
```

---

## 📖 Lee Primero

**Antes de hacer cambios importantes:**
1. 📄 Lee `PREVENTION_GUIDE.md` - Guía completa
2. ✅ Revisa `DEVELOPMENT_CHECKLIST.md` - Checklist
3. 🔧 Usa las herramientas proporcionadas

**Reglas de oro:**
- ✅ SIEMPRE hacer backup antes de cambios en DB
- ✅ SIEMPRE usar `successResponse()` en endpoints
- ✅ SIEMPRE filtrar por `userId` en queries
- ✅ SIEMPRE verificar ambos servidores (dev + modular)
- ❌ NUNCA usar `prisma migrate reset` sin backup
- ❌ NUNCA devolver objetos anidados en APIs

---

## 🔥 Problemas Resueltos Hoy

Estos son los problemas que tuvimos hoy y que ahora están documentados:

1. ✅ Login roto (usuario eliminado) → `create-demo-user.js`
2. ✅ TypeError: rows.reduce is not a function → `apiResponse.ts` + guía
3. ✅ 500 Error: table does not exist → Workflow de migrations
4. ✅ 404 en endpoints nuevos → Checklist dual server
5. ✅ Datos se borran en Settings → Checklist modelo User
6. ✅ Vulnerabilidad userId → Checklist seguridad

---

## 🎯 Próximos Pasos Recomendados

### Implementación Inmediata (Esta Semana)
- [ ] Hacer backup inicial: `./scripts/backup-db.sh`
- [ ] Agregar script de seed al package.json
- [ ] Leer PREVENTION_GUIDE.md completo
- [ ] Probar restaurar usuario demo

### Corto Plazo (1-2 Semanas)
- [ ] Usar `successResponse()` en endpoints existentes
- [ ] Correr `verify-api-format.js` regularmente
- [ ] Configurar git hooks para verificaciones
- [ ] Migrar index.dev.ts a sistema modular

### Mediano Plazo (1-2 Meses)
- [ ] Implementar tests con Jest
- [ ] Agregar CI/CD (GitHub Actions)
- [ ] Documentar API con Swagger
- [ ] Logging estructurado

---

## 💡 Consejos

**Para desarrollo diario:**
- Haz backups antes de cambios grandes
- Usa el checklist para nuevas features
- Corre el verificador antes de commits
- Mantén seed.ts actualizado con datos realistas

**Si algo falla:**
- No entres en pánico
- Lee los logs COMPLETOS
- Revisa PREVENTION_GUIDE.md
- Usa los scripts de recuperación

**Prevención:**
- Pequeños commits frecuentes
- Tests antes de merge
- Code review enfocado en seguridad
- Documentar cambios importantes

---

## 📞 Recursos

- **PREVENTION_GUIDE.md** - Guía completa de prevención
- **DEVELOPMENT_CHECKLIST.md** - Checklist detallado
- **backend/src/utils/apiResponse.ts** - Respuestas estándar
- **scripts/** - Scripts de ayuda
- **prisma/seed.ts** - Datos de prueba

---

**Estado:** ✅ Sistema de Prevención Completo
**Última actualización:** 5 Noviembre 2025
**Mantenido por:** Equipo SimpliFaq

**¡Usa estas herramientas y evita problemas futuros!** 🚀
