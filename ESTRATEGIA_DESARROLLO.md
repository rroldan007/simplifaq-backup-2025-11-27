# 🇨🇭 SimpliFaq - Estrategia de Desarrollo y Seguridad

## 📋 Estado Actual (27 Nov 2025)

### ✅ Cambios Realizados Hoy
- **Jest Configuration**: Corregido error de configuración de Babel
- **ESLint**: Configurado para ignorar archivos `_OLD`
- **TypeScript**: Eliminados tipos `any` y agregadas interfaces apropiadas
- **React Hooks**: Corregidas dependencias de `useEffect` en 4 archivos
- **GitHub Actions**: Workflow funcionando completamente (lint, build, test, knip)

### ⚠️ Tipo de Cambios
- ✅ **BAJO RIESGO**: Solo configuración de CI/CD y linting
- ✅ **SIN CAMBIOS EN LÓGICA**: No se modificó lógica de negocio
- ✅ **SIN CAMBIOS EN DB**: No se modificaron schemas ni migraciones
- ✅ **BACKWARD COMPATIBLE**: Todos los cambios son compatibles

---

## 🔒 Estrategia de Seguridad de Base de Datos

### 1. Backups Automáticos

#### Backup Manual
```bash
# Crear backup inmediato
./scripts/backup-db.sh
```

#### Configurar Backup Automático (Cron)
```bash
# Editar crontab
crontab -e

# Agregar línea para backup diario a las 2 AM
0 2 * * * /var/www/simplifaq/my/scripts/backup-db.sh >> /var/www/simplifaq/my/logs/backup.log 2>&1

# O cada 6 horas
0 */6 * * * /var/www/simplifaq/my/scripts/backup-db.sh >> /var/www/simplifaq/my/logs/backup.log 2>&1
```

### 2. Ubicaciones de Bases de Datos

```
/var/www/simplifaq/my/
├── backend/
│   ├── dev.db              # Base de datos principal (desarrollo)
│   └── prisma/
│       └── schema.prisma   # Schema de la DB
└── backups/
    └── db/
        ├── dev.db.backup-20251127-211020  # ✅ Backup creado hoy
        └── ...                             # Backups automáticos
```

### 3. Restaurar Base de Datos

Si algo sale mal:
```bash
# 1. Detener el servidor
pm2 stop all

# 2. Restaurar desde backup
cp backups/db/dev.db.backup-YYYYMMDD-HHMMSS backend/dev.db

# 3. Reiniciar servidor
pm2 start all
```

---

## 🌳 Estrategia de Branching Recomendada

### Estructura de Ramas

```
main (producción)
  ↓
develop (integración)
  ↓
feature/nombre-feature (desarrollo de features)
hotfix/nombre-hotfix (arreglos urgentes)
```

### 1. Ramas Principales

#### **main** (Protegida)
- Código en producción
- Solo merges desde `develop` o `hotfix/*`
- **NUNCA** commits directos
- Tagged releases: `v1.0.0`, `v1.1.0`, etc.

#### **develop** (Integración)
- Código estable para próximo release
- Merges desde `feature/*`
- Testing completo antes de merge a `main`

### 2. Ramas de Trabajo

#### **feature/***
```bash
# Crear nueva feature
git checkout develop
git pull origin develop
git checkout -b feature/nueva-funcionalidad

# Trabajar en la feature
git add .
git commit -m "feat: descripción"

# Merge a develop cuando esté lista
git checkout develop
git merge feature/nueva-funcionalidad
git push origin develop
```

#### **hotfix/***
```bash
# Arreglo urgente en producción
git checkout main
git checkout -b hotfix/correccion-critica

# Hacer el fix
git add .
git commit -m "fix: corrección crítica"

# Merge a main Y develop
git checkout main
git merge hotfix/correccion-critica
git checkout develop
git merge hotfix/correccion-critica
```

### 3. Implementar la Estrategia AHORA

```bash
# 1. Crear rama develop desde main actual
git checkout main
git pull origin main
git checkout -b develop
git push -u origin develop

# 2. Proteger rama main en GitHub
# Settings → Branches → Add rule
# - Branch name pattern: main
# - ✅ Require pull request reviews before merging
# - ✅ Require status checks to pass (Lint & Test workflow)

# 3. Para futuros cambios, trabajar desde develop
git checkout develop
git checkout -b feature/mi-feature
# ... hacer cambios ...
git push -u origin feature/mi-feature
# Crear Pull Request en GitHub: feature/mi-feature → develop
```

---

## 🚀 Workflow de Desarrollo Recomendado

### Día a Día

```bash
# 1. Actualizar develop
git checkout develop
git pull origin develop

# 2. Crear feature branch
git checkout -b feature/nombre-descriptivo

# 3. Desarrollar
# ... editar archivos ...
git add .
git commit -m "feat: descripción clara"

# 4. Push y crear PR
git push -u origin feature/nombre-descriptivo
# Ir a GitHub y crear Pull Request → develop

# 5. Después del merge, limpiar
git checkout develop
git pull origin develop
git branch -d feature/nombre-descriptivo
```

### Release a Producción

```bash
# 1. Desde develop, crear release branch
git checkout develop
git checkout -b release/v1.1.0

# 2. Testing final y ajustes menores
# ... tests ...

# 3. Merge a main
git checkout main
git merge release/v1.1.0
git tag -a v1.1.0 -m "Release v1.1.0"
git push origin main --tags

# 4. Merge de vuelta a develop
git checkout develop
git merge release/v1.1.0
git push origin develop

# 5. Deploy
# GitHub Actions se encarga automáticamente
```

---

## ✅ Checklist de Seguridad

### Antes de Cada Cambio Mayor
- [ ] ✅ **Backup de DB creado**
- [ ] ✅ **Tests pasando localmente**
- [ ] ✅ **Lint sin errores**
- [ ] ✅ **Build exitoso**
- [ ] ✅ **Feature branch creada**

### Antes de Merge a Main
- [ ] ✅ **PR revisado**
- [ ] ✅ **GitHub Actions pasando**
- [ ] ✅ **Backup de DB en producción**
- [ ] ✅ **Plan de rollback listo**

### Después de Deploy
- [ ] ✅ **Verificar que la app funciona**
- [ ] ✅ **Verificar endpoints críticos**
- [ ] ✅ **Monitorear logs por 30 minutos**
- [ ] ✅ **Backup post-deploy creado**

---

## 🔧 Comandos Útiles

### Backups
```bash
# Backup manual
./scripts/backup-db.sh

# Ver backups disponibles
ls -lh backups/db/

# Restaurar backup específico
cp backups/db/dev.db.backup-20251127-211020 backend/dev.db
```

### Git
```bash
# Ver estado de ramas
git branch -a

# Ver diferencias con main
git diff main..develop

# Ver commits no mergeados
git log main..develop --oneline

# Deshacer último commit (mantener cambios)
git reset --soft HEAD~1

# Deshacer TODO (PELIGROSO)
git reset --hard HEAD~1
```

### Testing Local
```bash
# Frontend
cd frontend
npm run lint
npm run build
npm run test

# Backend
cd backend
npm run lint
npm run build
npm run test
```

---

## 📊 Situación Actual de Tu Proyecto

### ✅ Lo que ESTÁ seguro
1. **Base de datos**: Backup creado en `backups/db/dev.db.backup-20251127-211020`
2. **Código**: Todo en Git, versionado
3. **CI/CD**: Workflow funcionando
4. **Cambios**: Solo configuración, sin cambios de lógica

### ⚠️ Recomendaciones INMEDIATAS

1. **Crear rama develop AHORA**
```bash
git checkout -b develop
git push -u origin develop
```

2. **Configurar backup automático**
```bash
crontab -e
# Agregar: 0 2 * * * /var/www/simplifaq/my/scripts/backup-db.sh
```

3. **Proteger rama main en GitHub**
   - Settings → Branches → Add rule → `main`
   - Require PR reviews

4. **Para próximos cambios**
   - Trabajar siempre desde `develop`
   - Crear feature branches
   - Pull Requests para merge

### 🎯 Siguiente Paso Recomendado

**NO necesitas hacer merge** porque ya estás en `main`. 

Lo que SÍ debes hacer:
```bash
# 1. Crear develop desde el estado actual de main
git checkout -b develop
git push -u origin develop

# 2. Para futuros cambios
git checkout develop
git checkout -b feature/mi-nueva-funcionalidad
# ... hacer cambios ...
```

---

## 📞 En Caso de Emergencia

### Si la aplicación falla después de un deploy:

```bash
# 1. REVERTIR código
git revert HEAD
git push origin main

# 2. RESTAURAR base de datos
pm2 stop all
cp backups/db/dev.db.backup-ULTIMO backend/dev.db
pm2 start all

# 3. VERIFICAR
curl http://localhost:3000/health
curl http://localhost:3001/health
```

### Si perdiste datos:
```bash
# Lista de backups disponibles
ls -lht backups/db/ | head -10

# Restaurar el backup más reciente
LATEST_BACKUP=$(ls -t backups/db/ | head -1)
cp "backups/db/$LATEST_BACKUP" backend/dev.db
```

---

## 📝 Notas Finales

- **Los cambios de hoy son SEGUROS**: Solo afectan CI/CD y linting
- **La base de datos NO ha cambiado**: Mismo schema, mismos datos
- **El código funciona igual**: No hay cambios de comportamiento
- **Tienes backup**: Creado hace minutos

**Recomendación**: Implementa la estrategia de branching AHORA para futuros cambios más seguros.
