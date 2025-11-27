# Guía para Ver Cambios en el Admin - Suscripciones

## ✅ Backend Completado

El backend ya está funcionando correctamente:

### Endpoints Disponibles

#### Públicos (sin autenticación)
```bash
GET https://test.simplifaq.ch/api/plans
# ✅ FUNCIONA - Retorna 4 planes (Beta, Free, Basic, Premium)
```

#### Admin (requieren autenticación admin)
```bash
GET  /api/admin/plans                    # Listar planes
POST /api/admin/plans                    # Crear plan
GET  /api/admin/plans/:id                # Ver plan
PUT  /api/admin/plans/:id                # Actualizar plan
DELETE /api/admin/plans/:id              # Eliminar plan

GET  /api/admin/subscriptions            # Listar suscripciones
GET  /api/admin/subscriptions/:id        # Ver suscripción
POST /api/admin/subscriptions/:id/change-plan  # Cambiar plan
POST /api/admin/subscriptions/:id/cancel       # Cancelar
```

#### Usuario (requieren autenticación usuario)
```bash
GET  /api/subscriptions/me               # Ver mi suscripción
POST /api/subscriptions/checkout         # Crear pago Stripe
POST /api/subscriptions/portal           # Portal facturación
POST /api/subscriptions/cancel           # Cancelar
POST /api/subscriptions/reactivate       # Reactivar
```

---

## 🎨 Frontend - Lo que Falta

Para ver los cambios en el admin, necesitas agregar las vistas en el frontend React.

### 1. Verificar Rutas Admin Existentes

El admin ya tiene estas rutas (verificar en `/frontend/src/App.tsx` o router):
- `/admin/users` - Lista de usuarios
- `/admin/subscriptions` - Lista de suscripciones (si existe)
- `/admin/plans` - Lista de planes (por agregar)

### 2. Agregar Vista de Planes en Admin

Crear archivo: `/frontend/src/pages/admin/Plans.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { adminApi } from '../../services/adminApi';

interface Plan {
  id: string;
  name: string;
  displayName: string;
  description: string;
  price: number;
  currency: string;
  maxInvoicesPerMonth: number;
  maxClientsTotal: number;
  isActive: boolean;
}

export const AdminPlans: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const response = await adminApi.get('/admin/plans');
      setPlans(response.data.data || []);
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Chargement...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Plans de Suscripción</h1>
      
      <div className="bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Nom
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Prix
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Factures/mois
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Clients max
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Statut
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {plans.map((plan) => (
              <tr key={plan.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {plan.displayName}
                  </div>
                  <div className="text-sm text-gray-500">{plan.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {plan.price} {plan.currency}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {plan.maxInvoicesPerMonth === -1 ? 'Illimité' : plan.maxInvoicesPerMonth}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {plan.maxClientsTotal === -1 ? 'Illimité' : plan.maxClientsTotal}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    plan.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {plan.isActive ? 'Actif' : 'Inactif'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
```

### 3. Agregar Ruta en el Router

En tu archivo de rutas (ej: `App.tsx` o `routes.tsx`):

```typescript
import { AdminPlans } from './pages/admin/Plans';

// Dentro de las rutas admin:
<Route path="/admin/plans" element={<AdminPlans />} />
```

### 4. Agregar Link en el Sidebar Admin

En `/frontend/src/components/admin/AdminSidebar.tsx`:

```typescript
<NavLink
  to="/admin/plans"
  className={({ isActive }) =>
    `flex items-center px-4 py-2 text-sm ${
      isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
    }`
  }
>
  <CreditCard className="w-5 h-5 mr-3" />
  Plans
</NavLink>
```

### 5. Vista de Suscripciones de Usuarios

Crear archivo: `/frontend/src/pages/admin/Subscriptions.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { adminApi } from '../../services/adminApi';

interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: string;
  currentPeriodEnd: string;
  user: {
    email: string;
    companyName: string;
  };
  plan: {
    displayName: string;
    price: number;
  };
}

export const AdminSubscriptions: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      const response = await adminApi.get('/admin/subscriptions');
      setSubscriptions(response.data.data || []);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Chargement...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Suscripciones de Usuarios</h1>
      
      <div className="bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Usuario
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Plan
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Prix
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Statut
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Fin période
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {subscriptions.map((sub) => (
              <tr key={sub.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {sub.user.companyName}
                  </div>
                  <div className="text-sm text-gray-500">{sub.user.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {sub.plan.displayName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {sub.plan.price} CHF
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    sub.status === 'active' ? 'bg-green-100 text-green-800' : 
                    sub.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {sub.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(sub.currentPeriodEnd).toLocaleDateString('fr-FR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
```

---

## 🔍 Verificar Cambios

### 1. Verificar que el Backend Funciona

```bash
# Planes públicos (sin auth)
curl https://test.simplifaq.ch/api/plans

# Planes admin (con auth)
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  https://test.simplifaq.ch/api/admin/plans

# Suscripciones admin (con auth)
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  https://test.simplifaq.ch/api/admin/subscriptions
```

### 2. Ver en el Frontend

1. Ir a: `https://test.simplifaq.ch/admin/login`
2. Iniciar sesión como admin
3. Ir a: `https://test.simplifaq.ch/admin/plans`
4. Ir a: `https://test.simplifaq.ch/admin/subscriptions`

---

## 📊 Datos Actuales en DB

### Planes Creados
- **Beta** (Plan Pionnier) - 0 CHF - Acceso completo
- **Free** (Plan Gratuit) - 0 CHF - 10 facturas/mes, 5 clientes
- **Basic** (Plan Basique) - 29 CHF/mes - 100 facturas/mes, 50 clientes
- **Premium** (Plan Premium) - 79 CHF/mes - Ilimitado

### Verificar en DB
```sql
-- Ver planes
SELECT id, name, "displayName", price, "isActive" 
FROM plans 
ORDER BY price;

-- Ver suscripciones
SELECT s.id, u.email, p."displayName", s.status 
FROM subscriptions s
JOIN users u ON s.user_id = u.id
JOIN plans p ON s.plan_id = p.id;

-- Ver usuarios con su plan
SELECT 
  u.email, 
  u."companyName",
  u."subscriptionPlan",
  p."displayName" as plan_name,
  s.status as subscription_status
FROM users u
LEFT JOIN subscriptions s ON s.user_id = u.id
LEFT JOIN plans p ON s.plan_id = p.id
LIMIT 20;
```

---

## 🚀 Próximos Pasos

1. **Frontend Admin** (1-2 horas):
   - Agregar vista de Planes
   - Agregar vista de Suscripciones
   - Agregar links en sidebar

2. **Página Pública de Pricing** (2-3 horas):
   - Crear `/pricing` con los 4 planes
   - Botón "Choisir ce plan" que llama a `/api/subscriptions/checkout`
   - Redirige a Stripe para pagar

3. **Widget de Suscripción en Dashboard** (1 hora):
   - Mostrar plan actual del usuario
   - Mostrar uso (facturas, clientes, productos)
   - Botón "Upgrade" o "Gérer mon abonnement"

4. **Configurar Stripe** (15 min):
   - Crear productos en Stripe Dashboard
   - Actualizar Price IDs en DB
   - Configurar webhook

---

## 💡 Resumen

### ✅ Lo que YA funciona:
- Backend completo con todos los endpoints
- Base de datos con 4 planes
- Endpoint público `/api/plans` funcionando
- Endpoints admin `/api/admin/plans` y `/api/admin/subscriptions`
- Webhook de Stripe implementado

### ⏳ Lo que falta (Frontend):
- Vista de Planes en admin
- Vista de Suscripciones en admin
- Página pública de Pricing
- Widget de suscripción en dashboard

### 🎯 Para ver cambios AHORA:
Puedes probar los endpoints directamente:
```bash
# Ver planes
curl https://test.simplifaq.ch/api/plans

# O en el navegador:
https://test.simplifaq.ch/api/plans
```

El backend está 100% funcional, solo falta crear las vistas en React para visualizarlo en el admin.
