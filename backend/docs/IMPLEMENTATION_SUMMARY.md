# Resumen de Implementación: Sistema de Suscripciones Optimizado

## ✅ Lo que se ha creado

### 1. **Documentación Completa**
- ✅ `/docs/SUBSCRIPTION_OPTIMIZATION_PLAN.md` - Plan detallado de optimización
- ✅ `/docs/SUBSCRIPTION_MANAGEMENT_API.md` - API existente documentada
- ✅ Este archivo - Resumen de implementación

### 2. **Backend - Webhook de Stripe**
- ✅ `/src/controllers/stripeWebhookController.ts` - Controlador completo para eventos de Stripe
  - Maneja `checkout.session.completed`
  - Maneja `customer.subscription.created/updated/deleted`
  - Maneja `invoice.payment_succeeded/failed`
  - Implementa idempotencia para evitar procesamiento duplicado
  - Logging completo de eventos

### 3. **Backend - API de Usuario**
- ✅ `/src/controllers/userSubscriptionController.ts` - Controlador para usuarios
  - `GET /api/subscriptions/me` - Ver suscripción actual
  - `POST /api/subscriptions/checkout` - Crear sesión de checkout
  - `POST /api/subscriptions/portal` - Acceder al portal de Stripe
  - `POST /api/subscriptions/cancel` - Cancelar suscripción
  - `POST /api/subscriptions/reactivate` - Reactivar suscripción
  - `GET /api/plans` - Listar planes disponibles (público)

### 4. **Backend - Rutas**
- ✅ `/src/routes/webhooks.ts` - Ruta para webhook de Stripe
- ✅ `/src/routes/userSubscriptions.ts` - Rutas para usuarios

### 5. **Base de Datos**
- ✅ `/prisma/migrations/add_stripe_price_id_to_plan.sql` - Migración SQL

---

## 🔧 Pasos para Completar la Implementación

### **Paso 1: Actualizar Schema de Prisma** (5 min)

Agregar campo `stripePriceId` al modelo `Plan`:

```prisma
// En prisma/schema.prisma, actualizar el modelo Plan:
model Plan {
  id                  String            @id @default(cuid())
  name                String            @unique
  displayName         String
  description         String?
  price               Float
  currency            String            @default("CHF")
  stripePriceId       String?           @unique // ← AGREGAR ESTA LÍNEA
  isActive            Boolean           @default(true)
  // ... resto de campos
}
```

Luego ejecutar:
```bash
cd /var/www/simplifaq/test/backend
npx prisma generate
```

### **Paso 2: Ejecutar Migración SQL** (2 min)

```bash
cd /var/www/simplifaq/test/backend
psql -U simplifaq -d simplifaq_prod -f prisma/migrations/add_stripe_price_id_to_plan.sql
```

### **Paso 3: Configurar Stripe** (15-20 min)

#### 3.1 Crear Productos en Stripe Dashboard
1. Ir a: https://dashboard.stripe.com/products
2. Crear producto "Plan Basique":
   - Precio: 29 CHF/mes
   - Recurrente: Mensual
   - Copiar el **Price ID** (ej: `price_1ABC123xyz`)

3. Crear producto "Plan Premium":
   - Precio: 79 CHF/mes
   - Recurrente: Mensual
   - Copiar el **Price ID**

#### 3.2 Actualizar .env.production
```bash
nano /var/www/simplifaq/test/backend/.env.production
```

Actualizar las siguientes líneas:
```env
# Reemplazar con keys REALES de producción
STRIPE_SECRET_KEY=sk_live_XXXXXXXXXXXXXXXX
STRIPE_PUBLISHABLE_KEY=pk_live_XXXXXXXXXXXXXXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXXXXX  # Se obtiene en paso 3.3
```

#### 3.3 Configurar Webhook en Stripe
1. Ir a: https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. URL: `https://test.simplifaq.ch/api/webhooks/stripe`
4. Seleccionar eventos:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.updated`
5. Copiar el **Signing secret** (whsec_xxx) y agregarlo al .env

#### 3.4 Actualizar Planes en DB con Price IDs reales
```sql
-- Conectar a la DB
psql -U simplifaq -d simplifaq_prod

-- Actualizar con los Price IDs reales de Stripe
UPDATE plans SET stripe_price_id = 'price_1ABC123xyz' WHERE name = 'basic';
UPDATE plans SET stripe_price_id = 'price_1DEF456xyz' WHERE name = 'premium';
UPDATE plans SET stripe_price_id = NULL WHERE name = 'free';
```

### **Paso 4: Registrar Rutas en index.ts** (5 min)

Editar `/src/index.ts` o `/src/index.dev.ts` y agregar:

```typescript
import webhookRoutes from './routes/webhooks';
import userSubscriptionRoutes from './routes/userSubscriptions';

// ... después de otras rutas

// Webhook de Stripe (DEBE ir ANTES de express.json())
app.use('/api/webhooks', webhookRoutes);

// Rutas de suscripciones de usuario
app.use('/api/subscriptions', userSubscriptionRoutes);
```

**IMPORTANTE**: El webhook de Stripe DEBE registrarse ANTES de `app.use(express.json())` porque necesita el body raw.

### **Paso 5: Reiniciar el Backend** (2 min)

```bash
cd /var/www/simplifaq/test/backend
pm2 restart simplifaq-backend
# O si usas otro método:
npm run build
pm2 restart all
```

### **Paso 6: Probar el Sistema** (10 min)

#### 6.1 Probar Webhook con Stripe CLI (local)
```bash
# Instalar Stripe CLI si no está instalado
# https://stripe.com/docs/stripe-cli

stripe login
stripe listen --forward-to https://test.simplifaq.ch/api/webhooks/stripe
stripe trigger checkout.session.completed
```

#### 6.2 Probar API de Planes
```bash
curl https://test.simplifaq.ch/api/plans
```

Debe retornar lista de planes con `stripePriceId`.

#### 6.3 Probar Checkout (desde frontend o Postman)
```bash
# Con token de autenticación
curl -X POST https://test.simplifaq.ch/api/subscriptions/checkout \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"planId": "PLAN_ID_FROM_DB"}'
```

Debe retornar `checkoutUrl` de Stripe.

---

## 🎨 Frontend - Próximos Pasos

### **Componentes a Crear**

1. **Página de Pricing** (`/pricing`)
   - Mostrar 3 planes (Free, Basic, Premium)
   - Botón "Choisir ce plan" que llama a `/api/subscriptions/checkout`
   - Redirige a Stripe Checkout

2. **Widget de Suscripción** (Dashboard)
   - Mostrar plan actual
   - Mostrar uso (facturas, clientes, productos)
   - Botón "Gérer mon abonnement" → Portal de Stripe
   - Botón "Upgrade" si está en plan gratuito

3. **Página de Confirmación** (`/dashboard?checkout=success`)
   - Mensaje de éxito después del pago
   - Mostrar nuevo plan activado

### **Ejemplo de Integración en React**

```typescript
// src/services/subscriptionService.ts
export const subscriptionService = {
  async getMySubscription() {
    const response = await api.get('/api/subscriptions/me');
    return response.data;
  },

  async createCheckout(planId: string) {
    const response = await api.post('/api/subscriptions/checkout', { planId });
    return response.data;
  },

  async openBillingPortal() {
    const response = await api.post('/api/subscriptions/portal');
    window.location.href = response.data.portalUrl;
  },

  async cancelSubscription() {
    const response = await api.post('/api/subscriptions/cancel');
    return response.data;
  },
};

// src/pages/Pricing.tsx
export function PricingPage() {
  const navigate = useNavigate();

  const handleUpgrade = async (planId: string) => {
    try {
      const { checkoutUrl } = await subscriptionService.createCheckout(planId);
      window.location.href = checkoutUrl; // Redirigir a Stripe
    } catch (error) {
      toast.error('Erreur lors de la création du checkout');
    }
  };

  return (
    <div className="pricing-grid">
      {plans.map(plan => (
        <PlanCard 
          key={plan.id} 
          plan={plan} 
          onSelect={() => handleUpgrade(plan.id)} 
        />
      ))}
    </div>
  );
}
```

---

## 🔍 Verificación y Testing

### **Checklist de Verificación**

- [ ] Schema de Prisma actualizado con `stripePriceId`
- [ ] Migración SQL ejecutada
- [ ] Productos creados en Stripe Dashboard
- [ ] Price IDs actualizados en DB
- [ ] Variables de entorno configuradas (.env.production)
- [ ] Webhook configurado en Stripe Dashboard
- [ ] Rutas registradas en index.ts
- [ ] Backend reiniciado
- [ ] Endpoint `/api/plans` funciona
- [ ] Endpoint `/api/subscriptions/checkout` funciona
- [ ] Webhook recibe eventos de Stripe
- [ ] Logs de webhook visibles en consola

### **Comandos de Testing**

```bash
# Ver logs del backend
pm2 logs simplifaq-backend

# Ver logs de Stripe webhook
tail -f /var/log/simplifaq-backend.log | grep "Stripe"

# Probar webhook manualmente
curl -X POST https://test.simplifaq.ch/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -H "stripe-signature: test" \
  -d '{"type":"ping"}'
```

---

## 📊 Monitoreo Post-Implementación

### **Métricas a Vigilar**

1. **Stripe Dashboard**:
   - Pagos exitosos vs fallidos
   - Tasa de conversión de checkout
   - Cancelaciones

2. **Base de Datos**:
   ```sql
   -- Ver suscripciones activas
   SELECT status, COUNT(*) FROM subscriptions GROUP BY status;

   -- Ver distribución de planes
   SELECT p.name, COUNT(s.id) as count
   FROM plans p
   LEFT JOIN subscriptions s ON s.plan_id = p.id
   GROUP BY p.name;

   -- Ver eventos de billing recientes
   SELECT event_type, status, COUNT(*)
   FROM billing_logs
   WHERE created_at > NOW() - INTERVAL '7 days'
   GROUP BY event_type, status;
   ```

3. **Logs del Backend**:
   - Eventos de webhook procesados
   - Errores de Stripe
   - Checkouts creados

---

## 🐛 Troubleshooting Común

### **Problema: Webhook no recibe eventos**
**Solución**:
1. Verificar que la URL del webhook en Stripe sea correcta
2. Verificar que el `STRIPE_WEBHOOK_SECRET` esté configurado
3. Ver logs: `pm2 logs simplifaq-backend | grep webhook`
4. Probar con Stripe CLI: `stripe trigger checkout.session.completed`

### **Problema: Checkout falla con "Plan not found"**
**Solución**:
1. Verificar que el `planId` exista en la DB
2. Verificar que el plan tenga `stripePriceId` configurado
3. Verificar que el `stripePriceId` exista en Stripe Dashboard

### **Problema: Usuario no se actualiza después del pago**
**Solución**:
1. Verificar que el webhook se esté ejecutando
2. Ver logs de `billing_logs` en la DB
3. Verificar que el `userId` esté en los metadata del checkout

### **Problema: TypeScript errors en controllers**
**Solución**:
1. Ejecutar `npx prisma generate` después de actualizar schema
2. Reiniciar TypeScript server en VS Code
3. Los errores de tipos se resolverán automáticamente después de generar Prisma Client

---

## 📝 Notas Importantes

### **Diferencia entre Plans y Abonnements**
- **Plans (Planes)**: Plantillas/configuraciones (Free, Basic, Premium) - Tabla `plans`
- **Abonnements (Suscripciones)**: Instancia activa de un plan para un usuario - Tabla `subscriptions`
- **Relación**: `User` → `Subscription` → `Plan`

### **Flujo de Pago**
1. Usuario hace click en "Upgrade"
2. Backend crea Stripe Checkout Session
3. Usuario es redirigido a Stripe
4. Usuario paga con tarjeta
5. Stripe envía webhook `checkout.session.completed`
6. Backend actualiza `subscription` y `user`
7. Usuario es redirigido de vuelta con `?checkout=success`

### **Plan Gratuito**
- NO tiene `stripePriceId` (es NULL)
- NO pasa por Stripe
- Se asigna automáticamente al registrarse
- NO tiene webhook de pago

### **Cancelaciones**
- Por defecto: Cancelación al final del período (`cancel_at_period_end=true`)
- Usuario puede seguir usando hasta que expire
- Después expira: Downgrade automático a plan gratuito

---

## 🚀 Próximas Mejoras

1. **Planes Anuales** con descuento (15-20%)
2. **Trial Period** de 14 días
3. **Cupones y Promociones**
4. **Add-ons** (facturas extra, almacenamiento)
5. **Facturación por uso** (pay-as-you-go)
6. **Multi-currency** (EUR, USD)
7. **Dunning management** (recuperar pagos fallidos)

---

## 📞 Contacto y Soporte

Para dudas sobre la implementación:
- Revisar logs: `pm2 logs simplifaq-backend`
- Stripe Dashboard: https://dashboard.stripe.com
- Documentación Stripe: https://stripe.com/docs

**Tiempo estimado de implementación completa**: 30-45 minutos
**Complejidad**: Media
**Prioridad**: Alta ⭐⭐⭐
