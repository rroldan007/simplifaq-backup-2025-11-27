# Plan de Optimización: Sistema de Suscripciones y Pagos con Stripe

## 📋 Estado Actual

### ✅ Lo que ya existe:
- Schema Prisma con modelos: `User`, `Subscription`, `Plan`, `PlanEntitlement`
- API REST completa para administración de suscripciones
- Servicio `SubscriptionManagementService` con lógica de negocio
- Integración parcial con Stripe
- Campos en DB para `stripeCustomerId`, `stripeSubscriptionId`, `stripePriceId`

### ❌ Lo que falta:
1. **Stripe configurado en producción** (actualmente keys de test)
2. **Webhook de Stripe** para sincronizar eventos de pago
3. **Flujo de checkout** para que usuarios se suscriban
4. **Frontend** para gestionar planes y suscripciones
5. **Migración automática** de usuarios gratuitos a planes de pago

---

## 🎯 Objetivos de Optimización

### 1. **Clarificar Terminología**
- **Plans (Planes)**: Plantillas de suscripción (Free, Basic, Premium)
- **Abonnements (Suscripciones)**: Instancia activa de un plan para un usuario específico
- **Relación**: `User` → `Subscription` → `Plan`

### 2. **Flujo Optimizado de Suscripción**

```
┌─────────────────────────────────────────────────────────────┐
│                    USUARIO NUEVO                             │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Registro → Plan FREE automático (sin Stripe)            │
│     - User.subscriptionPlan = "free"                         │
│     - Subscription creada con planId = "free"                │
│     - NO se crea stripeCustomerId                            │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Usuario decide UPGRADE a plan de pago                    │
│     - Click en "Upgrade to Basic/Premium"                    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Checkout con Stripe                                      │
│     a) Crear Stripe Customer (si no existe)                  │
│     b) Crear Stripe Checkout Session                         │
│     c) Redirigir a Stripe Checkout                           │
│     d) Usuario ingresa tarjeta y paga                        │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Webhook de Stripe recibe evento                          │
│     - checkout.session.completed                             │
│     - customer.subscription.created                          │
│     - invoice.payment_succeeded                              │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Backend actualiza DB                                     │
│     - Subscription.status = "active"                         │
│     - Subscription.stripeSubscriptionId = "sub_xxx"          │
│     - User.subscriptionPlan = "basic" o "premium"            │
│     - BillingLog creado con evento de pago                   │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  6. Usuario tiene acceso completo al plan                    │
│     - Límites actualizados según plan                        │
│     - Features desbloqueadas                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Arquitectura Optimizada

### **1. Estructura de Planes**

```typescript
// Planes predefinidos en DB
const PLANS = {
  FREE: {
    name: "free",
    displayName: "Plan Gratuit",
    price: 0,
    stripePriceId: null, // No Stripe para plan gratuito
    maxInvoicesPerMonth: 10,
    maxClientsTotal: 5,
    maxProductsTotal: 10,
    hasEmailSupport: false,
    hasSwissQRBill: true,
  },
  BASIC: {
    name: "basic",
    displayName: "Plan Basique",
    price: 29.00, // CHF/mes
    stripePriceId: "price_xxx_basic_monthly", // ID de Stripe
    maxInvoicesPerMonth: 100,
    maxClientsTotal: 50,
    maxProductsTotal: 100,
    hasEmailSupport: true,
    hasSwissQRBill: true,
    hasAdvancedReports: true,
  },
  PREMIUM: {
    name: "premium",
    displayName: "Plan Premium",
    price: 79.00, // CHF/mes
    stripePriceId: "price_xxx_premium_monthly",
    maxInvoicesPerMonth: -1, // Ilimitado
    maxClientsTotal: -1,
    maxProductsTotal: -1,
    hasEmailSupport: true,
    hasPrioritySupport: true,
    hasSwissQRBill: true,
    hasAdvancedReports: true,
    hasApiAccess: true,
    hasCustomBranding: true,
  },
};
```

### **2. Endpoints Necesarios**

#### **A. Para Usuarios (Frontend)**

```typescript
// GET /api/plans - Listar planes disponibles
GET /api/plans
Response: {
  plans: [
    { id, name, displayName, price, currency, features: {...} },
    ...
  ]
}

// POST /api/subscriptions/checkout - Crear sesión de checkout
POST /api/subscriptions/checkout
Body: { planId: "plan_xxx" }
Response: {
  checkoutUrl: "https://checkout.stripe.com/c/pay/cs_xxx",
  sessionId: "cs_xxx"
}

// GET /api/subscriptions/me - Ver mi suscripción actual
GET /api/subscriptions/me
Response: {
  subscription: {
    id, planId, status, currentPeriodEnd,
    plan: { name, displayName, features },
    usage: { invoices: 5/100, clients: 10/50 }
  }
}

// POST /api/subscriptions/cancel - Cancelar mi suscripción
POST /api/subscriptions/cancel
Response: { success: true, cancelAtPeriodEnd: true }

// POST /api/subscriptions/portal - Acceder al portal de Stripe
POST /api/subscriptions/portal
Response: { portalUrl: "https://billing.stripe.com/p/session/xxx" }
```

#### **B. Para Administradores (ya existen)**

```typescript
// Ya implementados en /api/admin/subscriptions/*
GET    /api/admin/subscriptions - Listar todas las suscripciones
GET    /api/admin/subscriptions/:id - Ver detalles
PUT    /api/admin/subscriptions/:id - Actualizar
POST   /api/admin/subscriptions/:id/cancel - Cancelar
POST   /api/admin/subscriptions/:id/change-plan - Cambiar plan
POST   /api/admin/subscriptions/:id/credits - Agregar créditos
POST   /api/admin/subscriptions/:id/refund - Procesar reembolso
```

#### **C. Webhook de Stripe**

```typescript
// POST /api/webhooks/stripe - Recibir eventos de Stripe
POST /api/webhooks/stripe
Headers: { stripe-signature: "xxx" }
Body: { type: "checkout.session.completed", data: {...} }

// Eventos a manejar:
- checkout.session.completed → Activar suscripción
- customer.subscription.created → Crear suscripción
- customer.subscription.updated → Actualizar suscripción
- customer.subscription.deleted → Cancelar suscripción
- invoice.payment_succeeded → Registrar pago exitoso
- invoice.payment_failed → Marcar pago fallido
- customer.updated → Actualizar datos del cliente
```

---

## 📝 Tareas de Implementación

### **Fase 1: Configuración de Stripe (1-2 horas)**

#### 1.1 Crear productos y precios en Stripe Dashboard
```bash
# Ir a: https://dashboard.stripe.com/products
# Crear 2 productos:
1. Plan Basique - 29 CHF/mes → Copiar price_id
2. Plan Premium - 79 CHF/mes → Copiar price_id
```

#### 1.2 Actualizar .env.production con keys reales
```env
STRIPE_SECRET_KEY=sk_live_xxx  # Key de producción
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx  # Después de crear webhook
```

#### 1.3 Actualizar planes en DB con stripePriceId
```sql
-- Actualizar planes existentes
UPDATE plans SET 
  stripe_price_id = 'price_xxx_basic' 
WHERE name = 'basic';

UPDATE plans SET 
  stripe_price_id = 'price_xxx_premium' 
WHERE name = 'premium';
```

---

### **Fase 2: Backend - Webhook de Stripe (2-3 horas)**

#### 2.1 Crear controlador de webhook
**Archivo**: `/src/controllers/stripeWebhookController.ts`

```typescript
import { Request, Response } from 'express';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const prisma = new PrismaClient();

export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Manejar eventos
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
      break;
    
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    
    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;
    
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;
  }

  res.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const planId = session.metadata?.planId;
  
  if (!userId || !planId) return;

  // Actualizar suscripción del usuario
  await prisma.subscription.update({
    where: { userId },
    data: {
      planId,
      status: 'active',
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: session.subscription as string,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  // Actualizar user
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  await prisma.user.update({
    where: { id: userId },
    data: { subscriptionPlan: plan!.name },
  });

  // Log de pago
  await prisma.billingLog.create({
    data: {
      subscriptionId: (await prisma.subscription.findUnique({ where: { userId } }))!.id,
      userId,
      eventType: 'payment_succeeded',
      amount: session.amount_total! / 100,
      currency: session.currency!.toUpperCase(),
      status: 'success',
      stripePaymentId: session.payment_intent as string,
    },
  });
}

// ... más handlers
```

#### 2.2 Crear ruta de webhook
**Archivo**: `/src/routes/webhooks.ts`

```typescript
import { Router } from 'express';
import express from 'express';
import { handleStripeWebhook } from '../controllers/stripeWebhookController';

const router = Router();

// IMPORTANTE: raw body para verificar signature de Stripe
router.post('/stripe', 
  express.raw({ type: 'application/json' }), 
  handleStripeWebhook
);

export default router;
```

#### 2.3 Registrar webhook en Stripe
```bash
# En Stripe Dashboard:
# https://dashboard.stripe.com/webhooks
# Crear webhook con URL: https://test.simplifaq.ch/api/webhooks/stripe
# Eventos a escuchar:
- checkout.session.completed
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- invoice.payment_succeeded
- invoice.payment_failed
```

---

### **Fase 3: Backend - API de Usuario (2-3 horas)**

#### 3.1 Crear controlador de suscripciones de usuario
**Archivo**: `/src/controllers/userSubscriptionController.ts`

```typescript
import { Request, Response } from 'express';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const prisma = new PrismaClient();

// GET /api/subscriptions/me - Ver mi suscripción
export async function getMySubscription(req: Request, res: Response) {
  const userId = req.user!.id;

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    include: {
      plan: true,
      usageRecords: {
        where: { period: new Date().toISOString().slice(0, 7) },
      },
    },
  });

  if (!subscription) {
    return res.status(404).json({ error: 'Subscription not found' });
  }

  // Calcular uso actual
  const usage = subscription.usageRecords.reduce((acc, record) => {
    acc[record.resourceType] = record.quantity;
    return acc;
  }, {} as Record<string, number>);

  res.json({
    subscription: {
      ...subscription,
      usage: {
        invoices: `${usage.invoices || 0}/${subscription.plan.maxInvoicesPerMonth}`,
        clients: `${usage.clients || 0}/${subscription.plan.maxClientsTotal}`,
        products: `${usage.products || 0}/${subscription.plan.maxProductsTotal}`,
      },
    },
  });
}

// POST /api/subscriptions/checkout - Crear checkout session
export async function createCheckoutSession(req: Request, res: Response) {
  const userId = req.user!.id;
  const { planId } = req.body;

  const [user, plan] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.plan.findUnique({ where: { id: planId } }),
  ]);

  if (!plan || !plan.stripePriceId) {
    return res.status(400).json({ error: 'Invalid plan' });
  }

  // Crear o obtener Stripe customer
  let stripeCustomerId = user!.subscription?.stripeCustomerId;
  
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user!.email,
      name: `${user!.firstName} ${user!.lastName}`,
      metadata: { userId },
    });
    stripeCustomerId = customer.id;
  }

  // Crear checkout session
  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: plan.stripePriceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${process.env.FRONTEND_URL}/dashboard?checkout=success`,
    cancel_url: `${process.env.FRONTEND_URL}/pricing?checkout=cancelled`,
    metadata: {
      userId,
      planId,
    },
  });

  res.json({
    checkoutUrl: session.url,
    sessionId: session.id,
  });
}

// POST /api/subscriptions/portal - Acceder al portal de Stripe
export async function createPortalSession(req: Request, res: Response) {
  const userId = req.user!.id;

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription?.stripeCustomerId) {
    return res.status(400).json({ error: 'No Stripe customer found' });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${process.env.FRONTEND_URL}/dashboard`,
  });

  res.json({ portalUrl: session.url });
}

// POST /api/subscriptions/cancel - Cancelar suscripción
export async function cancelSubscription(req: Request, res: Response) {
  const userId = req.user!.id;

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription?.stripeSubscriptionId) {
    return res.status(400).json({ error: 'No active subscription' });
  }

  // Cancelar en Stripe (al final del período)
  await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  // Actualizar en DB
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { cancelAtPeriodEnd: true },
  });

  res.json({ success: true, cancelAtPeriodEnd: true });
}
```

#### 3.2 Crear rutas de usuario
**Archivo**: `/src/routes/userSubscriptions.ts`

```typescript
import { Router } from 'express';
import { auth } from '../middleware/auth';
import {
  getMySubscription,
  createCheckoutSession,
  createPortalSession,
  cancelSubscription,
} from '../controllers/userSubscriptionController';

const router = Router();

router.use(auth); // Proteger todas las rutas

router.get('/me', getMySubscription);
router.post('/checkout', createCheckoutSession);
router.post('/portal', createPortalSession);
router.post('/cancel', cancelSubscription);

export default router;
```

---

### **Fase 4: Frontend - Gestión de Planes (3-4 horas)**

#### 4.1 Página de Pricing
**Archivo**: `/frontend/src/pages/Pricing.tsx`

```typescript
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export function PricingPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadPlans();
  }, []);

  async function loadPlans() {
    const response = await api.get('/api/plans');
    setPlans(response.data.plans);
  }

  async function handleUpgrade(planId: string) {
    setLoading(true);
    try {
      const response = await api.post('/api/subscriptions/checkout', { planId });
      window.location.href = response.data.checkoutUrl; // Redirigir a Stripe
    } catch (error) {
      alert('Erreur lors de la création de la session de paiement');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pricing-page">
      <h1>Choisissez votre plan</h1>
      <div className="plans-grid">
        {plans.map(plan => (
          <div key={plan.id} className="plan-card">
            <h2>{plan.displayName}</h2>
            <p className="price">
              {plan.price === 0 ? 'Gratuit' : `${plan.price} CHF/mois`}
            </p>
            <ul className="features">
              <li>{plan.maxInvoicesPerMonth} factures/mois</li>
              <li>{plan.maxClientsTotal} clients</li>
              <li>{plan.maxProductsTotal} produits</li>
              {plan.hasEmailSupport && <li>Support par email</li>}
              {plan.hasPrioritySupport && <li>Support prioritaire</li>}
            </ul>
            <button 
              onClick={() => handleUpgrade(plan.id)}
              disabled={loading || plan.price === 0}
            >
              {plan.price === 0 ? 'Plan actuel' : 'Choisir ce plan'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### 4.2 Componente de Suscripción en Dashboard
**Archivo**: `/frontend/src/components/SubscriptionWidget.tsx`

```typescript
import { useState, useEffect } from 'react';
import { api } from '../services/api';

export function SubscriptionWidget() {
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    loadSubscription();
  }, []);

  async function loadSubscription() {
    const response = await api.get('/api/subscriptions/me');
    setSubscription(response.data.subscription);
  }

  async function handleManageBilling() {
    const response = await api.post('/api/subscriptions/portal');
    window.location.href = response.data.portalUrl;
  }

  if (!subscription) return null;

  return (
    <div className="subscription-widget">
      <h3>Votre abonnement</h3>
      <p><strong>Plan:</strong> {subscription.plan.displayName}</p>
      <p><strong>Statut:</strong> {subscription.status}</p>
      
      <div className="usage">
        <h4>Utilisation ce mois</h4>
        <p>Factures: {subscription.usage.invoices}</p>
        <p>Clients: {subscription.usage.clients}</p>
        <p>Produits: {subscription.usage.products}</p>
      </div>

      <button onClick={handleManageBilling}>
        Gérer mon abonnement
      </button>
    </div>
  );
}
```

---

## 🔒 Seguridad y Mejores Prácticas

### 1. **Validación de Webhook**
```typescript
// SIEMPRE verificar signature de Stripe
stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
```

### 2. **Idempotencia**
```typescript
// Usar stripeEventId para evitar procesar eventos duplicados
const existingLog = await prisma.billingLog.findFirst({
  where: { stripeEventId: event.id }
});
if (existingLog) return; // Ya procesado
```

### 3. **Manejo de Errores**
```typescript
// Siempre loggear errores de Stripe
try {
  await stripe.subscriptions.update(...);
} catch (error) {
  console.error('Stripe error:', error);
  await prisma.billingLog.create({
    data: {
      eventType: 'stripe_error',
      status: 'failed',
      errorMessage: error.message,
    },
  });
  throw error;
}
```

### 4. **Testing**
```bash
# Usar Stripe CLI para testing local
stripe listen --forward-to localhost:3003/api/webhooks/stripe
stripe trigger checkout.session.completed
```

---

## 📊 Métricas y Monitoreo

### KPIs a trackear:
1. **MRR (Monthly Recurring Revenue)**: Suma de todas las suscripciones activas
2. **Churn Rate**: % de usuarios que cancelan cada mes
3. **Conversion Rate**: % de usuarios free que upgradan
4. **ARPU (Average Revenue Per User)**: MRR / Total usuarios activos
5. **LTV (Lifetime Value)**: Valor promedio de un usuario durante su vida

### Dashboard de Admin:
```typescript
GET /api/admin/subscriptions/stats/overview
Response: {
  mrr: 5800.00,
  churnRate: 2.5,
  conversionRate: 15.3,
  arpu: 45.00,
  activeSubscriptions: 129,
  planDistribution: {
    free: 450,
    basic: 85,
    premium: 44
  }
}
```

---

## 🚀 Deployment Checklist

### Antes de ir a producción:

- [ ] Crear productos en Stripe Dashboard (producción)
- [ ] Actualizar .env.production con keys reales
- [ ] Configurar webhook en Stripe apuntando a producción
- [ ] Actualizar planes en DB con stripePriceId reales
- [ ] Probar flujo completo en modo test
- [ ] Configurar alertas de Stripe (pagos fallidos, etc.)
- [ ] Documentar proceso de soporte para cancelaciones
- [ ] Configurar emails transaccionales (confirmación de pago, etc.)
- [ ] Implementar logging y monitoreo de errores
- [ ] Backup de DB antes del deploy

---

## 📞 Soporte y Mantenimiento

### Tareas recurrentes:
1. **Diario**: Revisar pagos fallidos en Stripe Dashboard
2. **Semanal**: Analizar métricas de conversión y churn
3. **Mensual**: Revisar y optimizar precios de planes
4. **Trimestral**: Auditoría de suscripciones y reconciliación con Stripe

### Casos de soporte comunes:
1. **Pago fallido**: Reenviar email, actualizar tarjeta en portal
2. **Cancelación**: Ofrecer descuento, pausar suscripción
3. **Upgrade/Downgrade**: Usar API de cambio de plan con proration
4. **Reembolso**: Usar endpoint de refund con Stripe

---

## 💡 Optimizaciones Futuras

1. **Planes anuales** con descuento (15-20%)
2. **Trial period** de 14 días para planes de pago
3. **Add-ons** (facturas adicionales, almacenamiento extra)
4. **Cupones y promociones** con Stripe Coupons
5. **Facturación por uso** (pay-as-you-go para excesos)
6. **Multi-currency** (EUR, USD además de CHF)
7. **Invoicing automático** con Stripe Invoicing
8. **Dunning management** para recuperar pagos fallidos

---

## 📚 Recursos

- [Stripe Docs - Subscriptions](https://stripe.com/docs/billing/subscriptions/overview)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Stripe Customer Portal](https://stripe.com/docs/billing/subscriptions/customer-portal)
- [Prisma Docs](https://www.prisma.io/docs/)

---

**Tiempo estimado total**: 8-12 horas
**Prioridad**: Alta
**Dependencias**: Stripe account configurado, DB migrada
