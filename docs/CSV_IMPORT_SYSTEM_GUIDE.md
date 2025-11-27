# 🇨🇭 Sistema de Importación CSV - SimpliFaq

## ✅ **¡Sistema CSV Implementado Completamente!**

He creado un sistema completo de importación CSV que permite a los usuarios cargar archivos CSV con productos, cantidades y precios para facilitar la creación de facturas.

## 🎯 **Características Principales**

### **1. Importación Inteligente**
- ✅ **Carga de archivos CSV** hasta 10MB
- ✅ **Validación automática** de formato y contenido
- ✅ **Detección de headers** automática
- ✅ **Parsing robusto** que maneja comillas y comas
- ✅ **Soporte UTF-8** con BOM para Excel

### **2. Validación Completa**
- ✅ **Validación de campos** (descripción, cantidad, precio, TVA)
- ✅ **Categorías TVA inteligentes** con fuzzy matching
- ✅ **Límites de seguridad** (max 1000 filas, precios hasta 999,999 CHF)
- ✅ **Mensajes de error específicos** por fila y campo
- ✅ **Preview completo** antes de importar

### **3. Interface Usuario Amigable**
- ✅ **Modal intuitivo** con pasos claros
- ✅ **Drag & drop** para archivos
- ✅ **Template descargable** con ejemplos
- ✅ **Vista previa** con validación en tiempo real
- ✅ **Resumen estadístico** (válidos/errores)

## 📋 **Formato CSV Soportado**

### **Columnas Requeridas**
```csv
Description,Quantité,Prix Unitaire,Catégorie TVA
"Consultation IT",1,150.00,STANDARD
"Formation développement",8,75.50,STANDARD
"Hébergement web",1,29.90,STANDARD
"Livre technique",2,45.00,REDUCED
"Service export",1,200.00,NOT_SUBJECT
"Consultation médicale",1,120.00,EXEMPT
```

### **Categorías TVA Soportadas**
| Categoría | Variaciones Aceptadas | Tasa |
|-----------|----------------------|------|
| `STANDARD` | NORMAL, 8.1, 8,1 | 8.1% |
| `REDUCED` | REDUIT, RÉDUIT, 2.6, 2,6 | 2.6% |
| `SPECIAL` | SPÉCIAL, 3.8, 3,8 | 3.8% |
| `EXEMPT` | EXONERE, EXONÉRÉ, 0 | 0% |
| `NOT_SUBJECT` | NON_ASSUJETTI, EXPORT | 0% |

## 🏗️ **Arquitectura Técnica**

### **Backend - Procesamiento Robusto**

#### **1. Servicio CSV (`csvImportService.ts`)**
```typescript
export class CSVImportService {
  static parseCSV(csvContent: string, cantonCode: string): CSVParseResult
  static validateFile(file: Express.Multer.File): ValidationResult
  static generateTemplate(): string
}
```

**Características:**
- Parsing CSV con manejo de comillas y comas
- Validación de tipos y rangos
- Fuzzy matching para categorías TVA
- Detección automática de headers
- Límites de seguridad configurables

#### **2. API Endpoints (`/api/csv-import/`)**
```typescript
POST /api/csv-import/parse      // Subir y procesar archivo
GET  /api/csv-import/template   // Descargar template
POST /api/csv-import/validate   // Validar contenido sin archivo
```

### **Frontend - Interface Intuitiva**

#### **1. Modal de Importación (`CSVImportModal.tsx`)**
```typescript
export const CSVImportModal: React.FC<CSVImportModalProps>
```

**Características:**
- Drag & drop para archivos
- Preview con validación visual
- Descarga de template integrada
- Manejo de errores por fila
- Resumen estadístico

#### **2. Hook Personalizado (`useCSVImport.ts`)**
```typescript
export function useCSVImport() {
  return {
    uploadCSVFile,
    validateCSVContent,
    downloadTemplate,
    parseCSVLocally,
    isLoading,
    error
  };
}
```

#### **3. Integración en Formulario (`InvoiceFormWithTVA.tsx`)**
- ✅ Botón "Importer CSV" integrado
- ✅ Reemplazo o adición de items
- ✅ Botón "Vider tout" para limpiar
- ✅ Integración con sistema TVA existente

## 🚀 **Flujo de Uso**

### **1. Usuario Carga CSV**
```typescript
// Usuario hace clic en "Importer CSV"
setIsCSVModalOpen(true);

// Selecciona archivo o arrastra
handleFileSelect(file);

// Sistema valida automáticamente
const result = await uploadCSVFile(file);
```

### **2. Sistema Procesa y Valida**
```typescript
// Backend procesa el archivo
const parseResult = CSVImportService.parseCSV(csvContent, cantonCode);

// Retorna items válidos y errores
{
  success: true,
  items: [...], // Items válidos
  errors: [...], // Errores específicos
  summary: { totalRows: 10, validRows: 8, errorRows: 2 }
}
```

### **3. Usuario Revisa y Confirma**
- ✅ **Vista previa** con todos los items
- ✅ **Errores destacados** en rojo
- ✅ **Resumen estadístico** claro
- ✅ **Opción de importar** solo items válidos

### **4. Items se Integran**
```typescript
// Items CSV se convierten a formato de factura
const newItems: InvoiceItem[] = csvItems.map(csvItem => ({
  description: csvItem.description,
  quantity: csvItem.quantity,
  unitPrice: csvItem.unitPrice,
  tvaCategory: csvItem.tvaCategory
}));

// Se agregan al formulario
setItems([...items, ...newItems]);
```

## 🛡️ **Validaciones y Seguridad**

### **Validaciones de Archivo**
- ✅ **Tamaño máximo**: 10MB
- ✅ **Tipo de archivo**: Solo CSV
- ✅ **Filas máximas**: 1000 filas
- ✅ **Encoding**: UTF-8 con BOM

### **Validaciones de Contenido**
- ✅ **Descripción**: Requerida, max 500 caracteres
- ✅ **Cantidad**: Número positivo, max 999,999
- ✅ **Precio**: Número positivo, max 999,999.99 CHF
- ✅ **TVA**: Categoría válida con fuzzy matching

### **Seguridad Backend**
- ✅ **Autenticación requerida** para todos los endpoints
- ✅ **Validación de tipos** con TypeScript
- ✅ **Sanitización de inputs**
- ✅ **Límites de memoria** con Multer
- ✅ **Error handling robusto**

## 📊 **Casos de Uso Prácticos**

### **Consultor IT**
```csv
Description,Quantité,Prix Unitaire,Catégorie TVA
"Análisis de sistemas",1,2500.00,STANDARD
"Desarrollo frontend",40,85.00,STANDARD
"Hosting anual",1,360.00,STANDARD
"Formación equipo",8,120.00,STANDARD
```

### **Médico/Dentista**
```csv
Description,Quantité,Prix Unitaire,Catégorie TVA
"Consulta general",1,80.00,EXEMPT
"Radiografía dental",2,45.00,EXEMPT
"Limpieza dental",1,120.00,EXEMPT
```

### **Empresa de Export**
```csv
Description,Quantité,Prix Unitaire,Catégorie TVA
"Consultoría internacional",1,5000.00,NOT_SUBJECT
"Servicios en Francia",10,200.00,NOT_SUBJECT
"Export productos",50,25.00,NOT_SUBJECT
```

### **Restaurante/Hotel**
```csv
Description,Quantité,Prix Unitaire,Catégorie TVA
"Cena de empresa",25,45.00,SPECIAL
"Alojamiento 2 noches",4,180.00,SPECIAL
"Desayuno buffet",25,18.00,SPECIAL
```

## 🎨 **Interface Visual**

### **Estados del Modal**
1. **Upload**: Drag & drop con template download
2. **Preview**: Tabla con validación visual
3. **Import**: Confirmación e integración

### **Indicadores Visuales**
- 🟢 **Verde**: Items válidos
- 🔴 **Rojo**: Items con errores
- 📊 **Estadísticas**: Resumen numérico
- 💡 **Tooltips**: Ayuda contextual

## 🔧 **Configuración y Personalización**

### **Límites Configurables**
```typescript
// En csvImportService.ts
private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
private static readonly MAX_ROWS = 1000; // Máximo filas
```

### **Categorías TVA Personalizables**
```typescript
// Fuzzy matching configurable
const mappings: Record<string, SwissTVACategory> = {
  'NORMAL': SwissTVACategory.STANDARD,
  'EXPORT': SwissTVACategory.NOT_SUBJECT,
  // Agregar más variaciones según necesidad
};
```

### **Templates por Industria**
- ✅ **Template general** incluido
- ✅ **Fácil personalización** para industrias específicas
- ✅ **Ejemplos contextuales** en cada template

## 🎉 **Beneficios del Sistema**

### **Para Usuarios**
- ✅ **Ahorro de tiempo**: Importar 100+ items en segundos
- ✅ **Menos errores**: Validación automática
- ✅ **Flexibilidad**: Múltiples formatos de entrada
- ✅ **Transparencia**: Preview completo antes de importar

### **Para Desarrolladores**
- ✅ **Código modular**: Servicios separados y reutilizables
- ✅ **API RESTful**: Endpoints claros y documentados
- ✅ **TypeScript**: Tipado fuerte en todo el stack
- ✅ **Testing**: Fácil de testear cada componente

### **Para Administradores**
- ✅ **Límites configurables**: Control de recursos
- ✅ **Logging completo**: Auditoría de importaciones
- ✅ **Validación robusta**: Prevención de datos corruptos
- ✅ **Escalabilidad**: Manejo eficiente de archivos grandes

---

## 🚀 **¡Sistema CSV Listo para Producción!**

El sistema de importación CSV de **SimpliFaq** está completamente implementado y listo para usar. Los usuarios pueden ahora:

1. **📤 Cargar archivos CSV** con productos y precios
2. **✅ Validar automáticamente** el contenido
3. **👀 Previsualizar** antes de importar
4. **⚡ Importar masivamente** items a facturas
5. **🎯 Usar categorías TVA** inteligentes

¡El sistema hace que crear facturas con múltiples elementos sea **rápido, fácil y sin errores**! 🇨🇭✨