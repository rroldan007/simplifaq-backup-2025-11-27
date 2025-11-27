# 📄 Sistema de Templates PDF y Swiss QR Bill

**Última actualización:** 16 Noviembre 2025  
**Estado:** ✅ Sistema PDFKit activo y funcional

---

## 📋 Índice

1. [Arquitectura del Sistema](#arquitectura-del-sistema)
2. [Sistema de Templates](#sistema-de-templates)
3. [Generación de PDF](#generación-de-pdf)
4. [Swiss QR Bill](#swiss-qr-bill)
5. [Vista Previa](#vista-previa)
6. [Feature Flags](#feature-flags)
7. [Flujo Completo](#flujo-completo)

---

## 🏗️ Arquitectura del Sistema

### Estado Actual

```
┌─────────────────────────────────────────────────┐
│         SISTEMA ACTUAL (PDFKit)                 │
├─────────────────────────────────────────────────┤
│ Feature Flags:                                  │
│  • newInvoiceTemplates.enabled: FALSE           │
│  • usePuppeteerForPdf.enabled: FALSE            │
├─────────────────────────────────────────────────┤
│ Generación PDF:  invoicePDFPdfkit.ts           │
│ Templates:       PDFKit (6 opciones)            │
│ QR Bill:         swissqrbill/pdf (oficial)      │
└─────────────────────────────────────────────────┘
```

### Componentes Principales

```
Backend:
├── src/controllers/invoiceController.ts
│   └── downloadInvoicePDF() - Endpoint principal
├── src/utils/invoicePDFPdfkit.ts
│   └── generateInvoicePDF() - Generación con PDFKit
├── src/utils/swissQRBill.ts
│   └── createQRBillFromInvoice() - Datos del QR Bill
└── src/features/featureFlags.ts
    └── Configuración de feature flags

Frontend:
└── src/pages/SettingsPage.tsx
    └── Selector de templates y configuración PDF
```

---

## 🎨 Sistema de Templates

### Templates Disponibles (PDFKit)

El sistema usa **PDFKit** con 6 templates predefinidos:

| Template | Descripción | Color Principal |
|----------|-------------|-----------------|
| `swiss_classic` | Clásico Suisse | Rojo (#DC143C) |
| `european_minimal` | Minimaliste Européen | Gris (#334155) |
| `swiss_blue` | Bleu Corporatif | Azul (#0369A1) |
| `german_formal` | Formel Allemand | Negro (#18181B) |
| `elegant_classic` | Élégant Classique | Índigo (#4F46E5) |
| `minimal_modern` | Moderne Minimal | Blanco/Gris (#1E293B) |

### Código de Templates

**Ubicación:** `/var/www/simplifaq/test/backend/src/utils/invoicePDFPdfkit.ts`

```typescript
const themes: Record<string, Partial<PdfThemeStyles>> = {
  swiss_classic: { 
    headerBackground: '#DC143C', 
    headerText: '#FFFFFF', 
    tableHeaderBackground: '#DC143C',
    tableHeaderText: '#FFFFFF',
    totalTextColor: '#DC143C',
    borderColor: '#E5E7EB'
  },
  european_minimal: {
    headerBackground: '#FFFFFF',
    headerText: '#334155',
    tableHeaderBackground: '#F8FAFC',
    tableHeaderText: '#64748B',
    totalTextColor: '#475569',
    borderColor: '#CBD5E1'
  },
  // ... otros templates
};
```

### Selección de Template

**Prioridad de selección:**

```typescript
1. user.pdfTemplate          // Template del usuario (BD)
2. user.pdfPrimaryColor      // Color personalizado
3. Theme predefinido         // Colores del theme
```

**Ubicación en BD:**
```sql
SELECT pdfTemplate, pdfPrimaryColor FROM User WHERE id = ?
```

---

## 📄 Generación de PDF

### Flujo de Generación

```
┌─────────────────────────────────────────────────┐
│ 1. Cliente solicita PDF                         │
│    GET /api/invoices/:id/download               │
└──────────────┬──────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────┐
│ 2. invoiceController.downloadInvoicePDF()       │
│    • Obtiene factura con relaciones             │
│    • Verifica feature flags                     │
│    • Decide: PDFKit o Puppeteer                 │
└──────────────┬──────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────┐
│ 3. invoicePDFPdfkit.generateInvoicePDF()       │
│    • Crea documento PDFKit                      │
│    • Aplica template y colores                  │
│    • Renderiza contenido                        │
│    • Agrega Swiss QR Bill                       │
└──────────────┬──────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────┐
│ 4. Retorna PDF al cliente                       │
│    Content-Type: application/pdf                │
│    Content-Disposition: attachment               │
└─────────────────────────────────────────────────┘
```

### Código Clave

**Endpoint:** `src/controllers/invoiceController.ts`

```typescript
export const downloadInvoicePDF = async (req: Request, res: Response) => {
  // 1. Obtener factura con todas las relaciones
  const invoice = await prisma.invoice.findFirst({
    where: { id, userId },
    include: {
      client: true,
      items: { include: { product: true } },
      user: true, // Incluye pdfTemplate, pdfPrimaryColor, etc.
    },
  });

  // 2. Verificar feature flags
  const useNewTemplates = featureFlags.isEnabled('newInvoiceTemplates.enabled', userId);
  const usePuppeteer = featureFlags.isEnabled('usePuppeteerForPdf.enabled', userId);

  // 3. Decidir sistema a usar
  if (useNewTemplates || usePuppeteer) {
    // Sistema Puppeteer (DESACTIVADO actualmente)
    const pdfService = getInvoicePDFService();
    const pdfBuffer = await pdfService.generateInvoicePDF(invoice, options);
    res.send(pdfBuffer);
  } else {
    // Sistema PDFKit (ACTIVO)
    const qrBillData = await createQRBillFromInvoice(invoice);
    await renderInvoicePDF({
      invoice,
      client: invoice.client,
      qrData: qrBillData,
      template: user.pdfTemplate,
      accentColor: user.pdfPrimaryColor,
    }, res);
  }
};
```

### Renderizado del PDF

**Ubicación:** `src/utils/invoicePDFPdfkit.ts`

```typescript
export async function generateInvoicePDF(data: InvoiceData, stream: Writable) {
  // 1. Crear documento PDFKit
  const doc = new PDFDocument({ 
    size: 'A4', 
    margin: 50 
  });
  doc.pipe(stream);

  // 2. Obtener estilos del theme
  const styles = getThemeStyles(data.template, data.accentColor);

  // 3. Renderizar header
  renderHeader(doc, invoice, styles);

  // 4. Renderizar información cliente/empresa
  renderCompanyInfo(doc, invoice, styles);

  // 5. Renderizar tabla de items
  renderItemsTable(doc, invoice.items, styles);

  // 6. Renderizar totales
  renderTotals(doc, invoice, styles);

  // 7. Renderizar Swiss QR Bill
  if (qrData && qrData.creditor && qrData.creditorAccount) {
    const qrBill = new SwissQRBill(qrBillData, { language: 'FR' });
    qrBill.attachTo(doc);
  }

  // 8. Finalizar documento
  doc.end();
}
```

---

## 💳 Swiss QR Bill

### Librería Utilizada

**Librería:** `swissqrbill` v4.3.0  
**Importación:** `import { SwissQRBill } from 'swissqrbill/pdf';`  
**Documentación:** https://github.com/schoero/swissqrbill

### Formato Oficial

El Swiss QR Bill generado cumple con el **estándar oficial suizo**:

```
┌────────────────────────────────────────────────┐
│     LÍNEA PUNTEADA (punto de corte)           │
├──────────────┬─────────────────────────────────┤
│  Récépissé   │    Section paiement             │
│  (62mm)      │    (148mm)                      │
│              │                                 │
│ Compte/      │  ┌──────────┐                   │
│ Payable à    │  │ QR Code  │  Monnaie         │
│              │  │ 46x46mm  │  Montant         │
│ Payable à    │  └──────────┘                   │
│              │  Compte/Payable à               │
│ Référence    │  Payable à                      │
│              │  Référence                      │
│ Payable par  │  Informations supplémentaires   │
│              │  Payable par                    │
│ Monnaie      │                                 │
│ Montant      │                                 │
│              │                                 │
│ Point de     │                                 │
│ dépôt        │                                 │
└──────────────┴─────────────────────────────────┘
```

### Generación del QR Bill

**Paso 1: Crear datos del QR Bill**

`src/utils/swissQRBill.ts`:

```typescript
export async function createQRBillFromInvoice(invoice: any): Promise<SwissQRBillData> {
  // 1. Obtener y validar IBAN
  const rawIban = (invoice.user?.iban || '').replace(/\s+/g, '').toUpperCase();
  
  // 2. Generar referencia QR (si es QR-IBAN)
  const qrResult = computeQRReference({
    mode: user.qrReferenceMode || 'auto',
    prefix: user.qrReferencePrefix,
    invoiceNumber: invoice.invoiceNumber,
    iban: rawIban,
  });

  // 3. Preparar datos del acreedor (creditor)
  const qrBillData: SwissQRBillData = {
    creditor: {
      name: invoice.user.companyName,
      addressLine1: invoice.user.street,
      postalCode: invoice.user.postalCode,
      city: invoice.user.city,
      country: normalizeCountry(invoice.user.country) || 'CH',
      account: formatIBAN(rawIban),
    },
    // 4. Preparar datos del deudor (debtor)
    debtor: {
      name: invoice.client.companyName || 
            `${invoice.client.firstName} ${invoice.client.lastName}`,
      addressLine1: invoice.client.street,
      postalCode: invoice.client.postalCode,
      city: invoice.client.city,
      country: normalizeCountry(invoice.client.country) || 'CH',
    },
    // 5. Datos del pago
    amount: roundToCHF05(invoice.total, invoice.currency),
    currency: invoice.currency,
    reference: qrResult.reference,
    referenceType: qrResult.type, // 'QRR' o 'NON'
    unstructuredMessage: `Facture ${invoice.invoiceNumber}`,
  };

  return qrBillData;
}
```

**Paso 2: Renderizar en PDF**

`src/utils/invoicePDFPdfkit.ts`:

```typescript
// Al final del documento, agregar QR Bill en nueva página
if (qrData && qrData.creditor && qrData.creditorAccount) {
  try {
    // 1. Preparar datos
    const qrBillData = {
      creditor: {
        name: qrData.creditor.name,
        address: qrData.creditor.addressLine1,
        zip: qrData.creditor.postalCode,
        city: qrData.creditor.city,
        country: qrData.creditor.country,
        account: qrData.creditorAccount, // IBAN formateado
      },
      debtor: {
        name: qrData.debtor.name,
        address: qrData.debtor.addressLine1,
        zip: qrData.debtor.postalCode,
        city: qrData.debtor.city,
        country: qrData.debtor.country,
      },
      amount: qrAmount,
      currency: qrData.currency,
      reference: qrData.reference,
      referenceType: qrData.referenceType,
      unstructuredMessage: qrData.unstructuredMessage,
    };

    // 2. Crear QR Bill con la librería oficial
    const qrBill = new SwissQRBill(qrBillData, { language: 'FR' });

    // 3. Calcular posición (al final de la página)
    const qrHeight = 105; // mm
    const qrBillY = doc.page.height - (qrHeight * 2.83465);
    
    // 4. Agregar nueva página si es necesario
    if (doc.y > qrBillY) {
      doc.addPage();
    }

    // 5. Renderizar QR Bill
    qrBill.attachTo(doc);
    
  } catch (err) {
    console.warn('[QRBILL] Failed to render:', err.message);
  }
}
```

### Referencias QR

**Tipos de referencia:**

```typescript
enum QRReferenceType {
  QRR = 'QRR',  // QR Reference (27 dígitos con checksum)
  NON = 'NON',  // Sin referencia estructurada
  SCOR = 'SCOR' // ISO 11649 (no usado)
}
```

**Generación de referencia QRR:**

```typescript
export function generateQRReference(seed: string): string {
  // 1. Limpiar y validar seed
  let numericSeed = seed.replace(/\D/g, '');
  numericSeed = numericSeed.slice(-26).padStart(26, '0');
  
  // 2. Calcular checksum (Módulo 10, recursivo)
  const checksum = calculateMod10Checksum(numericSeed);
  
  // 3. Retornar referencia completa (27 dígitos)
  return numericSeed + checksum;
}
```

**Condiciones para QRR:**

1. IBAN debe ser QR-IBAN (posiciones 5-9 entre 30000-31999)
2. `qrReferenceMode` = 'auto' o 'manual'
3. Si manual, validar referencia proporcionada

---

## 👁️ Vista Previa

### Componente Frontend

**Ubicación:** `src/components/settings/PDFPreview.tsx`

```typescript
export function PDFPreview({ userId }: { userId: string }) {
  // 1. Obtener última factura del usuario
  const { data: invoices } = useQuery(['invoices', userId]);
  const lastInvoice = invoices?.[0];

  // 2. Generar URL de preview
  const previewUrl = `/api/invoices/${lastInvoice.id}/download?preview=true`;

  return (
    <iframe 
      src={previewUrl} 
      className="w-full h-96 border rounded"
    />
  );
}
```

### Backend Preview

El mismo endpoint sirve para preview y descarga:

```typescript
// Query params opcionales
const { template, accentColor, language, format, showHeader } = req.query;

// Headers para preview vs descarga
if (req.query.preview === 'true') {
  res.setHeader('Content-Disposition', 'inline'); // Mostrar en navegador
} else {
  res.setHeader('Content-Disposition', 'attachment'); // Descargar
}
```

---

## 🚩 Feature Flags

### Configuración Actual

**Ubicación:** `src/features/featureFlags.ts`

```typescript
const defaultFeatureFlags: FeatureFlags = {
  // Sistema nuevo de templates (DESACTIVADO)
  newInvoiceTemplates: {
    enabled: false, // ← IMPORTANTE: false para usar PDFKit
    availableTemplates: ['medical-clean', 'creative-signature'],
    defaultTemplate: 'creative-signature',
  },
  
  // Generación con Puppeteer (DESACTIVADO)
  usePuppeteerForPdf: {
    enabled: false, // ← IMPORTANTE: false para usar PDFKit
    fallbackToPdfKit: true,
  },
};
```

### Lógica de Decisión

```typescript
const useNewTemplates = featureFlags.isEnabled('newInvoiceTemplates.enabled', userId);
const usePuppeteer = featureFlags.isEnabled('usePuppeteerForPdf.enabled', userId);

if (useNewTemplates || usePuppeteer) {
  // Sistema Puppeteer (templates Canva)
  return await puppeteerPDFService.generate(invoice);
} else {
  // Sistema PDFKit (templates clásicos)
  return await pdfkitService.generate(invoice);
}
```

---

## 🔄 Flujo Completo

### 1. Usuario Configura Template

```
Frontend (SettingsPage.tsx)
│
├─> Usuario selecciona template: "european_minimal"
│   └─> API PUT /auth/me { pdfTemplate: "european_minimal" }
│
└─> Usuario elige color: "#059669"
    └─> API PUT /auth/me { pdfPrimaryColor: "#059669" }

Base de Datos (User table)
│
└─> UPDATE User SET 
    pdfTemplate = "european_minimal",
    pdfPrimaryColor = "#059669"
    WHERE id = userId
```

### 2. Usuario Descarga PDF

```
1. Click "Télécharger PDF" en factura
   └─> GET /api/invoices/:id/download

2. invoiceController.downloadInvoicePDF()
   ├─> Obtiene invoice con user y client
   ├─> Lee pdfTemplate y pdfPrimaryColor del user
   ├─> Verifica feature flags
   │   ├─> newInvoiceTemplates.enabled: false
   │   └─> usePuppeteerForPdf.enabled: false
   └─> ✅ Usa sistema PDFKit

3. createQRBillFromInvoice()
   ├─> Valida IBAN del user
   ├─> Genera referencia QR (si QR-IBAN)
   └─> Prepara datos creditor y debtor

4. invoicePDFPdfkit.generateInvoicePDF()
   ├─> Crea documento PDFKit
   ├─> Aplica theme "european_minimal"
   ├─> Aplica color personalizado "#059669"
   ├─> Renderiza contenido
   └─> Agrega Swiss QR Bill con swissqrbill/pdf

5. Respuesta al cliente
   └─> Content-Type: application/pdf
       Content-Disposition: attachment
       [PDF binary data]
```

### 3. Vista Previa en Configuración

```
Frontend (PDFPreview component)
│
└─> Obtiene última factura del usuario
    └─> GET /api/invoices?limit=1

    └─> Muestra preview en iframe
        └─> GET /api/invoices/:id/download?preview=true
            (mismo flujo que descarga, pero inline)
```

---

## 📁 Estructura de Archivos

```
backend/src/
│
├── controllers/
│   └── invoiceController.ts
│       └── downloadInvoicePDF()        ← Endpoint principal
│
├── services/
│   ├── invoicePDFService.ts            ← Sistema Puppeteer (desactivado)
│   └── puppeteerPDFService.ts
│
├── utils/
│   ├── invoicePDFPdfkit.ts             ← ✅ Sistema PDFKit (activo)
│   │   ├── generateInvoicePDF()        ← Generación principal
│   │   ├── getThemeStyles()            ← Estilos por template
│   │   └── renderInvoicePDF()          ← Renderizado
│   │
│   └── swissQRBill.ts                  ← Swiss QR Bill
│       ├── createQRBillFromInvoice()   ← Crea datos QR
│       ├── generateQRReference()       ← Genera referencia
│       ├── isQRIBAN()                  ← Valida QR-IBAN
│       └── formatIBAN()                ← Formatea IBAN
│
├── features/
│   └── featureFlags.ts                 ← Feature flags
│
└── templates/
    └── themes/
        ├── medical-clean/              ← Template Puppeteer (no usado)
        └── creative-signature/         ← Template Puppeteer (no usado)

frontend/src/
│
├── pages/
│   └── SettingsPage.tsx                ← Configuración de templates
│       └── <select> pdfTemplate        ← Selector de template
│           └── <ColorPicker>           ← Selector de color
│
└── components/
    └── settings/
        └── PDFPreview.tsx              ← Vista previa PDF
```

---

## 🔧 Configuración de Usuario

### Campos en Base de Datos

```sql
-- Tabla: User
CREATE TABLE User (
  id VARCHAR(255) PRIMARY KEY,
  
  -- Templates y colores
  pdfTemplate VARCHAR(50),              -- 'european_minimal', etc.
  pdfPrimaryColor VARCHAR(7),           -- '#059669'
  
  -- Opciones de visualización
  pdfShowCompanyNameWithLogo BOOLEAN DEFAULT true,
  pdfShowVAT BOOLEAN DEFAULT true,
  pdfShowPhone BOOLEAN DEFAULT true,
  pdfShowEmail BOOLEAN DEFAULT true,
  pdfShowWebsite BOOLEAN DEFAULT true,
  pdfShowIBAN BOOLEAN DEFAULT true,
  
  -- QR Bill
  iban VARCHAR(34),                     -- IBAN suizo
  qrReferenceMode VARCHAR(20),          -- 'auto', 'manual', 'disabled'
  qrReferencePrefix VARCHAR(10),        -- Prefijo para referencia
  
  -- Otros campos...
);
```

### Valores por Defecto

```typescript
{
  pdfTemplate: 'european_minimal',
  pdfPrimaryColor: '#4F46E5',
  pdfShowCompanyNameWithLogo: true,
  pdfShowVAT: true,
  pdfShowPhone: true,
  pdfShowEmail: true,
  pdfShowWebsite: true,
  pdfShowIBAN: true,
  qrReferenceMode: 'auto',
}
```

---

## ⚠️ Notas Importantes

### 1. No Mezclar Sistemas

**IMPORTANTE:** Los feature flags deben estar coordinados:

```typescript
// ✅ CORRECTO (Sistema PDFKit)
newInvoiceTemplates.enabled: false
usePuppeteerForPdf.enabled: false

// ✅ CORRECTO (Sistema Puppeteer)
newInvoiceTemplates.enabled: true
usePuppeteerForPdf.enabled: true

// ❌ INCORRECTO (Conflicto)
newInvoiceTemplates.enabled: true
usePuppeteerForPdf.enabled: false
```

### 2. Templates vs Colores

Los templates tienen colores predefinidos, pero `pdfPrimaryColor` los sobrescribe:

```typescript
// Template: swiss_classic (rojo #DC143C)
// pdfPrimaryColor: #059669 (verde)
// Resultado: Verde sobrescribe rojo
```

### 3. QR-IBAN vs IBAN Normal

```typescript
// QR-IBAN: posiciones 5-9 = 30000-31999
// Ejemplo: CH44 3199 9123 0008 89012
//              ^^^^
//              30000-31999 = QR-IBAN ✅

// IBAN Normal: otras posiciones
// Ejemplo: CH93 0076 2011 6238 5295 7
//              ^^^^
//              0076 ≠ QR-IBAN ❌ (no genera referencia QRR)
```

### 4. Redondeo CHF

Los montos en CHF se redondean a 0.05:

```typescript
function roundToCHF05(amount: number, currency: string): number {
  if (currency === 'CHF') {
    return Math.round(amount * 20) / 20; // Redondea a 0.05
  }
  return amount;
}

// Ejemplos:
// 358.12 CHF → 358.10 CHF
// 358.14 CHF → 358.15 CHF
```

---

## 🐛 Troubleshooting

### PDF no genera

**Verificar:**
1. Feature flags correctos
2. Usuario tiene template válido
3. Factura tiene client y user
4. Logs en PM2: `pm2 logs simplifaq-test-backend`

### QR Bill no aparece

**Verificar:**
1. Usuario tiene IBAN configurado
2. IBAN es válido (formato suizo)
3. Logs: `[QRBILL] Creditor IBAN is not a valid...`
4. Cliente tiene dirección completa

### Template no se aplica

**Verificar:**
1. `user.pdfTemplate` en BD
2. Feature flags: ambos en `false` para PDFKit
3. Template existe en `themes` object
4. No hay mapeo activo en `invoicePDFService.ts`

---

## 📚 Referencias

- **Swiss QR Bill Spec:** https://www.paymentstandards.ch/
- **Librería swissqrbill:** https://github.com/schoero/swissqrbill
- **PDFKit:** https://pdfkit.org/
- **Feature Flags Pattern:** https://martinfowler.com/articles/feature-toggles.html

---

**Documentación creada por:** Cascade AI  
**Versión del sistema:** PDFKit + swissqrbill v4.3.0  
**Estado:** ✅ Producción activa en test.simplifaq.ch

---

## 🔧 Historial de Mejoras

### 16 Noviembre 2025 - Ajuste de Espaciado con Logo

**Problema:** Cuando una factura tiene logo, el texto del header se superponía visualmente al logo.

**Solución implementada:**

1. **Aumentar espaciado entre logo y texto:**
   ```typescript
   const logoSpacing = 25; // Antes: 15
   ```

2. **Agregar margen adicional al ancho del texto:**
   ```typescript
   const leftTextWidth = (contentWidth / 2) - textStartX - 10; // Extra 10pt margin
   ```

**Resultado:** El texto ahora respeta el espacio del logo, con 25pt de separación y 10pt de margen adicional.

**Archivo modificado:** `src/utils/invoicePDFPdfkit.ts` líneas 251, 266

**Layout mejorado:**
```
┌────────────────────────────────────────┐
│ Header (100px altura)                  │
│                                        │
│ [LOGO] ←25pt→ Chocolaterie SARL       │
│ 50x50        Rue de la Chocolaterie 1 │
│              1200 Genève               │
│              Switzerland               │
└────────────────────────────────────────┘
```

**Antes:** Logo + 15pt + Texto (texto se superponía)  
**Ahora:** Logo + 25pt + Texto + 10pt margin (texto bien separado)


---

## 🔧 Historial de Mejoras (Continuación)

### 16 Noviembre 2025 - Corrección Posicionamiento Logo

**Problema:** Logo aparecía DEBAJO del texto en lugar de al lado.

**Causa raíz:** 
- Logo se dibujaba en coordenadas relativas después del `translate`
- El orden de renderizado y el sistema de coordenadas causaban posicionamiento incorrecto
- Lógica condicional compleja permitía fallback que dibujaba texto sobre logo

**Solución final:**

1. **Dibujar logo en coordenadas ABSOLUTAS (antes del translate):**
   ```typescript
   const logoX = margin.left;  // 40pt
   const logoY = margin.top + 8;  // 38pt
   doc.image(logoBuffer, logoX, logoY, { width: logoSize, height: logoSize });
   ```

2. **Aplicar translate para el texto:**
   ```typescript
   doc.save();
   doc.translate(margin.left, margin.top);
   ```

3. **Dibujar texto en coordenadas RELATIVAS:**
   ```typescript
   const textStartX = logoSize + 15; // 65pt (relativo)
   const textStartY = 10; // 10pt (relativo)
   doc.text(companyDisplayName, textStartX, textStartY, { width: leftTextWidth });
   ```

4. **Simplificar lógica para evitar fallback:**
   ```typescript
   if (logoDrawn) {
     // SIEMPRE posicionar texto a la derecha
     // SIEMPRE marcar headerCompanyPrinted = true
   }
   ```

**Resultado:**
```
┌────────────────────────────────────────┐
│ [LOGO]  Chocolaterie SARL              │
│ 50x50   Rue de la Chocolaterie 1      │
│         1200 Genève                    │
│         Switzerland                    │
└────────────────────────────────────────┘
```

**Coordenadas finales:**
- Logo absoluto: (40, 38)
- Texto relativo: (65, 10) → absoluto: (105, 40)
- Separación: 15pt entre logo y texto

**Archivo modificado:** `src/utils/invoicePDFPdfkit.ts` (líneas 242-314)

**Estado:** ✅ Resuelto y desplegado

