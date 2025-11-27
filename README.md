# Simplifaq - Swiss Invoicing SaaS

Simplifaq es una aplicación SaaS de facturación diseñada específicamente para el mercado suizo. La aplicación permite a empresas y freelancers crear, gestionar y enviar facturas cumpliendo con las regulaciones fiscales suizas, incluyendo soporte para TVA, múltiples idiomas y Swiss QR Bills.

## 🚀 Características Principales

- ✅ **Interfaz completamente en francés**
- ✅ **Swiss QR Bill integrado** con formato A4 correcto
- ✅ **Tasas de TVA suizas** (0%, 2.6%, 3.8%, 8.1%)
- ✅ **Paleta de colores limpia** con fondo blanco
- ✅ **Cumplimiento fiscal suizo** completo
- ✅ **Dashboard financiero** con métricas en tiempo real
- ✅ **Gestión de clientes** con datos fiscales suizos
- ✅ **Reportes de TVA** para declaraciones
- ✅ **Envío de facturas por email** con PDF adjunto

## 🛠️ Stack Tecnológico

### Frontend
- **React 18+** con TypeScript
- **Vite** para desarrollo y build
- **Tailwind CSS** para estilos
- **React Router** para navegación
- **Zustand** para gestión de estado
- **React Hook Form** para formularios
- **Axios** para llamadas HTTP

### Backend
- **Node.js** con Express.js
- **TypeScript**
- **PostgreSQL** con Prisma ORM
- **JWT** para autenticación
- **bcrypt** para seguridad de contraseñas

### Swiss QR Bill
- **swissqrbill** - Generación de QR Bills suizos
- **puppeteer** - Generación de PDFs
- **iban** - Validación de números IBAN suizos

## 📁 Estructura del Proyecto

```
simplifaq/
├── frontend/          # React + TypeScript + Tailwind
│   ├── src/
│   ├── public/
│   └── package.json
├── backend/           # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   └── package.json
└── README.md
```

## 🚀 Instalación y Desarrollo

### Prerrequisitos
- Node.js 18+
- PostgreSQL 14+
- npm o yarn

### Configuración del Backend

1. Navegar al directorio del backend:
```bash
cd backend
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
```bash
cp .env.example .env
# Editar .env con tus configuraciones
```

4. Ejecutar en modo desarrollo:
```bash
npm run dev
```

### Configuración del Frontend

1. Navegar al directorio del frontend:
```bash
cd frontend
```

2. Instalar dependencias:
```bash
npm install
```

3. Ejecutar en modo desarrollo:
```bash
npm run dev
```

## 🧪 Scripts Disponibles

### Backend
- `npm run dev` - Ejecutar en modo desarrollo
- `npm run build` - Compilar TypeScript
- `npm start` - Ejecutar versión compilada
- `npm run lint` - Verificar código con ESLint
- `npm run format` - Formatear código con Prettier

## 🔀 Guía de Enrutado (Frontend)

Para añadir nuevas páginas y evitar errores 404 de SPA, sigue la guía de enrutado del frontend:

- Ver `docs/ROUTING_GUIDE.md`

Esta guía explica:
- Dónde vive el router real (`frontend/src/router/index.tsx`).
- Cómo anidar rutas protegidas bajo `Layout` con `ProtectedRoute`.
- Cómo añadir rutas hijas relativas (p.ej. `expenses`, `charges`).
- Redirecciones de autenticación y ruta índice para `/`.
- Reinicio de Vite y hard refresh tras cambios de rutas.

### Frontend
- `npm run dev` - Ejecutar en modo desarrollo
- `npm run build` - Compilar para producción
- `npm run preview` - Vista previa de build
- `npm run lint` - Verificar código con ESLint
- `npm run format` - Formatear código con Prettier

## 📋 Estado del Desarrollo

Este proyecto está en desarrollo activo. Consulta el archivo `tasks.md` en `.kiro/specs/simplifaq/` para ver el progreso de implementación.

### ✅ Completado
- [x] Configuración del proyecto y entorno de desarrollo
- [x] Estructura básica de frontend y backend
- [x] Configuración de Tailwind CSS con paleta limpia
- [x] Configuración de TypeScript y herramientas de desarrollo

### 🚧 En Progreso
- [ ] Base de datos y modelos de facturación suiza
- [ ] Sistema de autenticación
- [ ] Swiss QR Bill generation
- [ ] Interfaz de usuario en francés

## 📄 Generación de PDFs de Facturas

Esta sección documenta cómo se genera el PDF de una factura (con Swiss QR Bill) en el backend, qué endpoint se utiliza, y qué archivos intervienen. También lista utilidades antiguas no referenciadas para una futura limpieza.

### Endpoint
- __Método__: `GET`
- __Ruta__: `/api/invoices/:id/pdf`
- __Auth__: Requiere JWT (`authenticateToken`)
- __Params de query admitidos__:
  - `language` (por defecto `fr`)
  - `format` (por defecto `A4`)
  - `template` (opcional, validado contra una lista interna)
  - `accentColor` (opcional, hex `#RRGGBB` o `#RGB`)
- __Respuesta__: `application/pdf` (stream), con cabecera `Content-Disposition: attachment; filename="facture-<numero>.pdf"`

### Flujo de generación
1. __Ruta__ `backend/src/routes/invoices.ts` mapea `GET /api/invoices/:id/pdf` a `generateInvoicePDF` y aplica `authenticateToken` y `auditLogger`.
2. __Controlador__ `backend/src/controllers/invoiceController.ts` → `generateInvoicePDF()`:
   - Carga la factura del usuario autenticado con sus relaciones: `client`, `items`, `user` (vía Prisma).
   - Normaliza datos para el PDF con `convertInvoiceToPDFData()`.
   - Construye datos del Swiss QR Bill con `createQRBillFromInvoice()` (usa utilidades de `swissQRBill.ts`).
   - Prepara `pdfData` y llama a `generateInvoicePDF(pdfData, res)` desde `utils/invoicePDFPdfkit.ts` para __streaming__ directo al response.
3. __Utilidad PDF__ `backend/src/utils/invoicePDFPdfkit.ts`:
   - Implementa la renderización con PDFKit: cabecera, info emisor/cliente, tabla de ítems (sin repetir encabezado en páginas posteriores), totales y Swiss QR Bill.
   - Formato de importes: separador de miles con apóstrofo (`12'345.67`).
   - Márgenes y alturas de fila optimizados para más líneas por página.
   - Manejo de fuentes Inter embebidas y layout consistente.
   - No repinta el header en la página del QR.
4. __Swiss QR Bill__ `backend/src/utils/swissQRBill.ts`:
   - Helpers para validar IBAN suizo, determinar tipo de referencia (QRR/SCOR/NON), generar referencia QR, y preparar `SwissQRBillData`.

### Archivos involucrados (usados)
- `backend/src/routes/invoices.ts` → Define la ruta `/api/invoices/:id/pdf`.
- `backend/src/controllers/invoiceController.ts` → Controlador `generateInvoicePDF` orquesta datos y llamada al generador.
- `backend/src/utils/invoicePDFPdfkit.ts` → Función `generateInvoicePDF(data, res)` que renderiza y __streamea__ el PDF.
- `backend/src/utils/swissQRBill.ts` → Utilidades para datos del QR Bill (validaciones y helpers).
- (Opcional) Logo de empresa si existe en `uploads/` (ruta normalizada en el controlador).

### Archivos candidatos a limpieza (no referenciados en `src/`)
- `backend/src/utils/invoicePDF.ts`
- `backend/src/utils/qrBillPDFGenerator.ts`

Notas:
- No existen importaciones a estos dos archivos desde el código fuente actual en `backend/src/` (son versiones previas/alternativas). Antes de eliminarlos, verifica si __tests__ históricos los usan o si necesitas conservarlos para referencia. Los artefactos en `backend/dist/` son generados y no deben tomarse como referencia para uso.

### Cómo probar rápidamente
1. Levanta el backend: `npm run dev` en `backend/`.
2. Realiza una petición autenticada a: `GET /api/invoices/:id/pdf`.
3. Abre el PDF y verifica:
   - Encabezado de tabla solo en la primera página.
   - Más líneas por página (layout compacto).
   - Separador bajo el Total (no entre TVA y Total).
   - Importes con apóstrofo como separador de miles.
   - Página del QR sin repintar el header.

## 🤝 Contribución

Este es un proyecto privado en desarrollo. Para contribuir, consulta las tareas pendientes en el archivo de especificaciones.

## 📄 Licencia

Proyecto privado - Todos los derechos reservados.