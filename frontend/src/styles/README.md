# 🎨 Sistema de Temas CSS - SimpliFaq

Este documento explica cómo funciona y cómo usar el sistema de temas CSS implementado en la aplicación.

## 📋 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Temas Disponibles](#temas-disponibles)
3. [Variables CSS](#variables-css)
4. [Uso en Componentes React](#uso-en-componentes-react)
5. [Clases CSS Predefinidas](#clases-css-predefinidas)
6. [Personalización](#personalización)
7. [Mejores Prácticas](#mejores-prácticas)

## 🌟 Visión General

El sistema de temas utiliza **CSS Custom Properties (variables CSS)** para permitir cambios dinámicos de tema sin recargar la página. Está integrado con React Context para gestión de estado y localStorage para persistencia.

### Características principales:
- ✅ 4 temas predefinidos (Claro, Oscuro, Suizo, Profesional)
- ✅ Transiciones suaves entre temas
- ✅ Detección automática de preferencias del sistema
- ✅ Persistencia en localStorage
- ✅ Componentes React para selección de temas
- ✅ Variables CSS semánticas
- ✅ Compatibilidad con Tailwind CSS

## 🎭 Temas Disponibles

### 1. **Tema Claro** (`light`)
- **Descripción**: Tema moderno y limpio con fondo blanco
- **Uso**: Ideal para uso diurno y oficinas bien iluminadas
- **Colores**: Azul como color primario, grises suaves

### 2. **Tema Oscuro** (`dark`)
- **Descripción**: Tema oscuro para reducir fatiga visual
- **Uso**: Perfecto para trabajo nocturno o ambientes con poca luz
- **Colores**: Fondos oscuros con texto claro

### 3. **Tema Suizo** (`swiss`)
- **Descripción**: Colores tradicionales suizos con rojo como primario
- **Uso**: Para empresas suizas o que quieren identidad local
- **Colores**: Rojo suizo (#DC143C) como color primario

### 4. **Tema Profesional** (`professional`)
- **Descripción**: Tema corporativo elegante
- **Uso**: Ideal para presentaciones y entornos empresariales
- **Colores**: Azul marino profesional, diseño conservador

## 🎨 Variables CSS

### Estructura de Variables

```css
:root {
  /* Colores de fondo */
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f8fafc;
  --color-bg-tertiary: #f1f5f9;
  --color-bg-accent: #e2e8f0;
  
  /* Colores de superficie */
  --color-surface-primary: #ffffff;
  --color-surface-secondary: #f8fafc;
  --color-surface-elevated: #ffffff;
  --color-surface-overlay: rgba(0, 0, 0, 0.5);
  
  /* Colores de texto */
  --color-text-primary: #0f172a;
  --color-text-secondary: #475569;
  --color-text-tertiary: #64748b;
  --color-text-disabled: #94a3b8;
  --color-text-inverse: #ffffff;
  
  /* Colores de borde */
  --color-border-primary: #e2e8f0;
  --color-border-secondary: #cbd5e1;
  --color-border-focus: #3b82f6;
  
  /* Colores primarios */
  --color-primary-50: #eff6ff;
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  --color-primary-700: #1d4ed8;
  
  /* Colores de estado */
  --color-success-500: #22c55e;
  --color-error-500: #ef4444;
  --color-warning-500: #f59e0b;
  
  /* Espaciado y diseño */
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --border-radius-md: 0.5rem;
  --border-radius-lg: 0.75rem;
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --transition-normal: 200ms ease-in-out;
}
```

## ⚛️ Uso en Componentes React

### 1. **Usar el Hook de Tema**

```tsx
import { useTheme } from '../contexts/ThemeContext';

function MyComponent() {
  const { theme, setTheme, toggleTheme, isDark } = useTheme();
  
  return (
    <div>
      <p>Tema actual: {theme}</p>
      <button onClick={toggleTheme}>
        Cambiar a {isDark ? 'claro' : 'oscuro'}
      </button>
    </div>
  );
}
```

### 2. **Usar Variables CSS en Estilos Inline**

```tsx
function StyledComponent() {
  return (
    <div style={{
      backgroundColor: 'var(--color-bg-primary)',
      color: 'var(--color-text-primary)',
      border: '1px solid var(--color-border-primary)',
      borderRadius: 'var(--border-radius-lg)',
      padding: 'var(--spacing-lg)'
    }}>
      Contenido con tema dinámico
    </div>
  );
}
```

### 3. **Componentes de Selección de Tema**

```tsx
import { ThemeSelector, ThemeToggle, ThemePreview } from '../ui/ThemeSelector';

function SettingsPage() {
  return (
    <div>
      {/* Selector completo con dropdown */}
      <ThemeSelector variant="dropdown" showLabels={true} />
      
      {/* Toggle simple claro/oscuro */}
      <ThemeToggle />
      
      {/* Grid de previews */}
      <ThemeSelector variant="grid" />
      
      {/* Preview individual */}
      <ThemePreview themeName="swiss" />
    </div>
  );
}
```

## 🎯 Clases CSS Predefinidas

### Botones
```css
.btn-theme-primary {
  background-color: var(--color-primary-600);
  color: var(--color-text-inverse);
  /* ... */
}

.btn-theme-secondary {
  background-color: var(--color-surface-primary);
  color: var(--color-text-primary);
  /* ... */
}
```

### Inputs
```css
.input-theme {
  background-color: var(--color-surface-primary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-primary);
  /* ... */
}
```

### Cards
```css
.card-theme {
  background-color: var(--color-surface-primary);
  border: 1px solid var(--color-border-primary);
  box-shadow: var(--shadow-sm);
  /* ... */
}
```

### Navegación
```css
.nav-theme {
  background-color: var(--color-surface-primary);
  border-right: 1px solid var(--color-border-primary);
}

.nav-item-theme.active {
  color: var(--color-primary-600);
  background-color: var(--color-primary-50);
}
```

## 🛠️ Personalización

### Agregar un Nuevo Tema

1. **Definir variables CSS en `themes.css`:**

```css
[data-theme="mi-tema"] {
  --color-bg-primary: #f0f0f0;
  --color-text-primary: #333333;
  --color-primary-600: #ff6b6b;
  /* ... más variables */
}
```

2. **Actualizar configuración en `ThemeContext.tsx`:**

```tsx
export const themeConfig = {
  // ... temas existentes
  'mi-tema': {
    name: 'Mi Tema',
    description: 'Descripción de mi tema personalizado',
    icon: '🎨',
  },
} as const;

export type Theme = 'light' | 'dark' | 'swiss' | 'professional' | 'mi-tema';
```

### Personalizar Variables Existentes

```css
:root {
  /* Sobrescribir variables específicas */
  --color-primary-600: #your-brand-color;
  --border-radius-lg: 1rem; /* Bordes más redondeados */
  --transition-normal: 300ms ease-out; /* Transiciones más lentas */
}
```

## 📚 Mejores Prácticas

### ✅ Hacer

1. **Usar variables CSS semánticas:**
   ```css
   /* ✅ Bueno */
   color: var(--color-text-primary);
   
   /* ❌ Evitar */
   color: #333333;
   ```

2. **Usar clases predefinidas cuando sea posible:**
   ```tsx
   // ✅ Bueno
   <button className="btn-theme-primary">Botón</button>
   
   // ❌ Menos ideal
   <button style={{ backgroundColor: 'var(--color-primary-600)' }}>Botón</button>
   ```

3. **Testear en todos los temas:**
   - Verificar contraste y legibilidad
   - Probar funcionalidad en tema oscuro
   - Validar colores de estado (error, éxito, etc.)

### ❌ Evitar

1. **Colores hardcodeados:**
   ```css
   /* ❌ Malo */
   .my-component {
     background: #ffffff;
     color: #000000;
   }
   ```

2. **Transiciones durante cambio de tema:**
   ```css
   /* ❌ Puede causar flashes */
   .my-component {
     transition: all 0.3s ease;
   }
   ```

3. **Asumir un tema específico:**
   ```tsx
   // ❌ Malo - asume tema claro
   const textColor = isDark ? '#ffffff' : '#000000';
   
   // ✅ Bueno - usa variables
   const textColor = 'var(--color-text-primary)';
   ```

## 🔧 Debugging

### Inspeccionar Variables CSS
```javascript
// En DevTools Console
getComputedStyle(document.documentElement).getPropertyValue('--color-primary-600');

// Ver todas las variables CSS
Array.from(document.styleSheets)
  .flatMap(sheet => Array.from(sheet.cssRules))
  .filter(rule => rule.selectorText === ':root')
  .flatMap(rule => Array.from(rule.style))
  .filter(prop => prop.startsWith('--color'));
```

### Verificar Tema Actual
```javascript
// Tema aplicado al DOM
document.documentElement.getAttribute('data-theme');

// Estado en React (desde DevTools)
$r.context // En componente que usa useTheme
```

## 📱 Responsive y Accesibilidad

- **Contraste**: Todos los temas cumplen WCAG AA
- **Responsive**: Variables se adaptan a diferentes tamaños de pantalla
- **Reducción de movimiento**: Respeta `prefers-reduced-motion`
- **Alto contraste**: Compatible con `prefers-contrast: high`

---

¿Necesitas ayuda con el sistema de temas? Consulta los ejemplos en `/src/components/settings/ThemeSettings.tsx` o revisa la implementación en `/src/contexts/ThemeContext.tsx`.