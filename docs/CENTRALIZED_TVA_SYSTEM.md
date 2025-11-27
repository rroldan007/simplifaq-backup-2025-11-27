# 🇨🇭 Sistema Centralizado de TVA - SimpliFaq

## Visión General

El nuevo sistema centralizado de TVA de SimpliFaq permite gestionar las tasas de TVA suizas de manera eficiente y flexible, soportando múltiples cantones y exenciones automáticas basadas en el volumen de facturación.

## 🎯 Problemas Resueltos

### Antes (Sistema Descentralizado)
- ❌ Tasas de TVA hardcodeadas en múltiples archivos
- ❌ Cambios requerían editar 15+ archivos manualmente
- ❌ No consideraba diferencias cantonales
- ❌ Sin exención automática para pequeñas empresas
- ❌ Difícil mantenimiento y propenso a errores

### Ahora (Sistema Centralizado)
- ✅ **Una sola fuente de verdad** para todas las tasas de TVA
- ✅ **Cambios centralizados** - actualizar una vez, aplicar en toda la app
- ✅ **Soporte multi-cantón** con configuraciones específicas
- ✅ **Exención automática** para empresas bajo el umbral (100,000 CHF/año)
- ✅ **Interface administrativa** para cambios en tiempo real
- ✅ **API RESTful** para gestión programática

## 🏗️ Arquitectura

### Backend

#### 1. Configuración Centralizada
```typescript
// backend/src/config/swissTaxConfig.ts
export const SWISS_CANTON_TVA_CONFIG: Record<string, CantonTVAConfig>
```

**Características:**
- Configuración por cantón (GE, ZH, VD, BE, etc.)
- Tasas actuales: 0%, 2.6%, 3.8%, 8.1%
- Umbrales de exención configurables
- Soporte multiidioma (FR/DE)

#### 2. Servicio de TVA
```typescript
// backend/src/services/tvaService.ts
export class TVAService
```

**Funcionalidades:**
- Cálculo automático de TVA
- Verificación de exenciones
- Resúmenes de facturación
- Reportes por período

#### 3. API Administrativa
```typescript
// backend/src/routes/admin/tva.ts
PUT /api/admin/tva/rates
PUT /api/admin/tva/exemption-threshold
GET /api/admin/tva/audit-log
```

### Frontend

#### 1. Hook Personalizado
```typescript
// frontend/src/hooks/useTVA.ts
export function useTVA(cantonCode: string)
```

**Características:**
- Cálculos automáticos de TVA
- Verificación de exenciones
- Tasas por cantón
- Integración con contexto de usuario

#### 2. Componente Administrativo
```typescript
// frontend/src/components/admin/TVAConfiguration.tsx
export const TVAConfiguration: React.FC
```

**Funcionalidades:**
- Interface visual para cambiar tasas
- Selector de cantón
- Validación en tiempo real
- Historial de cambios

#### 3. Formularios Inteligentes
```typescript
// frontend/src/components/invoices/InvoiceFormWithTVA.tsx
export const InvoiceFormWithTVA: React.FC
```

## 🚀 Uso del Sistema

### Para Desarrolladores

#### Cálculo Simple de TVA
```typescript
import { useTVA, SwissTVACategory } from '../hooks/useTVA';

const { calculateTVA } = useTVA('GE'); // Canton de Genève

const result = calculateTVA(1000, SwissTVACategory.STANDARD);
// result: { netAmount: 1000, tvaRate: 0.081, tvaAmount: 81, grossAmount: 1081 }
```

#### Cálculo de Factura Completa
```typescript
const { calculateInvoiceTVA } = useTVA('GE');

const items = [
  { description: 'Service', quantity: 1, unitPrice: 1000, tvaCategory: SwissTVACategory.STANDARD },
  { description: 'Produit', quantity: 2, unitPrice: 50, tvaCategory: SwissTVACategory.REDUCED }
];

const summary = calculateInvoiceTVA(items);
// Resumen completo con breakdown por categoría
```

#### Verificación de Exención
```typescript
const { isExemptFromTVA } = useTVA('GE');

// Empresa con 80,000 CHF de facturación anuelle
const isExempt = isExemptFromTVA; // true (bajo el umbral de 100,000 CHF)
```

### Para Administradores

#### Cambiar Tasas de TVA
1. Acceder al panel administrativo
2. Ir a "Configuration TVA"
3. Seleccionar cantón
4. Modificar tasas necesarias
5. Guardar cambios

Los cambios se aplican **inmediatamente** en toda la aplicación.

#### Configurar Umbrales de Exención
```typescript
PUT /api/admin/tva/exemption-threshold
{
  "cantonCode": "GE",
  "threshold": 100000
}
```

## 🌍 Soporte Multi-Cantón

### Cantones Soportados

| Cantón | Código | Tasas Actuales | Umbral Exención |
|--------|--------|----------------|-----------------|
| Genève | GE | 0%, 2.6%, 3.8%, 8.1% | 100,000 CHF |
| Zürich | ZH | 0%, 2.6%, 3.8%, 8.1% | 100,000 CHF |
| Vaud | VD | 0%, 2.6%, 3.8%, 8.1% | 100,000 CHF |
| Bern | BE | 0%, 2.6%, 3.8%, 8.1% | 100,000 CHF |

### Agregar Nuevo Cantón
```typescript
// backend/src/config/swissTaxConfig.ts
SWISS_CANTON_TVA_CONFIG['TI'] = {
  canton: 'Ticino',
  cantonCode: 'TI',
  name: 'Ticino',
  rates: {
    // Configuración específica del cantón
  },
  exemptionThreshold: 100000
};
```

## 💡 Exención Automática

### Reglas de Exención

1. **Umbral de Facturación**: Empresas con facturación anual < 100,000 CHF
2. **Aplicación Automática**: El sistema detecta automáticamente si aplica
3. **Mensaje Informativo**: Se muestra la razón de la exención
4. **Configuración por Cantón**: Cada cantón puede tener umbrales diferentes

### Ejemplo de Exención
```typescript
// Empresa con 80,000 CHF de facturación anual
const calculation = calculateTVA(1000, SwissTVACategory.STANDARD, 'GE', 80000);

// Resultado:
{
  netAmount: 1000,
  tvaRate: 0,
  tvaAmount: 0,
  grossAmount: 1000,
  isExempt: true,
  exemptionReason: "Chiffre d'affaires annuel (80,000 CHF) inférieur au seuil d'exonération (100,000 CHF)"
}
```

## 🔧 Configuración de Desarrollo

### Variables de Entorno
```bash
# backend/.env
SWISS_TVA_RATES_STANDARD=0.081
SWISS_TVA_RATES_REDUCED=0.026
SWISS_TVA_RATES_SPECIAL=0.038
DEFAULT_CANTON=GE
```

### Tests
```bash
# Ejecutar tests de TVA
npm run test:tva

# Tests específicos por cantón
npm run test:tva:canton GE
```

## 📊 Reportes y Analytics

### Reporte de TVA por Período
```typescript
const tvaService = new TVAService('GE', annualRevenue);
const report = tvaService.generateTVAReport(invoices);

// Incluye:
// - Total neto, TVA y bruto
// - Breakdown por categoría de TVA
// - Número de facturas exentas
// - Período del reporte
```

### Audit Trail
- Todos los cambios de tasas se registran
- Incluye: quién, cuándo, qué cambió
- Accesible vía API: `GET /api/admin/tva/audit-log`

## 🚀 Beneficios del Sistema

### Para Desarrolladores
- **Menos código**: Un hook vs múltiples archivos
- **Menos errores**: Validación centralizada
- **Más flexible**: Fácil agregar nuevos cantones
- **Mejor testing**: Tests centralizados

### Para Administradores
- **Cambios instantáneos**: Sin necesidad de deployment
- **Interface visual**: No necesita conocimientos técnicos
- **Audit completo**: Historial de todos los cambios
- **Multi-cantón**: Gestión desde una sola interface

### Para Usuarios Finales
- **Cálculos precisos**: Siempre las tasas correctas
- **Exención automática**: No necesita configurar manualmente
- **Transparencia**: Explicación clara de cálculos
- **Cumplimiento**: Siempre conforme a regulaciones

## 🔮 Futuras Mejoras

1. **Integración con API oficial suiza** para tasas automáticas
2. **Notificaciones** cuando cambien las tasas oficiales
3. **Más cantones** según demanda
4. **Tasas históricas** para reportes retroactivos
5. **Integración con contabilidad** externa

---

**¡El sistema centralizado de TVA hace que SimpliFaq sea más robusto, flexible y fácil de mantener!** 🇨🇭✨