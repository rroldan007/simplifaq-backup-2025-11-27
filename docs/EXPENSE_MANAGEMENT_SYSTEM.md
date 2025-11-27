# 💰 Sistema de Gestión de Gastos Empresariales

## 📋 Visión General

El sistema de gestión de gastos permite a las empresas registrar y categorizar sus gastos para calcular el balance real (ingresos - gastos) y generar reportes fiscales completos para Suiza.

## 🎯 Niveles de Suscripción

### 📦 Plan Básico (Gratuito)
- ❌ Sin gestión de gastos
- ✅ Solo facturas emitidas
- ✅ Reporte TVA básico (solo ingresos)

### 💼 Plan Profesional
- ✅ Hasta 500 gastos/mes
- ✅ Categorías básicas de gastos
- ✅ Balance mensual/trimestral
- ✅ Reporte TVA completo (ingresos + gastos)
- ✅ Exportación a Excel

### 🏢 Plan Empresa
- ✅ Gastos ilimitados
- ✅ Categorías personalizadas
- ✅ Múltiples centros de costo
- ✅ Balance anual completo (Bilan)
- ✅ Integración contable
- ✅ Reportes avanzados
- ✅ Aprobación de gastos por flujo

## 📊 Estructura de Datos

### Modelo de Gasto (Expense)

```typescript
interface Expense {
  id: string;
  userId: string;
  
  // Información básica
  description: string;
  amount: number;
  currency: 'CHF' | 'EUR';
  date: Date;
  
  // Categorización
  category: ExpenseCategory;
  subcategory?: string;
  costCenter?: string; // Solo Plan Empresa
  
  // TVA
  tvaCategory: SwissTVACategory;
  tvaAmount: number;
  tvaRecoverable: boolean; // ¿TVA recuperable?
  
  // Documentación
  receipt?: string; // URL del recibo
  invoiceNumber?: string;
  supplier?: string;
  
  // Aprobación (Plan Empresa)
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: Date;
  
  // Metadatos
  createdAt: Date;
  updatedAt: Date;
}
```

### Categorías de Gastos Suizos

```typescript
enum ExpenseCategory {
  // Gastos operacionales
  OFFICE_SUPPLIES = 'office_supplies',        // Fournitures de bureau
  RENT = 'rent',                             // Loyer
  UTILITIES = 'utilities',                   // Services publics
  INSURANCE = 'insurance',                   // Assurances
  
  // Gastos de personal
  SALARIES = 'salaries',                     // Salaires
  SOCIAL_CHARGES = 'social_charges',         // Charges sociales
  TRAINING = 'training',                     // Formation
  
  // Gastos de transporte
  FUEL = 'fuel',                            // Carburant
  PUBLIC_TRANSPORT = 'public_transport',     // Transports publics
  VEHICLE_MAINTENANCE = 'vehicle_maintenance', // Entretien véhicule
  
  // Gastos profesionales
  PROFESSIONAL_SERVICES = 'professional_services', // Services professionnels
  LEGAL_FEES = 'legal_fees',                // Frais juridiques
  ACCOUNTING = 'accounting',                // Comptabilité
  
  // Marketing y ventas
  MARKETING = 'marketing',                  // Marketing
  ADVERTISING = 'advertising',              // Publicité
  EVENTS = 'events',                       // Événements
  
  // Tecnología
  SOFTWARE = 'software',                    // Logiciels
  HARDWARE = 'hardware',                    // Matériel informatique
  TELECOMMUNICATIONS = 'telecommunications', // Télécommunications
  
  // Gastos financieros
  BANK_FEES = 'bank_fees',                 // Frais bancaires
  INTEREST = 'interest',                   // Intérêts
  
  // Otros
  MEALS = 'meals',                         // Repas
  ENTERTAINMENT = 'entertainment',          // Divertissement
  MISCELLANEOUS = 'miscellaneous'          // Divers
}
```

## 🔧 API Endpoints para Gastos

### Crear Gasto
```http
POST /api/expenses
Authorization: Bearer {token}
Content-Type: application/json

{
  "description": "Achat ordinateur portable",
  "amount": 1500.00,
  "currency": "CHF",
  "date": "2024-03-15T00:00:00.000Z",
  "category": "HARDWARE",
  "subcategory": "Ordinateurs",
  "supplier": "Digitec SA",
  "invoiceNumber": "DIG-2024-001",
  "tvaCategory": "STANDARD",
  "tvaRecoverable": true
}
```

### Listar Gastos
```http
GET /api/expenses?startDate=2024-01-01&endDate=2024-12-31&category=HARDWARE
Authorization: Bearer {token}
```

### Subir Recibo
```http
POST /api/expenses/{expenseId}/receipt
Authorization: Bearer {token}
Content-Type: multipart/form-data

receipt: [archivo PDF/imagen]
```

### Aprobar Gasto (Plan Empresa)
```http
PATCH /api/expenses/{expenseId}/approve
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "APPROVED",
  "notes": "Gasto aprobado para Q1 2024"
}
```

## 📈 Cálculo de Balance

### Balance Mensual
```typescript
interface MonthlyBalance {
  month: string; // "2024-03"
  
  // Ingresos
  totalInvoiced: number;      // Total facturado
  totalPaid: number;          // Total cobrado
  pendingPayments: number;    // Pendiente de cobro
  
  // Gastos
  totalExpenses: number;      // Total gastos
  approvedExpenses: number;   // Gastos aprobados
  pendingExpenses: number;    // Gastos pendientes
  
  // TVA
  tvaToCollect: number;       // TVA a cobrar (facturas)
  tvaToRecover: number;       // TVA a recuperar (gastos)
  tvaBalance: number;         // Balance TVA
  
  // Balance
  grossProfit: number;        // Beneficio bruto (ingresos - gastos)
  netProfit: number;          // Beneficio neto (después TVA)
  
  // Por categoría
  expensesByCategory: {
    [category: string]: number;
  };
}
```

### Balance Anual (Bilan Suizo)
```typescript
interface SwissAnnualBalance {
  year: number;
  
  // ACTIVOS (Actif)
  assets: {
    currentAssets: {
      cash: number;                    // Liquidités
      accountsReceivable: number;      // Créances
      inventory: number;               // Stocks
      prepaidExpenses: number;         // Charges payées d'avance
    };
    fixedAssets: {
      equipment: number;               // Équipements
      furniture: number;               // Mobilier
      intangibleAssets: number;        // Actifs incorporels
      depreciation: number;            // Amortissements
    };
    totalAssets: number;
  };
  
  // PASIVOS (Passif)
  liabilities: {
    currentLiabilities: {
      accountsPayable: number;         // Dettes fournisseurs
      tvaPayable: number;              // TVA à payer
      socialCharges: number;           // Charges sociales
      shortTermDebt: number;           // Dettes à court terme
    };
    longTermLiabilities: {
      longTermDebt: number;            // Dettes à long terme
      provisions: number;              // Provisions
    };
    equity: {
      capital: number;                 // Capital
      retainedEarnings: number;        // Bénéfices reportés
      currentYearProfit: number;       // Bénéfice de l'exercice
    };
    totalLiabilities: number;
  };
  
  // CUENTA DE RESULTADOS (Compte de résultat)
  incomeStatement: {
    revenue: number;                   // Chiffre d'affaires
    operatingExpenses: number;         // Charges d'exploitation
    operatingProfit: number;           // Bénéfice d'exploitation
    financialResult: number;           // Résultat financier
    extraordinaryResult: number;       // Résultat extraordinaire
    netProfit: number;                 // Bénéfice net
  };
}
```

## 🤖 Integración con Agente IA

### Ejemplos de Conversación

#### Registrar Gasto
```
Usuario: "Registra un gasto de 150 CHF por combustible del 15 de marzo"

Agente:
1. Verifica límites de suscripción
2. Crea gasto con categoría FUEL
3. Pregunta por recibo si es necesario
4. Calcula TVA recuperable

Respuesta: "✅ Gasto registrado:
- Combustible: 150.00 CHF
- TVA recuperable (8.1%): 12.15 CHF
- Fecha: 15.03.2024
¿Tienes el recibo para subir?"
```

#### Consultar Balance
```
Usuario: "¿Cuál es mi balance de marzo?"

Agente:
1. Calcula ingresos del mes
2. Suma gastos aprobados
3. Calcula balance TVA
4. Presenta resumen

Respuesta: "📊 Balance Marzo 2024:
💰 Ingresos: 15'000.00 CHF
💸 Gastos: 8'500.00 CHF
📈 Beneficio bruto: 6'500.00 CHF
🏛️ TVA neta a pagar: 245.50 CHF
💵 Beneficio neto: 6'254.50 CHF"
```

#### Preparar Bilan Anual
```
Usuario: "Prepara el bilan anual 2024"

Agente (Solo Plan Empresa):
1. Recopila todos los datos del año
2. Calcula activos y pasivos
3. Genera cuenta de resultados
4. Prepara documentos para contable

Respuesta: "📋 Bilan 2024 preparado:
- Total activos: 125'000 CHF
- Beneficio del ejercicio: 45'000 CHF
- Documentos listos para tu contable
¿Quieres exportar a Excel?"
```

## 📊 Reportes de Gastos

### Reporte TVA Completo
```http
GET /api/reports/tva-complete?year=2024&quarter=1
Authorization: Bearer {token}

Response:
{
  "period": "Q1 2024",
  "revenue": {
    "totalNet": 45000.00,
    "tvaCollected": 3465.00,
    "totalGross": 48465.00
  },
  "expenses": {
    "totalNet": 18000.00,
    "tvaRecoverable": 1386.00,
    "totalGross": 19386.00
  },
  "tvaBalance": {
    "tvaToCollect": 3465.00,
    "tvaToRecover": 1386.00,
    "netTvaToPay": 2079.00
  },
  "netProfit": 27000.00
}
```

### Reporte por Categorías
```http
GET /api/reports/expenses-by-category?year=2024
Authorization: Bearer {token}

Response:
{
  "year": 2024,
  "totalExpenses": 85000.00,
  "categories": {
    "RENT": 24000.00,
    "SALARIES": 36000.00,
    "OFFICE_SUPPLIES": 3500.00,
    "FUEL": 4200.00,
    "SOFTWARE": 7800.00,
    "MARKETING": 9500.00
  }
}
```

## 🔒 Validaciones y Límites

### Por Plan de Suscripción
```typescript
const SUBSCRIPTION_LIMITS = {
  BASIC: {
    maxExpensesPerMonth: 0,
    categoriesAllowed: [],
    featuresEnabled: []
  },
  PROFESSIONAL: {
    maxExpensesPerMonth: 500,
    categoriesAllowed: Object.values(ExpenseCategory),
    featuresEnabled: ['balance_reports', 'tva_recovery', 'excel_export']
  },
  ENTERPRISE: {
    maxExpensesPerMonth: -1, // Unlimited
    categoriesAllowed: Object.values(ExpenseCategory),
    featuresEnabled: ['all_features', 'custom_categories', 'approval_workflow', 'cost_centers']
  }
};
```

### Validaciones Suizas
- ✅ Montos en CHF/EUR
- ✅ TVA según categorías suizas
- ✅ Formatos de fecha europeos
- ✅ Números de factura válidos
- ✅ Categorías fiscales correctas

## 🎯 Beneficios del Sistema

### Para el Usuario
1. **Balance Real**: Ingresos - Gastos = Beneficio real
2. **Control TVA**: Optimización de TVA recuperable
3. **Reportes Fiscales**: Listos para declaraciones
4. **Ahorro Tiempo**: Automatización de cálculos

### Para el Negocio
1. **Planes Diferenciados**: Monetización por funcionalidades
2. **Retención**: Usuarios necesitan el sistema completo
3. **Upselling**: Migración natural a planes superiores
4. **Compliance**: Cumplimiento fiscal suizo

## 🚀 Implementación Sugerida

### Fase 1: Estructura Base
- Modelos de datos
- API básica de gastos
- Validaciones de suscripción

### Fase 2: Cálculos y Reportes
- Balance mensual/trimestral
- Reporte TVA completo
- Exportaciones

### Fase 3: Funciones Avanzadas
- Aprobación de gastos
- Centros de costo
- Bilan anual suizo

¿Te parece bien esta estructura? ¿Quieres que implementemos alguna parte específica?