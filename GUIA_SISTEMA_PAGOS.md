# 🇨🇭 SimpliFaq - Guía del Sistema de Pagos y Suscripciones

## 📋 Resumen del Sistema

Tu aplicación **gestiona los planes desde el panel admin** y usa **Stripe solo para procesar pagos**.

### Arquitectura:
```
Panel Admin → Crea Planes en DB → Usuario suscribe → Stripe procesa pago → Webhook actualiza DB
```

---

## 🎯 Gestión de Planes (Desde el Panel Admin)

### 1. Endpoints disponibles:

#### **GET** `/api/admin/plans`
Lista todos los planes creados

#### **POST** `/api/admin/plans`
Crea un nuevo plan

**Body ejemplo:**
```json
{
  "name": "starter",
  "displayName": "Plan Starter",
  "description": "Perfecto para empezar",
  "price": 29.00,
  "currency": "CHF",
  "maxInvoicesPerMonth": 100,
  "maxClientsTotal": 50,
  "maxProductsTotal": 30,
  "hasEmailSupport": true,
  "hasPrioritySupport": false,
  "hasApiAccess": false,
  "hasCustomBranding": false,
  "storageLimit": 500,
  "hasSwissQRBill": true,
  "hasMultiCurrency": false,
  "hasMultiLanguage": false,
  "entitlements": [
    {
      "stripePriceId": "price_1234567890abcdef",
      "isActive": true
    }
  ]
}
```

#### **PUT** `/api/admin/plans/:id`
Actualiza un plan existente

#### **DELETE** `/api/admin/plans/:id`
Elimina un plan (soft delete)

---

## 💳 Configuración de Stripe

### Paso 1: Obtener credenciales de Stripe

1. Ve a: https://dashboard.stripe.com
2. Crea una cuenta o inicia sesión
3. Ve a **Developers → API Keys**
4. Copia:
   - `Secret key` (sk_test_... para test, sk_live_... para producción)
   - `Publishable key` (pk_test_... o pk_live_...)

### Paso 2: Crear productos en Stripe

1. Ve a **Products** en el dashboard de Stripe
2. Click en **Add product**
3. Llena:
   - **Name**: "Plan Starter"
   - **Price**: 29 CHF/mes (recurring monthly)
4. Guarda el producto
5. **Copia el Price ID** (ej: `price_1234567890abcdef`) ⭐ **MUY IMPORTANTE**

### Paso 3: Configurar webhook

1. Ve a **Developers → Webhooks**
2. Click en **Add endpoint**
3. URL del webhook: `https://test.simplifaq.ch/api/billing/webhook/stripe`
4. Eventos a escuchar:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Guarda el **Webhook Secret** (whsec_...)

### Paso 4: Agregar credenciales al servidor

Edita `/var/www/simplifaq/test/backend/.env.production`:

```bash
# Reemplaza estos valores con tus credenciales reales:
STRIPE_SECRET_KEY=sk_test_tu_secret_key_aqui
STRIPE_PUBLISHABLE_KEY=pk_test_tu_publishable_key_aqui
STRIPE_WEBHOOK_SECRET=whsec_tu_webhook_secret_aqui
```

Luego reinicia el backend:
```bash
pm2 restart simplifaq-test-backend
```

---

## 🔄 Flujo Completo de Suscripción

### Desde el Admin:

1. **Crear plan en tu DB:**
```bash
POST /api/admin/plans
{
  "name": "starter",
  "displayName": "Plan Starter",
  "price": 29,
  "entitlements": [{
    "stripePriceId": "price_1234567890abcdef"  # ⭐ El Price ID de Stripe
  }]
}
```

### Desde el Usuario (Frontend):

2. **Usuario ve los planes disponibles:**
```bash
GET /api/billing/plans
# Devuelve todos los planes activos
```

3. **Usuario elige un plan y se suscribe:**
```bash
POST /api/billing/subscription
{
  "planId": "clt1234abcd",  # ID del plan en tu DB
  "paymentMethodId": "pm_1234..."  # Payment method de Stripe.js
}
```

4. **Backend crea suscripción en Stripe:**
   - Busca el plan en tu DB
   - Obtiene el `stripePriceId` del entitlement
   - Crea customer en Stripe (si no existe)
   - Crea subscription en Stripe usando el `stripePriceId`
   - Guarda todo en tu DB (tabla `Subscription`)

5. **Stripe procesa el pago:**
   - Si es exitoso → webhook `checkout.session.completed`
   - Si falla → webhook `invoice.payment_failed`

6. **Webhook actualiza tu DB:**
   - Actualiza status de la suscripción
   - Registra el pago en `BillingLog`
   - Envía email de confirmación

---

## 📊 Tablas de Base de Datos

### **Plan** (plans)
- Almacena la definición completa del plan
- Límites, features, precio en CHF
- Relación con `PlanEntitlement` para el `stripePriceId`

### **PlanEntitlement** (plan_entitlements)
- Conecta un plan con Stripe
- Campo clave: `stripePriceId` (ej: "price_1234...")
- Permite features y límites adicionales en JSON

### **Subscription** (subscriptions)
- Suscripción activa del usuario
- `stripeCustomerId`: ID del cliente en Stripe
- `stripeSubscriptionId`: ID de la suscripción en Stripe
- `status`: active, cancelled, past_due, unpaid

### **BillingLog** (billing_logs)
- Historial de todos los eventos de facturación
- Pagos exitosos, fallos, cancelaciones

---

## 🚀 Endpoints de Billing (Para Usuarios)

### Públicos:
- `GET /api/billing/plans` - Lista planes disponibles

### Protegidos (requieren autenticación):
- `POST /api/billing/subscription` - Crear suscripción
- `GET /api/billing/subscription` - Ver suscripción actual
- `PUT /api/billing/subscription/upgrade` - Cambiar de plan
- `POST /api/billing/subscription/cancel` - Cancelar suscripción
- `POST /api/billing/payment-intent` - Crear intención de pago
- `GET /api/billing/history` - Ver historial de facturación

### Webhook:
- `POST /api/billing/webhook/stripe` - Recibe eventos de Stripe

---

## 🧪 Testing

### Tarjetas de prueba de Stripe:

**Pago exitoso:**
- Número: `4242 4242 4242 4242`
- Fecha: Cualquier fecha futura
- CVC: Cualquier 3 dígitos

**Pago fallido:**
- Número: `4000 0000 0000 0002`

**Requiere autenticación:**
- Número: `4000 0025 0000 3155`

---

## 📝 Checklist de Implementación

### Backend: ✅ COMPLETADO
- [x] Habilitar `billingController.ts`
- [x] Habilitar rutas `/api/billing/*`
- [x] Agregar variables de entorno Stripe
- [x] Sistema de webhooks funcional
- [x] CRUD de planes en admin

### Por hacer:
- [ ] Obtener credenciales reales de Stripe
- [ ] Crear productos en Stripe
- [ ] Configurar webhook en Stripe
- [ ] Agregar keys al `.env.production`
- [ ] Crear página de planes en el frontend admin
- [ ] Crear página de checkout en el frontend usuario
- [ ] Integrar Stripe.js en el frontend
- [ ] Probar flujo completo end-to-end

---

## 🎯 Próximos Pasos Inmediatos

1. **Crear cuenta en Stripe** (si no tienes)
   - https://dashboard.stripe.com/register

2. **Crear tu primer producto de prueba**
   - Dashboard → Products → Add product
   - "Plan Starter - 29 CHF/mes"
   - Copiar el Price ID

3. **Configurar webhook**
   - Developers → Webhooks
   - URL: `https://test.simplifaq.ch/api/billing/webhook/stripe`

4. **Agregar keys al servidor**
   - Editar `.env.production`
   - `pm2 restart 1`

5. **Crear plan en tu panel admin**
   - POST a `/api/admin/plans` con el Price ID de Stripe

---

## 🔐 Seguridad

- ✅ Webhook signature verification implementada
- ✅ Rate limiting en endpoints públicos
- ✅ Autenticación JWT en endpoints protegidos
- ✅ Validación con Zod en todos los inputs
- ✅ Stripe API keys en variables de entorno

---

## 🆘 Troubleshooting

### Error: "Stripe not configured"
- Verifica que `STRIPE_SECRET_KEY` esté en `.env.production`
- Reinicia PM2: `pm2 restart simplifaq-test-backend`

### Webhook no funciona:
- Verifica la URL en el dashboard de Stripe
- Verifica que `STRIPE_WEBHOOK_SECRET` sea correcto
- Revisa logs: `pm2 logs simplifaq-test-backend`

### Plan no tiene stripePriceId:
- Asegúrate de incluir `entitlements` al crear el plan
- El `stripePriceId` debe venir de Stripe (ej: "price_1234...")

---

## 📚 Recursos

- Documentación Stripe: https://stripe.com/docs
- Dashboard Stripe: https://dashboard.stripe.com
- Testing con tarjetas: https://stripe.com/docs/testing
- Webhooks: https://stripe.com/docs/webhooks

---

## 🇨🇭 Consideraciones Suizas

- ✅ Precios en CHF configurados
- ✅ IVA suizo (8.1%) considerado
- ✅ Facturación compatible con QR-Bill
- 🔜 Payrexx (pasarela suiza) - próxima fase

---

**Última actualización:** 2025-11-12
**Estado:** Sistema habilitado, requiere configuración de Stripe
