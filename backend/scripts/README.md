# 🛡️ Scripts de Migración Segura

## 🚀 Uso Rápido (Migración a Producción)

```bash
# 1. Ejecutar migración segura (RECOMENDADO)
./scripts/safe-migrate.sh

# 2. Verificar que todo está bien
./scripts/verify-migration.sh

# 3. Si algo salió mal, hacer rollback
./scripts/rollback-migration.sh
```

---

## 📋 Scripts Disponibles

### 1. `safe-migrate.sh` - Migración Segura (PRINCIPAL)

**Qué hace:**
- ✅ Hace backup automático de la BD
- ✅ Cuenta todos los registros ANTES
- ✅ Ejecuta las migraciones de Prisma
- ✅ Cuenta todos los registros DESPUÉS
- ✅ Si detecta pérdida de datos → **ROLLBACK AUTOMÁTICO**
- ✅ Guarda logs completos

**Uso:**
```bash
./scripts/safe-migrate.sh
```

**Salida esperada:**
```
╔════════════════════════════════════════════════════════════╗
║      MIGRACIÓN SEGURA DE BASE DE DATOS - PRODUCCIÓN       ║
╚════════════════════════════════════════════════════════════╝

📋 Cargando configuración...
✅ Configuración cargada

🔌 Verificando conexión a la base de datos...
✅ Conexión exitosa

💾 Creando backup completo de la base de datos...
✅ Backup creado exitosamente (Tamaño: 15MB)

📊 Contando registros antes de la migración...
   Usuarios: 25
   Facturas: 142
   Clientes: 48
   Productos: 67

🚀 Ejecutando migraciones de Prisma...
✅ Migraciones aplicadas

🔍 Verificando integridad de los datos...
   Usuarios: 25 → 25
   Facturas: 142 → 142
   Clientes: 48 → 48
   Productos: 67 → 67

✅ Verificación exitosa: No se perdió ningún dato

╔════════════════════════════════════════════════════════════╗
║                 ✅ MIGRACIÓN EXITOSA                        ║
╚════════════════════════════════════════════════════════════╝
```

---

### 2. `verify-migration.sh` - Verificación Post-Migración

**Qué hace:**
- ✅ Verifica que todas las tablas existen
- ✅ Verifica que las nuevas columnas fueron creadas
- ✅ Verifica integridad referencial
- ✅ Detecta registros huérfanos

**Uso:**
```bash
./scripts/verify-migration.sh
```

**Salida esperada:**
```
╔════════════════════════════════════════════════════════════╗
║         VERIFICACIÓN DE INTEGRIDAD DE DATOS               ║
╚════════════════════════════════════════════════════════════╝

🔍 Verificando tablas principales...

✅ users: 25 registros
✅ accounts: 12 registros
✅ invoices: 142 registros
✅ clients: 48 registros
✅ products: 67 registros
✅ plans: 3 registros
✅ subscriptions: 12 registros

🔍 Verificando nuevas columnas en 'plans'...

✅ Columna 'hasInvoices' existe
✅ Columna 'hasQuotes' existe
✅ Columna 'hasExpenses' existe
✅ Columna 'hasAIAssistant' existe
✅ Columna 'hasMultiUser' existe
✅ Columna 'maxUsers' existe
✅ Columna 'hasMultiCompany' existe
✅ Columna 'maxCompanies' existe

🔍 Verificando integridad referencial...

✅ No hay facturas huérfanas
✅ No hay clientes huérfanos

════════════════════════════════════════════════════════════

✅ VERIFICACIÓN EXITOSA: Todo está correcto
```

---

### 3. `rollback-migration.sh` - Rollback Automático

**Qué hace:**
- 🔍 Encuentra el backup más reciente
- 💾 Crea backup de seguridad del estado actual
- 🔄 Restaura el backup anterior
- ✅ Verifica la restauración

**Uso:**
```bash
./scripts/rollback-migration.sh
```

**Cuándo usar:**
- ❌ La migración falló
- ❌ Detectaste pérdida de datos
- ❌ La aplicación no funciona después de migrar
- ❌ Necesitas volver al estado anterior por cualquier razón

**Salida esperada:**
```
╔════════════════════════════════════════════════════════════╗
║                  🔄 ROLLBACK DE MIGRACIÓN                  ║
╚════════════════════════════════════════════════════════════╝

🔍 Buscando backups disponibles...

✅ Backup encontrado:
   Archivo: backups/db_backup_pre_migration_20241204_120000.sql
   Tamaño: 15MB
   Fecha: 2024-12-04 12:00:00

¿Deseas continuar con el rollback? (escribe 'SI' para confirmar): SI

💾 Creando backup de seguridad del estado actual...
✅ Backup de seguridad creado

📥 Restaurando desde: backups/db_backup_pre_migration_20241204_120000.sql

╔════════════════════════════════════════════════════════════╗
║              ✅ ROLLBACK COMPLETADO EXITOSAMENTE           ║
╚════════════════════════════════════════════════════════════╝
```

---

## 🎯 Workflow Recomendado

### Para Migración Normal (Todo salió bien)

```bash
# Paso 1: Migrar
./scripts/safe-migrate.sh

# Paso 2: Verificar
./scripts/verify-migration.sh

# Paso 3: Regenerar Prisma client
npx prisma generate

# Paso 4: Reiniciar aplicación
pm2 restart simplifaq
```

### Si Algo Sale Mal

```bash
# Opción 1: El script safe-migrate.sh ya hizo rollback automático
# Solo reinicia la app
pm2 restart simplifaq

# Opción 2: Necesitas hacer rollback manual
./scripts/rollback-migration.sh
npx prisma generate
pm2 restart simplifaq
```

---

## 📁 Estructura de Backups

Los backups se guardan en:
```
backend/backups/
├── db_backup_pre_migration_20241204_120000.sql  ← Antes de migrar
├── db_backup_pre_migration_20241204_110000.sql
├── db_backup_before_rollback_20241204_125000.sql ← Antes de rollback
└── migration_log_20241204_120000.log             ← Logs detallados
```

**Retención:** Los scripts mantienen automáticamente los últimos 10 backups.

---

## ⚠️ Requisitos

- PostgreSQL instalado (`psql`, `pg_dump`)
- Variables de entorno configuradas en `.env`:
  ```
  DATABASE_URL="postgresql://user:pass@host:port/dbname"
  ```
- Permisos de ejecución (ya configurados):
  ```bash
  chmod +x scripts/*.sh
  ```

---

## 🔒 Seguridad Garantizada

### El script `safe-migrate.sh` te protege de:

1. ❌ Pérdida de datos → Detecta y hace rollback
2. ❌ Migraciones fallidas → Detecta y hace rollback
3. ❌ Errores de conexión → Verifica antes de migrar
4. ❌ Backups corruptos → Verifica tamaño antes de continuar
5. ❌ Errores silenciosos → Logs detallados de todo

### Nunca perderás datos porque:

✅ Backup automático ANTES de cualquier cambio
✅ Verificación de datos ANTES y DESPUÉS
✅ Rollback automático si detecta problemas
✅ Logs completos para auditoría
✅ Mantiene múltiples backups históricos

---

## 📖 Documentación Completa

Lee la guía completa: [`GUIA_MIGRACION_SEGURA.md`](../GUIA_MIGRACION_SEGURA.md)

---

## 💡 Tips Rápidos

```bash
# Ver backups disponibles
ls -lht backups/

# Ver logs de la última migración
cat backups/migration_log_*.log | tail -100

# Verificar BD manualmente
psql $DATABASE_URL -c "\d plans"

# Contar registros manualmente
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
```

---

## 🚨 En Caso de Emergencia

Si algo sale MUY mal:

```bash
# 1. Detener aplicación
pm2 stop simplifaq

# 2. Restaurar último backup bueno
psql $DATABASE_URL < backups/db_backup_pre_migration_XXXXXXXX.sql

# 3. Verificar
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"

# 4. Reiniciar
pm2 restart simplifaq
```

---

**Recuerda:** Estos scripts están diseñados para que **NUNCA pierdas datos**. Úsalos con confianza. 🛡️
