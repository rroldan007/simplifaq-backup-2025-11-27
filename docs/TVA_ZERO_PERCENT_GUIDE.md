# 🇨🇭 Guía de TVA 0% - SimpliFaq

## ✅ **Respuesta: Sí, los usuarios pueden poner 0% TVA**

Hemos actualizado el sistema SimpliFaq para manejar correctamente **todas las categorías legales de 0% TVA** en Suiza, diferenciando claramente entre los diferentes casos de uso.

## 🎯 **Dos Tipos de 0% TVA Disponibles**

### 1. **Exonéré (0% - Exonerado)**
- **Uso**: Services exonérés par la loi suisse
- **Ejemplos**: 
  - Services médicaux et dentaires
  - Services d'éducation et formation
  - Assurances et services bancaires de base
  - Services postaux de base
- **Implicación fiscal**: No se factura TVA y **no se puede deducir** la TVA de compras relacionadas

### 2. **Non Assujetti (0% - No Sujeto)**
- **Uso**: Prestations non assujetties à la TVA suisse
- **Ejemplos**:
  - Exportaciones fuera de Suiza
  - Services internationaux
  - Prestations à l'étranger
  - Ventes hors territoire suisse
- **Implicación fiscal**: No se factura TVA pero **sí se puede deducir** la TVA de compras relacionadas

## 🔧 **Implementación Técnica**

### Backend - Nuevas Categorías
```typescript
export enum SwissTVACategory {
  EXEMPT = 'EXEMPT',           // 0% - Services exonérés par la loi
  NOT_SUBJECT = 'NOT_SUBJECT', // 0% - Prestations non assujetties
  REDUCED = 'REDUCED',         // 2.6% - Taux réduit
  SPECIAL = 'SPECIAL',         // 3.8% - Taux spécial hébergement
  STANDARD = 'STANDARD'        // 8.1% - Taux normal
}
```

### Frontend - Selector Inteligente
Los usuarios ahora ven en los dropdowns:
- ✅ **0% (Exonéré)** - Services exonérés par la loi
- ✅ **0% (Non assujetti)** - Prestations non assujetties
- ✅ **2.6% (Taux réduit)** - Biens de première nécessité
- ✅ **3.8% (Taux réduit spécial)** - Hébergement
- ✅ **8.1% (Taux normal)** - Services standard

## 🎨 **Interface Usuario**

### Modal Explicativo
Hemos creado un modal (`TVAExplanationModal`) que explica:
- **Cuándo usar cada categoría**
- **Ejemplos específicos** para cada tasa
- **Diferencias legales** entre "Exonéré" y "Non Assujetti"
- **Implicaciones fiscales** de cada elección

### Colores Distintivos
- 🔵 **8.1% Normal**: Azul
- 🟢 **2.6% Réduit**: Verde  
- 🟡 **3.8% Spécial**: Amarillo
- ⚫ **0% Exonéré**: Gris
- 🟣 **0% Non Assujetti**: Púrpura

## 🚀 **Casos de Uso Prácticos**

### Empresa de Consultoría IT
```typescript
// Servicio local en Suiza
{ tvaCategory: SwissTVACategory.STANDARD } // 8.1%

// Servicio para cliente en Francia
{ tvaCategory: SwissTVACategory.NOT_SUBJECT } // 0% Non assujetti
```

### Médico/Dentista
```typescript
// Consulta médica
{ tvaCategory: SwissTVACategory.EXEMPT } // 0% Exonéré
```

### Restaurante
```typescript
// Servicio de restauración
{ tvaCategory: SwissTVACategory.SPECIAL } // 3.8%
```

### Librería
```typescript
// Venta de libros
{ tvaCategory: SwissTVACategory.REDUCED } // 2.6%
```

## 🛡️ **Validaciones y Seguridad**

### Backend Validation
```typescript
tvaCategory: body('tvaCategory')
  .isIn(['EXEMPT', 'NOT_SUBJECT', 'REDUCED', 'SPECIAL', 'STANDARD'])
  .withMessage('Catégorie TVA suisse invalide')
```

### Frontend Guidance
- **Modal explicativo** con ejemplos específicos
- **Tooltips informativos** en cada opción
- **Advertencias legales** sobre el uso correcto
- **Validación en tiempo real**

## 🎯 **Exención Automática**

### Para Pequeñas Empresas
Si el chiffre d'affaires anual < 100,000 CHF:
- ✅ **Exención automática** aplicada
- ✅ **Mensaje explicativo** al usuario
- ✅ **0% TVA** en todas las facturas
- ✅ **Razón clara** mostrada en la factura

```typescript
// Ejemplo de exención automática
{
  isExempt: true,
  exemptionReason: "Chiffre d'affaires annuel (80,000 CHF) inférieur au seuil d'exonération (100,000 CHF)"
}
```

## 📋 **Compliance Legal**

### Advertencia Legal Incluida
> "Esta información es proporcionada a título indicativo. Para preguntas específicas sobre la aplicación de TVA a sus prestaciones, consulte un experto contable o la Administración Federal de Contribuciones (AFC)."

### Audit Trail
- ✅ Registro de todas las selecciones de TVA
- ✅ Justificación de cada categoría elegida
- ✅ Historial de cambios por usuario
- ✅ Reportes de cumplimiento

## 🔄 **Migración de Datos Existentes**

### Actualización Automática
Los datos existentes se migran automáticamente:
- **Tasa 0%** → Se mantiene como `EXEMPT` por defecto
- **Usuarios pueden reclasificar** según corresponda
- **Sin pérdida de datos** históricos

## 🎉 **Beneficios del Sistema Actualizado**

### Para Usuarios
- ✅ **Claridad legal** sobre cuándo usar 0% TVA
- ✅ **Ejemplos específicos** para cada categoría
- ✅ **Validación automática** de selecciones
- ✅ **Cumplimiento garantizado** con ley suiza

### Para Administradores
- ✅ **Control granular** sobre categorías TVA
- ✅ **Configuración por cantón** si es necesario
- ✅ **Reportes detallados** por tipo de TVA
- ✅ **Audit completo** de todas las transacciones

### Para Desarrolladores
- ✅ **API consistente** para todas las categorías
- ✅ **Validación centralizada** en backend
- ✅ **Componentes reutilizables** para UI
- ✅ **Tests automatizados** para compliance

---

## 🚀 **Conclusión**

**¡Sí, los usuarios pueden poner 0% TVA!** Pero ahora lo hacen de manera **inteligente y legal**, eligiendo entre:

1. **0% Exonéré** - Para servicios legalmente exonerados
2. **0% Non Assujetti** - Para prestaciones no sujetas a TVA suiza
3. **Exención automática** - Para empresas bajo el umbral de 100,000 CHF

El sistema **SimpliFaq** ahora proporciona **guidance legal completo** y **compliance automático** para todas las situaciones de TVA 0% en Suiza. 🇨🇭✨