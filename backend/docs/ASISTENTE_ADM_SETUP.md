# Asistente ADM – Guía de configuración y pruebas

## 1. Variables de entorno necesarias
Agregar las siguientes claves en `.env` / `.env.production`:

```
ASISTENTE_BASE_URL=https://asistente.simplifaq.cloud
ASISTENTE_API_KEY=<api_key_proporcionada_por_vps>
ASISTENTE_TIMEOUT_MS=30000
```

Recomendaciones:
- Mantener la API key en un gestor seguro (Vault, Doppler, etc.).
- Ajustar `ASISTENTE_TIMEOUT_MS` si se requieren tiempos mayores (máximo sugerido: 60 000 ms).

## 2. Migración Prisma
Se añadió el modelo `AssistantAction` y su relación con `User`. Ejecutar:

```
# Entorno de desarrollo
npm run db:migrate -- --name add_assistant_actions

# Producción (SQLite): ejecutar la migración y desplegar el nuevo binario de Prisma
```

Esto creará la tabla `assistant_actions` con columnas:
- `actionId` único para enlazar planes recibidos del asistente.
- `status` (`pending`, `confirmed`, `executed`, `cancelled`, `failed`).
- Campos de auditoría (`confirmedAt`, `executedAt`, `cancelledAt`, `lastError`).

## 3. Endpoints expuestos en `/api/asistente`
- `POST /api/asistente/chat`
- `POST /api/asistente/actions/confirm`
- `GET  /api/asistente/actions?status=pending`
- `GET  /api/asistente/actions/:actionId`
- `POST /api/asistente/actions/:actionId/cancel`
- `POST /api/asistente/expenses/analyze` (multipart/form-data, campo `file`)

Todos requieren JWT del usuario. El backend reenvía `Authorization` + `x-api-key` al servicio ADM.

## 4. Flujos manuales de prueba
1. **Chat básico**
   - Enviar POST `/api/asistente/chat` con `{ "message": "Liste mes factures ouvertes" }`.
   - Verificar respuesta y confirmar que se guardaron entradas en `assistant_actions` si hay `actions` en la respuesta. Usar `GET /api/asistente/actions`.

2. **Confirmación de acción**
   - Tomar `actionId` devuelto, llamar a `POST /api/asistente/actions/confirm` con `{"actionId": "...", "confirmation": true}`.
   - Revisar en la tabla el cambio de `status` a `confirmed/ executed` según el resultado.

3. **Cancelación manual**
   - `POST /api/asistente/actions/:actionId/cancel` para mover la acción a `cancelled`.

4. **Análisis de gastos**
   - Enviar `POST /api/asistente/expenses/analyze` con imagen (≤10 MB) y cabecera JWT.
   - Confirmar que el asistente devuelve `summary` y `proposal` y que el límite de tamaño funciona.

## 5. Auditoría y logs
- Las acciones quedan registradas en la tabla `assistant_actions`.
- Los controladores usan `auditLogger` y Prisma para mantener trazabilidad.
- Revisar logs (`logs/security-audit.log`, `logs/security-combined.log`) para correlacionar eventos.

## 6. Próximas tareas recomendadas
- Integrar UI del dashboard (chat, confirmaciones, upload).
- Añadir pruebas automatizadas (Jest/Supertest) para los endpoints clave.
- Monitorizar consumo de tokens e implementar métricas por API key.
