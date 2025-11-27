# 🚦 Guía de Rutas - SimpliFaq

## ⚠️ IMPORTANTE: Archivo de Rutas Principal

**El archivo principal de rutas es `frontend/src/router/index.tsx`, NO `App.tsx`**

### 📁 Estructura del Proyecto

```
frontend/src/
├── main.tsx                    # Punto de entrada - importa AppRouter
├── router/
│   └── index.tsx              # ✅ ARCHIVO PRINCIPAL DE RUTAS
├── App.tsx                     # ❌ NO se usa actualmente
└── pages/
    ├── QuotesPage.tsx
    ├── NewQuotePage.tsx
    └── QuoteDetailPage.tsx
```

### 🔧 Cómo Agregar Nuevas Rutas

#### 1. Importar los componentes en `router/index.tsx`

```typescript
// Líneas 17-59 aproximadamente
import { QuotesPage } from '../pages/QuotesPage';
import NewQuotePage from '../pages/NewQuotePage';
import QuoteDetailPage from '../pages/QuoteDetailPage';
```

#### 2. Agregar las rutas dentro del bloque protegido

```typescript
// Dentro de <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
// Líneas 102-135 aproximadamente

<Route path="quotes" element={<QuotesPage />} />
<Route path="quotes/new" element={<NewQuotePage />} />
<Route path="quotes/:id" element={<QuoteDetailPage />} />
<Route path="quotes/:id/edit" element={<NewQuotePage />} />
```

### 📋 Ejemplo Completo - Rutas de Quotes

```typescript
// frontend/src/router/index.tsx

// 1. Importaciones (líneas 33-35)
import { QuotesPage } from '../pages/QuotesPage';
import NewQuotePage from '../pages/NewQuotePage';
import QuoteDetailPage from '../pages/QuoteDetailPage';

// 2. Dentro del componente AppRouter, en las rutas protegidas
export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AdminAuthProvider>
          <Routes>
            {/* ... otras rutas ... */}
            
            {/* Protected Routes */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute redirectTo="/login">
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="invoices" element={<InvoicesPage />} />
              
              {/* Rutas de Quotes */}
              <Route path="quotes" element={<QuotesPage />} />
              <Route path="quotes/new" element={<NewQuotePage />} />
              <Route path="quotes/:id" element={<QuoteDetailPage />} />
              <Route path="quotes/:id/edit" element={<NewQuotePage />} />
              
              <Route path="clients" element={<ClientsPage />} />
              {/* ... más rutas ... */}
            </Route>
          </Routes>
        </AdminAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};
```

### 🐛 Debugging

#### Si las rutas no funcionan:

1. **Verificar el archivo correcto:**
   ```bash
   # Buscar qué archivo se está usando
   grep -r "AppRouter" frontend/src/main.tsx
   ```
   Debe mostrar: `import { AppRouter } from './router/index'`

2. **Buscar todos los archivos con rutas:**
   ```bash
   grep -r "<Routes>" frontend/src/
   ```

3. **Verificar que el Layout renderiza las rutas hijas:**
   El componente `Layout.tsx` debe tener `<Outlet />` para renderizar las rutas anidadas.

4. **Verificar la consola del navegador:**
   - Buscar mensajes de `[ProtectedRoute]` para ver el estado de autenticación
   - Verificar errores de importación o compilación

### 📝 Archivos Importantes

| Archivo | Uso | Estado |
|---------|-----|--------|
| `frontend/src/router/index.tsx` | **Archivo principal de rutas** | ✅ USAR ESTE |
| `frontend/src/main.tsx` | Punto de entrada, importa AppRouter | ✅ Activo |
| `frontend/src/App.tsx` | Archivo legacy | ❌ NO se usa |
| `frontend/src/components/Layout.tsx` | Contiene `<Outlet />` para rutas hijas | ✅ Activo |

### 🎯 Tipos de Rutas

#### Rutas Públicas (no requieren autenticación)
```typescript
<Route path="/login" element={<LoginPage />} />
<Route path="/register" element={<RegisterPage />} />
```

#### Rutas Protegidas (requieren autenticación)
```typescript
<Route 
  path="/" 
  element={<ProtectedRoute><Layout /></ProtectedRoute>}
>
  <Route path="dashboard" element={<DashboardPage />} />
  {/* Rutas anidadas aquí */}
</Route>
```

#### Rutas de Admin
```typescript
<Route path="/admin/login" element={<AdminLoginPage />} />
<Route path="/admin" element={<ProtectedAdminRoute><AdminLayout /></ProtectedAdminRoute>}>
  <Route path="dashboard" element={<AdminDashboard />} />
  {/* Rutas de admin aquí */}
</Route>
```

### ✅ Checklist para Nuevas Rutas

- [ ] Importar componentes en `router/index.tsx`
- [ ] Agregar rutas en el bloque correcto (público/protegido/admin)
- [ ] Actualizar navegación en `Layout.tsx` si es necesario
- [ ] Verificar que el componente tenga `import React from 'react'`
- [ ] Probar la ruta en el navegador
- [ ] Verificar logs de `[ProtectedRoute]` en consola

---

## 🔍 Problema Resuelto: 404 en /quotes

**Fecha:** 23 de octubre de 2025

**Problema:** La ruta `/quotes` mostraba 404 a pesar de estar definida en `App.tsx`

**Causa:** El proyecto usa `router/index.tsx` como archivo principal de rutas, no `App.tsx`

**Solución:** Agregar las rutas en `router/index.tsx` en lugar de `App.tsx`

**Lección:** Siempre verificar `main.tsx` para identificar qué archivo de rutas se está usando en el proyecto.
