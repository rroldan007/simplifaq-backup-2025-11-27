# Corrección de Status Enums

## Problema
Los controladores usan valores incorrectos para InvoiceStatus:
- ❌ 'paid' - No existe
- ❌ 'overdue' - No existe
- ❌ 'draft' - Debe ser 'DRAFT'
- ❌ 'sent' - Debe ser 'SENT'

## InvoiceStatus válidos (enum)
- ✅ DRAFT
- ✅ SENT  
- ✅ VOID

## PaymentStatus válidos (enum)
- ✅ UNPAID
- ✅ PARTIALLY_PAID
- ✅ PAID

## Cómo verificar si una factura está:

### Pagada
```typescript
invoice.paymentStatus === 'PAID'
```

### Vencida (overdue)
```typescript
invoice.status === 'SENT' && 
invoice.paymentStatus !== 'PAID' && 
invoice.dueDate < new Date()
```

### En borrador
```typescript
invoice.status === 'DRAFT'
```

### Enviada
```typescript
invoice.status === 'SENT'
```

## Cambios necesarios en controllers:

1. Reemplazar filtros `status: 'paid'` por `paymentStatus: 'PAID'`
2. Eliminar filtros `status: 'overdue'` y usar lógica de fecha
3. Cambiar 'draft' → 'DRAFT', 'sent' → 'SENT'
4. Eliminar referencias a campo `paidDate` (no existe, usar payments)
