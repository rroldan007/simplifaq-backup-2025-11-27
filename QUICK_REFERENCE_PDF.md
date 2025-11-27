# 🚀 Referencia Rápida: Sistema PDF

## ✅ Estado Actual

```
Sistema: PDFKit (original)
QR Bill: swissqrbill/pdf (oficial)
Templates: 6 opciones clásicas
Feature Flags: AMBOS en false
```

## 📝 Templates Disponibles

1. `swiss_classic` - Rojo suizo
2. `european_minimal` - Minimalista gris
3. `swiss_blue` - Azul corporativo
4. `german_formal` - Formal negro
5. `elegant_classic` - Índigo elegante
6. `minimal_modern` - Moderno blanco

## 🔄 Flujo Básico

```
Usuario → Configura template → BD User.pdfTemplate
       → Descarga PDF → invoiceController
       → createQRBillFromInvoice → QR Data
       → invoicePDFPdfkit → PDF con QR Bill
       → Descarga factura-XXX.pdf
```

## 🎨 Prioridad de Estilos

```
1. user.pdfPrimaryColor (personalizado)
2. theme[template].colors (predefinido)
3. Default colors
```

## 💳 Swiss QR Bill

**Librería:** `swissqrbill` v4.3.0  
**Formato:** Oficial suizo (62mm + 148mm)  
**Idioma:** Francés  
**Referencia:** QRR (27 dígitos) si QR-IBAN

## ⚠️ Feature Flags (IMPORTANTE)

```typescript
// ✅ CORRECTO (PDFKit)
newInvoiceTemplates.enabled: false
usePuppeteerForPdf.enabled: false

// ❌ NUNCA MEZCLAR
newInvoiceTemplates.enabled: true
usePuppeteerForPdf.enabled: false
```

## 📍 Archivos Clave

- `src/controllers/invoiceController.ts` - Endpoint
- `src/utils/invoicePDFPdfkit.ts` - Generación PDF
- `src/utils/swissQRBill.ts` - QR Bill
- `src/features/featureFlags.ts` - Flags
- `frontend/src/pages/SettingsPage.tsx` - UI

## 🔧 Troubleshooting

**PDF no genera:**
```bash
pm2 logs simplifaq-test-backend
```

**QR no aparece:**
- Verificar IBAN en user
- Logs: `[QRBILL]`

**Template no aplica:**
- Verificar `user.pdfTemplate` en BD
- Feature flags en `false`
