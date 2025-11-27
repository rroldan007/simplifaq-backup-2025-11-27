# 🤖 Guía de API para Agente IA - Sistema de Facturación Suizo

## 📋 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Autenticación](#autenticación)
3. [Flujos de Procesos](#flujos-de-procesos)
4. [Endpoints por Entidad](#endpoints-por-entidad)
5. [Validaciones Suizas](#validaciones-suizas)
6. [Ejemplos de Conversaciones](#ejemplos-de-conversaciones)
7. [Manejo de Errores](#manejo-de-errores)

## 🌟 Visión General

Este sistema permite a un agente IA ayudar a usuarios a gestionar facturas suizas de manera conversacional. El agente puede:

- ✅ Crear, modificar y eliminar clientes
- ✅ Gestionar productos/servicios
- ✅ Crear y gestionar facturas con QR Bill suizo
- ✅ Enviar facturas por email
- ✅ Generar reportes TVA
- ✅ Validar datos según estándares suizos

## 🔐 Autenticación

**Todas las peticiones requieren autenticación JWT:**
```
Authorization: Bearer {JWT_TOKEN}
```

El `userId` se extrae automáticamente del token JWT. **NUNCA** pidas al usuario su `userId` - se obtiene del token.

## 🔄 Flujos de Procesos

### 1. Flujo de Creación de Factura

```mermaid
graph TD
    A[Usuario: "Crear factura para Maria"] --> B[Buscar cliente "Maria"]
    B --> C{¿Cliente existe?}
    C -->|No| D[Crear cliente Maria]
    C -->|Sí| E[Usar cliente existente]
    D --> F[Pedir datos del cliente]
    F --> G[Crear cliente]
    G --> E
    E --> H[Crear factura]
    H --> I[Agregar items]
    I --> J[Calcular TVA]
    J --> K[Generar QR Bill]
    K --> L[Factura creada]
```

### 2. Flujo de Gestión de Cliente

```mermaid
graph TD
    A[Usuario: "Agregar cliente"] --> B[Validar datos suizos]
    B --> C[Crear cliente]
    C --> D[Cliente creado]
    
    E[Usuario: "Modificar cliente"] --> F[Buscar cliente]
    F --> G[Actualizar datos]
    G --> H[Cliente actualizado]
```

## 📡 Endpoints por Entidad

### 👥 CLIENTES

#### Buscar Cliente
```http
GET /api/clients?search={nombre_o_email}
Authorization: Bearer {token}
```

**Uso del Agente:**
- Cuando el usuario mencione un nombre, busca primero si existe
- Ejemplo: "factura para Maria" → buscar "Maria" en clientes

#### Crear Cliente
```http
POST /api/clients
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Maria García SA",
  "email": "maria@example.com",
  "phone": "+41 21 123 45 67",
  "address": {
    "street": "Rue de la Paix 123",
    "city": "Lausanne",
    "postalCode": "1000",
    "country": "CH",
    "canton": "VD"
  },
  "tvaNumber": "CHE-123.456.789 TVA"
}
```

**Datos Requeridos para el Agente:**
- ✅ `name` (obligatorio)
- ✅ `email` (obligatorio, formato válido)
- ✅ `address.street` (obligatorio)
- ✅ `address.city` (obligatorio)
- ✅ `address.postalCode` (obligatorio, 4 dígitos suizos)
- ✅ `address.canton` (obligatorio, cantón suizo válido)
- ⚠️ `phone` (opcional, formato suizo: +41 XX XXX XX XX)
- ⚠️ `tvaNumber` (opcional, formato: CHE-XXX.XXX.XXX TVA/MWST/IVA)

**Validaciones Suizas:**
- Código postal: 4 dígitos (1000-9999)
- Cantones válidos: VD, GE, ZH, BE, TI, AG, BL, BS, FR, GL, GR, JU, LU, NE, NW, OW, SG, SH, SO, SZ, TG, UR, VS, ZG
- Teléfono: +41 seguido de código de área y número

#### Actualizar Cliente
```http
PUT /api/clients/{clientId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Maria García Updated SA",
  "email": "maria.updated@example.com"
}
```

#### Eliminar Cliente
```http
DELETE /api/clients/{clientId}
Authorization: Bearer {token}
```

### 🛍️ PRODUCTOS/SERVICIOS

#### Listar Productos
```http
GET /api/products
Authorization: Bearer {token}
```

#### Crear Producto
```http
POST /api/products
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Consultation IT",
  "description": "Service de consultation informatique",
  "price": 150.00,
  "currency": "CHF",
  "tvaCategory": "STANDARD"
}
```

**Categorías TVA Suizas:**
- `STANDARD`: 8.1% (servicios normales)
- `REDUCED`: 2.6% (productos básicos)
- `SPECIAL`: 3.8% (hoteles, etc.)
- `EXEMPT`: 0% (servicios exentos)

### 📄 FACTURAS

#### Crear Factura
```http
POST /api/invoices
Authorization: Bearer {token}
Content-Type: application/json

{
  "clientId": "uuid-del-cliente",
  "dueDate": "2024-12-31T00:00:00.000Z",
  "currency": "CHF",
  "items": [
    {
      "description": "Consultation IT",
      "quantity": 10,
      "unitPrice": 150.00,
      "tvaCategory": "STANDARD"
    }
  ],
  "notes": "Merci pour votre confiance"
}
```

**Cálculo Automático:**
- El sistema calcula automáticamente `amount`, `totalNet`, `totalTVA`, `totalGross`
- Genera número de factura automáticamente
- Estado inicial: `DRAFT`

#### Actualizar Factura
```http
PUT /api/invoices/{invoiceId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "items": [
    {
      "description": "Consultation IT Updated",
      "quantity": 15,
      "unitPrice": 150.00,
      "tvaCategory": "STANDARD"
    }
  ]
}
```

#### Cambiar Estado de Factura
```http
PATCH /api/invoices/{invoiceId}/status
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "SENT"
}
```

**Estados válidos:** `DRAFT`, `SENT`, `PAID`, `CANCELLED`

#### Generar QR Bill Suizo
```http
POST /api/invoices/{invoiceId}/qr-bill
Authorization: Bearer {token}
```

#### Generar PDF
```http
GET /api/invoices/{invoiceId}/pdf
Authorization: Bearer {token}
```

#### Enviar por Email
```http
POST /api/invoices/{invoiceId}/send-email
Authorization: Bearer {token}
Content-Type: application/json

{
  "to": "maria@example.com",
  "subject": "Votre facture INV-2024-001",
  "message": "Veuillez trouver ci-joint votre facture.",
  "includePDF": true,
  "language": "fr"
}
```

### 💸 GASTOS EMPRESARIALES

#### Crear Gasto
```http
POST /api/expenses
Authorization: Bearer {token}
Content-Type: application/json

{
  "description": "Combustible vehículo empresa",
  "amount": 150.00,
  "currency": "CHF",
  "date": "2024-03-15T00:00:00.000Z",
  "category": "FUEL",
  "supplier": "Shell Station",
  "tvaCategory": "STANDARD",
  "tvaRecoverable": true
}
```

**Categorías de Gastos Principales:**
- `OFFICE_SUPPLIES`: Fournitures de bureau
- `RENT`: Loyer
- `FUEL`: Carburant
- `SOFTWARE`: Logiciels
- `MARKETING`: Marketing
- `MEALS`: Repas d'affaires
- `PROFESSIONAL_SERVICES`: Services professionnels

#### Listar Gastos
```http
GET /api/expenses?startDate=2024-01-01&endDate=2024-12-31&category=FUEL
Authorization: Bearer {token}
```

#### Subir Recibo
```http
POST /api/expenses/{expenseId}/receipt
Authorization: Bearer {token}
Content-Type: multipart/form-data

receipt: [archivo PDF/imagen]
```

### 📊 REPORTES

#### Reporte TVA Completo (Ingresos + Gastos)
```http
GET /api/reports/tva-complete?startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer {token}
```

#### Balance Mensual
```http
GET /api/reports/balance?month=2024-03
Authorization: Bearer {token}
```

#### Reporte por Categorías de Gastos
```http
GET /api/reports/expenses-by-category?year=2024
Authorization: Bearer {token}
```

#### Bilan Anual Suizo (Solo Plan Empresa)
```http
GET /api/reports/annual-balance?year=2024
Authorization: Bearer {token}
```

## 🎯 Ejemplos de Conversaciones

### Ejemplo 1: Crear Factura para Cliente Nuevo

**Usuario:** "Crea una factura para Maria García por 1500 CHF de consultoría"

**Proceso del Agente:**

1. **Buscar cliente:**
```http
GET /api/clients?search=Maria García
```

2. **Si no existe, preguntar datos:**
```
Agente: "No encuentro a Maria García en tus clientes. Para crearla necesito:
- Email
- Dirección completa (calle, ciudad, código postal, cantón)
- ¿Teléfono? (opcional)
- ¿Número TVA? (opcional)"
```

3. **Crear cliente:**
```http
POST /api/clients
{
  "name": "Maria García",
  "email": "maria@example.com",
  "address": {
    "street": "Rue de la Paix 123",
    "city": "Lausanne", 
    "postalCode": "1000",
    "country": "CH",
    "canton": "VD"
  }
}
```

4. **Crear factura:**
```http
POST /api/invoices
{
  "clientId": "{id-de-maria}",
  "dueDate": "2024-12-31T00:00:00.000Z",
  "currency": "CHF",
  "items": [
    {
      "description": "Consultoría",
      "quantity": 1,
      "unitPrice": 1500.00,
      "tvaCategory": "STANDARD"
    }
  ]
}
```

5. **Respuesta:**
```
Agente: "✅ Factura creada para Maria García:
- Número: INV-2024-001
- Monto neto: 1'500.00 CHF
- TVA (8.1%): 121.50 CHF  
- Total: 1'615.50 CHF
- Estado: Borrador

¿Quieres enviarla por email o generar el PDF?"
```

### Ejemplo 2: Modificar Factura Existente

**Usuario:** "Cambia la factura INV-2024-001, agrega 2 horas más de consultoría a 150 CHF/hora"

**Proceso del Agente:**

1. **Buscar factura:**
```http
GET /api/invoices?search=INV-2024-001
```

2. **Obtener items actuales y agregar nuevos:**
```http
PUT /api/invoices/{invoiceId}
{
  "items": [
    {
      "description": "Consultoría inicial",
      "quantity": 1,
      "unitPrice": 1500.00,
      "tvaCategory": "STANDARD"
    },
    {
      "description": "Consultoría adicional",
      "quantity": 2,
      "unitPrice": 150.00,
      "tvaCategory": "STANDARD"
    }
  ]
}
```

3. **Respuesta:**
```
Agente: "✅ Factura INV-2024-001 actualizada:
- Nuevo monto neto: 1'800.00 CHF
- TVA (8.1%): 145.80 CHF
- Nuevo total: 1'938.60 CHF"
```

### Ejemplo 3: Enviar Factura

**Usuario:** "Envía la factura INV-2024-001 a Maria"

**Proceso del Agente:**

1. **Obtener datos del cliente de la factura:**
```http
GET /api/invoices/{invoiceId}
```

2. **Enviar email:**
```http
POST /api/invoices/{invoiceId}/send-email
{
  "to": "maria@example.com",
  "subject": "Votre facture INV-2024-001",
  "message": "Chère Maria,\n\nVeuillez trouver ci-joint votre facture.\n\nCordialement",
  "includePDF": true,
  "language": "fr"
}
```

3. **Cambiar estado:**
```http
PATCH /api/invoices/{invoiceId}/status
{
  "status": "SENT"
}
```

### Ejemplo 4: Registrar Gasto

**Usuario:** "Registra un gasto de 150 CHF por combustible del 15 de marzo"

**Proceso del Agente:**

1. **Verificar límites de suscripción:**
```http
GET /api/users/subscription-limits
```

2. **Crear gasto:**
```http
POST /api/expenses
{
  "description": "Combustible vehículo empresa",
  "amount": 150.00,
  "currency": "CHF",
  "date": "2024-03-15T00:00:00.000Z",
  "category": "FUEL",
  "tvaCategory": "STANDARD",
  "tvaRecoverable": true
}
```

3. **Respuesta:**
```
Agente: "✅ Gasto registrado:
- Combustible: 150.00 CHF
- TVA recuperable (8.1%): 12.15 CHF
- Fecha: 15.03.2024
- Categoría: Carburant

¿Tienes el recibo para subir? Esto te ayudará con la declaración TVA."
```

### Ejemplo 5: Consultar Balance

**Usuario:** "¿Cuál es mi balance de marzo?"

**Proceso del Agente:**

1. **Obtener balance mensual:**
```http
GET /api/reports/balance?month=2024-03
```

2. **Respuesta formateada:**
```
Agente: "📊 Balance Marzo 2024:

💰 INGRESOS:
- Facturas emitidas: 15'000.00 CHF
- Facturas cobradas: 12'500.00 CHF
- Pendiente de cobro: 2'500.00 CHF

💸 GASTOS:
- Total gastos: 8'500.00 CHF
- TVA recuperable: 654.50 CHF

📈 RESULTADO:
- Beneficio bruto: 6'500.00 CHF
- TVA neta a pagar: 245.50 CHF
- Beneficio neto: 6'254.50 CHF

📋 Gastos por categoría:
- Loyer: 2'000.00 CHF
- Carburant: 450.00 CHF
- Logiciels: 300.00 CHF
- Marketing: 750.00 CHF"
```

### Ejemplo 6: Reporte TVA Completo

**Usuario:** "Muéstrame el reporte TVA completo del último trimestre"

**Proceso del Agente:**

1. **Calcular fechas del trimestre:**
```javascript
const now = new Date();
const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
const quarterEnd = new Date(quarterStart.getFullYear(), quarterStart.getMonth() + 3, 0);
```

2. **Obtener reporte completo:**
```http
GET /api/reports/tva-complete?startDate=2024-10-01&endDate=2024-12-31
```

3. **Respuesta formateada:**
```
Agente: "📊 Reporte TVA Completo Q4 2024:

💰 INGRESOS (TVA a cobrar):
- Monto neto: 45'000.00 CHF
- TVA cobrada: 3'465.00 CHF
- Total bruto: 48'465.00 CHF

💸 GASTOS (TVA recuperable):
- Monto neto: 18'000.00 CHF
- TVA recuperable: 1'386.00 CHF
- Total bruto: 19'386.00 CHF

🏛️ BALANCE TVA:
- TVA a cobrar: 3'465.00 CHF
- TVA a recuperar: 1'386.00 CHF
- TVA neta a pagar: 2'079.00 CHF

💵 BENEFICIO NETO: 27'000.00 CHF

¿Quieres que exporte este reporte para tu contable?"
```

### Ejemplo 7: Preparar Bilan Anual (Solo Plan Empresa)

**Usuario:** "Prepara el bilan anual 2024"

**Proceso del Agente:**

1. **Verificar suscripción:**
```http
GET /api/users/subscription
```

2. **Generar bilan anual:**
```http
GET /api/reports/annual-balance?year=2024
```

3. **Respuesta:**
```
Agente: "📋 Bilan Anual 2024 (Plan Empresa):

🏢 ACTIVOS (Actif):
- Liquidités: 45'000 CHF
- Créances clients: 12'000 CHF
- Équipements: 25'000 CHF
- Total actifs: 82'000 CHF

💼 PASIVOS (Passif):
- Dettes fournisseurs: 8'000 CHF
- TVA à payer: 2'500 CHF
- Capital: 50'000 CHF
- Bénéfices reportés: 21'500 CHF
- Total passifs: 82'000 CHF

📈 COMPTE DE RÉSULTAT:
- Chiffre d'affaires: 180'000 CHF
- Charges d'exploitation: 135'000 CHF
- Bénéfice net: 45'000 CHF

✅ Documentos preparados para tu expert-comptable.
¿Quieres exportar a Excel o PDF?"
```

## ⚠️ Validaciones Suizas Importantes

### Códigos Postales Suizos
```javascript
// Válidos: 1000-9999 (4 dígitos)
const validPostalCodes = ["1000", "8001", "3000", "1234"];
const invalidPostalCodes = ["100", "12345", "ABCD"];
```

### Cantones Suizos
```javascript
const validCantons = [
  "AG", "AI", "AR", "BE", "BL", "BS", "FR", "GE", "GL", "GR",
  "JU", "LU", "NE", "NW", "OW", "SG", "SH", "SO", "SZ", "TG",
  "TI", "UR", "VD", "VS", "ZG", "ZH"
];
```

### IBAN Suizo
```javascript
// Formato: CH + 2 dígitos de control + 17 dígitos
// Ejemplo: CH93 0076 2011 6238 5295 7
const validIBAN = "CH9300762011623852957";
```

### Número TVA Suizo
```javascript
// Formato: CHE-XXX.XXX.XXX TVA/MWST/IVA
const validTVA = [
  "CHE-123.456.789 TVA",  // Francés
  "CHE-123.456.789 MWST", // Alemán
  "CHE-123.456.789 IVA"   // Italiano
];
```

### Teléfonos Suizos
```javascript
// Formato: +41 XX XXX XX XX
const validPhones = [
  "+41 21 123 45 67", // Lausanne
  "+41 22 987 65 43", // Ginebra
  "+41 44 123 45 67"  // Zurich
];
```

## 🚨 Manejo de Errores

### Errores Comunes y Respuestas

#### Cliente no encontrado
```json
{
  "error": "Client not found",
  "code": 404
}
```
**Respuesta del Agente:** "No encuentro ese cliente. ¿Quieres que lo cree? Necesitaré algunos datos..."

#### Datos inválidos
```json
{
  "error": "Invalid Swiss postal code",
  "code": 400,
  "details": "Postal code must be 4 digits"
}
```
**Respuesta del Agente:** "El código postal debe tener 4 dígitos (ej: 1000). ¿Puedes corregirlo?"

#### Factura ya enviada
```json
{
  "error": "Cannot modify sent invoice",
  "code": 409
}
```
**Respuesta del Agente:** "Esta factura ya fue enviada y no se puede modificar. ¿Quieres crear una nota de crédito?"

## 🎯 Mejores Prácticas para el Agente

### 1. Siempre Buscar Primero
- Antes de crear, siempre busca si ya existe
- Usa búsqueda parcial para nombres similares

### 2. Validar Datos Suizos
- Verifica códigos postales, cantones, IBAN, TVA
- Sugiere correcciones cuando sea posible

### 3. Ser Proactivo
- Ofrece opciones relacionadas
- Sugiere próximos pasos lógicos

### 4. Formatear Respuestas
- Usa formato suizo para montos (1'234.56 CHF)
- Fechas en formato europeo (31.12.2024)
- Incluye emojis para mejor UX

### 5. Manejar Contexto
- Recuerda la conversación actual
- Mantén referencia a facturas/clientes mencionados

## 📝 Plantillas de Respuesta

### Confirmación de Creación
```
✅ {Entidad} creada exitosamente:
- ID: {id}
- Nombre: {name}
- [Detalles específicos]

¿Qué más puedo hacer por ti?
```

### Error de Validación
```
❌ Error en los datos:
- {campo}: {error_descripcion}

Por favor corrige: {sugerencia}
```

### Proceso Completado
```
🎉 ¡Listo! {Acción} completada:
- {Detalle1}
- {Detalle2}

Próximos pasos sugeridos:
1. {Sugerencia1}
2. {Sugerencia2}
```

---

## 🔗 Enlaces Útiles

- [Documentación API Completa](./API_DOCUMENTATION.md)
- [Estándares Suizos QR Bill](./SWISS_QR_BILL_STANDARDS.md)
- [Guía TVA Suiza](./SWISS_TVA_GUIDE.md)

---

**Nota:** Este agente debe ser empático, eficiente y siempre validar datos según estándares suizos. La experiencia del usuario debe ser fluida y conversacional.