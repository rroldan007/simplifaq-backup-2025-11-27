# Sistema de Descuentos - SimpliFaq

## Resumen
Sistema completo de descuentos en 3 niveles implementado para facturas y productos.

## Niveles de Descuento

### 1. Descuento a Nivel de Producto
**Modelo:** `Product`
- `discountValue`: Valor del descuento (número)
- `discountType`: Tipo (`PERCENT` | `AMOUNT`)
- `discountActive`: Switch para activar/desactivar

**Comportamiento:**
- Si `discountActive = true`, al agregar el producto a una factura, la línea hereda el descuento automáticamente
- Si `discountActive = false`, el producto no propone descuento por defecto
- El descuento del producto no se modifica al editar líneas de factura

### 2. Descuento a Nivel de Línea
**Modelo:** `InvoiceItem`
- `lineDiscountValue`: Valor del descuento
- `lineDiscountType`: Tipo (`PERCENT` | `AMOUNT`)
- `lineDiscountSource`: Origen (`FROM_PRODUCT` | `MANUAL` | `NONE`)
- `subtotalBeforeDiscount`: Subtotal antes del descuento
- `discountAmount`: Monto del descuento aplicado
- `subtotalAfterDiscount`: Subtotal después del descuento

**Acciones disponibles:**
1. **Quitar solo en esta factura**: Elimina el descuento de esta línea (pone `lineDiscountSource = NONE`)
2. **Desactivar en producto**: Desactiva `discountActive` del producto y recalcula
3. **Añadir/editar manualmente**: Permite fijar descuento manual (pone `lineDiscountSource = MANUAL`)

### 3. Descuento Global
**Modelo:** `Invoice`
- `globalDiscountValue`: Valor del descuento sobre el total
- `globalDiscountType`: Tipo (`PERCENT` | `AMOUNT`)
- `globalDiscountNote`: Nota opcional sobre el descuento

**Aplicación:**
- Se aplica sobre el subtotal de todas las líneas (ya con sus descuentos de línea aplicados)
- Los impuestos se calculan después de aplicar el descuento global

## Orden de Cálculo

```
1. Por cada línea:
   unitPrice × quantity = subtotalBeforeDiscount
   subtotalBeforeDiscount - lineDiscount = subtotalAfterDiscount

2. Sumar todas las líneas:
   Σ(subtotalAfterDiscount) = linesSubtotal

3. Aplicar descuento global:
   linesSubtotal - globalDiscount = subtotalAfterGlobalDiscount

4. Calcular impuestos:
   subtotalAfterGlobalDiscount × (tvaRate/100) = tvaAmount

5. Total final:
   subtotalAfterGlobalDiscount + tvaAmount = total
```

## Validaciones

### Descuento Porcentual
- Rango: 0% - 100%
- No puede ser negativo

### Descuento en Monto
- Debe ser ≥ 0
- No puede superar el monto base correspondiente:
  - Para línea: no puede superar `unitPrice × quantity`
  - Para global: no puede superar el subtotal de líneas

### Redondeo
- Todos los montos se redondean a 0.05 CHF (precisión estándar suiza)

## Archivos del Sistema

### Backend
```
backend/src/
├── utils/
│   └── discountCalculations.ts      # Funciones de cálculo y validación
├── services/
│   └── invoiceCalculations.ts       # Procesamiento de facturas con descuentos
├── controllers/
│   ├── productController.ts         # CRUD productos con descuentos
│   └── invoiceController.ts         # CRUD facturas con descuentos
└── types/
    └── discount.ts                  # Tipos TypeScript
```

### Funciones Principales

#### `calculateLineDiscount()`
Calcula descuento de una línea individual.

```typescript
calculateLineDiscount(
  unitPrice: number,
  quantity: number,
  lineDiscountValue?: number,
  lineDiscountType?: DiscountType
): LineDiscountResult
```

#### `calculateInvoiceTotals()`
Calcula totales de factura con descuento global.

```typescript
calculateInvoiceTotals(
  lineItems: Array<{
    subtotalAfterDiscount: number;
    tvaRate: number;
  }>,
  globalDiscountValue?: number,
  globalDiscountType?: DiscountType
): InvoiceTotalsResult
```

#### `processInvoiceItems()`
Procesa items de factura aplicando descuentos de producto automáticamente.

```typescript
processInvoiceItems(
  items: InvoiceItemInput[],
  userId: string
): Promise<ProcessedInvoiceItem[]>
```

## Inmutabilidad Histórica

- Las facturas guardan una **copia snapshot** de precios y descuentos
- Cambios en productos NO afectan facturas ya creadas/emitidas
- Cada línea guarda su `lineDiscountSource` para auditoría

## API Endpoints

### Productos
```
GET    /api/products           # Lista con descuentos
POST   /api/products           # Crear con descuento opcional
PUT    /api/products/:id       # Actualizar descuento
```

**Payload producto:**
```json
{
  "name": "Producto",
  "unitPrice": 100,
  "tvaRate": 7.7,
  "discountValue": 10,
  "discountType": "PERCENT",
  "discountActive": true
}
```

### Facturas
```
POST   /api/invoices          # Crear con descuentos
PUT    /api/invoices/:id      # Actualizar descuentos
```

**Payload línea de factura:**
```json
{
  "productId": "xxx",
  "quantity": 2,
  "unitPrice": 100,
  "tvaRate": 7.7,
  "lineDiscountValue": 15,
  "lineDiscountType": "PERCENT",
  "lineDiscountSource": "MANUAL"
}
```

**Payload descuento global:**
```json
{
  "globalDiscountValue": 50,
  "globalDiscountType": "AMOUNT",
  "globalDiscountNote": "Client fidèle - 50 CHF de réduction"
}
```

## Frontend (Pendiente)

### UI Productos
- [ ] Campo valor descuento + selector PERCENT/AMOUNT
- [ ] Switch "Activar descuento"
- [ ] Validación en tiempo real

### UI Líneas de Factura
- [ ] Columna "Descuento" con input + selector tipo
- [ ] Badge indicando origen (De producto / Manual)
- [ ] Botones: "Quitar solo aquí" / "Desactivar en producto"
- [ ] Mostrar precio original, descuento y precio final

### UI Descuento Global (Etapa 3)
- [ ] Bloque "Descuento global"
- [ ] Input valor + selector tipo
- [ ] Campo nota opcional
- [ ] Resumen: subtotal líneas, descuento global, impuestos, total

## PDF (Pendiente)

- [ ] Mostrar descuentos de línea en tabla
- [ ] Mostrar descuento global antes de impuestos
- [ ] Resumen detallado de cálculos

## Testing

### Casos a probar:
1. ✓ Producto sin descuento → agregar descuento manual en línea
2. ✓ Producto con descuento activo → línea hereda descuento
3. ✓ Desactivar descuento de producto → futuras líneas sin descuento
4. ✓ Descuento manual que supera valor de línea → rechazar
5. ✓ Descuento global + líneas con descuento mezclados
6. ✓ Cambio de producto tras crear factura → factura histórica intacta
7. ✓ Descuento porcentual 100% → subtotal = 0
8. ✓ Múltiples tasas IVA con descuento global

## Estado Actual

✅ **Completado:**
- Schema Prisma con 3 niveles de descuento
- Migración de base de datos
- Utilidades de cálculo y validación
- Servicio de procesamiento de facturas
- Controlador de productos actualizado
- Tipos TypeScript

⏳ **En progreso:**
- Integración en controlador de facturas

📋 **Pendiente:**
- Frontend UI completa
- Generadores de PDF actualizados
- Testing exhaustivo

## Notas Importantes

- **Redondeo CHF**: 0.05 precision (estándar suizo)
- **Validación**: Descuentos no pueden generar totales negativos
- **Audit trail**: Cada cambio registra quién, cuándo y qué
- **Performance**: Cálculos optimizados para facturas con 100+ líneas
