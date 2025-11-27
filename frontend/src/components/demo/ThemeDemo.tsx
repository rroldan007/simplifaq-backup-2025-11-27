import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../hooks/useTheme';
import { ThemeSelector, ThemeToggle } from '../ui/ThemeSelector';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useMotion } from '../../hooks/useMotion';

export const ThemeDemo: React.FC = () => {
  const { theme, availableThemes } = useTheme();
  const { variants, transition } = useMotion();

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={variants.staggerContainer}
          transition={transition}
          className="space-y-8"
        >
          {/* Header */}
          <motion.div variants={variants.staggerItem} className="text-center">
            <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              🎨 Demo del Sistema de Temas DaisyUI
            </h1>
            <p className="text-lg mb-6" style={{ color: 'var(--color-text-secondary)' }}>
              Tema actual: <strong>{availableThemes[theme].name}</strong> {availableThemes[theme].icon}
            </p>
            <div className="flex justify-center gap-4">
              <ThemeToggle />
              <ThemeSelector variant="dropdown" showLabels={true} />
            </div>
          </motion.div>

          {/* Paleta de Colores */}
          <motion.div variants={variants.staggerItem}>
            <Card>
              <CardHeader title="Paleta de Colores DaisyUI OKLCH" />
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {/* Colores Base */}
                  <div className="text-center">
                    <div 
                      className="w-16 h-16 rounded-lg mx-auto mb-2 shadow-md border"
                      style={{ 
                        backgroundColor: 'var(--color-base-100)',
                        borderColor: 'var(--color-border-primary)'
                      }}
                    />
                    <p className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      Base 100
                    </p>
                  </div>

                  <div className="text-center">
                    <div 
                      className="w-16 h-16 rounded-lg mx-auto mb-2 shadow-md"
                      style={{ backgroundColor: 'var(--color-base-200)' }}
                    />
                    <p className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      Base 200
                    </p>
                  </div>

                  <div className="text-center">
                    <div 
                      className="w-16 h-16 rounded-lg mx-auto mb-2 shadow-md"
                      style={{ backgroundColor: 'var(--color-base-300)' }}
                    />
                    <p className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      Base 300
                    </p>
                  </div>

                  {/* Color Primario */}
                  <div className="text-center">
                    <div 
                      className="w-16 h-16 rounded-lg mx-auto mb-2 shadow-md"
                      style={{ backgroundColor: 'var(--color-primary-600)' }}
                    />
                    <p className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      Primary
                    </p>
                  </div>

                  {/* Color Secundario */}
                  <div className="text-center">
                    <div 
                      className="w-16 h-16 rounded-lg mx-auto mb-2 shadow-md"
                      style={{ backgroundColor: 'var(--color-secondary-500)' }}
                    />
                    <p className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      Secondary
                    </p>
                  </div>

                  {/* Color de Acento */}
                  <div className="text-center">
                    <div 
                      className="w-16 h-16 rounded-lg mx-auto mb-2 shadow-md"
                      style={{ backgroundColor: 'var(--color-accent)' }}
                    />
                    <p className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      Accent
                    </p>
                  </div>
                </div>

                {/* Colores de Estado */}
                <div className="mt-6">
                  <h4 className="font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>
                    Colores de Estado
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div 
                        className="w-16 h-16 rounded-lg mx-auto mb-2 shadow-md"
                        style={{ backgroundColor: 'var(--color-success-500)' }}
                      />
                      <p className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        Success
                      </p>
                    </div>

                    <div className="text-center">
                      <div 
                        className="w-16 h-16 rounded-lg mx-auto mb-2 shadow-md"
                        style={{ backgroundColor: 'var(--color-error-500)' }}
                      />
                      <p className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        Error
                      </p>
                    </div>

                    <div className="text-center">
                      <div 
                        className="w-16 h-16 rounded-lg mx-auto mb-2 shadow-md"
                        style={{ backgroundColor: 'var(--color-warning-500)' }}
                      />
                      <p className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        Warning
                      </p>
                    </div>

                    <div className="text-center">
                      <div 
                        className="w-16 h-16 rounded-lg mx-auto mb-2 shadow-md"
                        style={{ backgroundColor: 'var(--color-info-500)' }}
                      />
                      <p className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        Info
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Componentes UI */}
          <motion.div variants={variants.staggerItem}>
            <Card>
              <CardHeader title="Componentes UI con Temas" />
              <CardContent>
                <div className="space-y-6">
                  {/* Botones */}
                  <div>
                    <h4 className="font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>
                      Botones
                    </h4>
                    <div className="flex flex-wrap gap-3">
                      <Button variant="primary">
                        Botón Primario
                      </Button>
                      <Button variant="secondary">
                        Botón Secundario
                      </Button>
                      <Button variant="success">
                        Éxito
                      </Button>
                      <Button variant="danger">
                        Error
                      </Button>
                      <Button variant="outline">
                        Outline
                      </Button>
                      <Button variant="ghost">
                        Ghost
                      </Button>
                    </div>
                  </div>

                  {/* Inputs */}
                  <div>
                    <h4 className="font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>
                      Campos de Entrada
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        placeholder="Campo de texto normal"
                        fullWidth
                      />
                      <Input
                        placeholder="Campo con error"
                        error="Este campo es requerido"
                        fullWidth
                      />
                      <Input
                        placeholder="Campo con ayuda"
                        helperText="Texto de ayuda aquí"
                        fullWidth
                      />
                      <Input
                        placeholder="Campo deshabilitado"
                        disabled
                        fullWidth
                      />
                    </div>
                  </div>

                  {/* Cards anidadas */}
                  <div>
                    <h4 className="font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>
                      Tarjetas
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card variant="default" hover>
                        <CardContent>
                          <h5 className="font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                            Tarjeta Normal
                          </h5>
                          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                            Esta es una tarjeta con el estilo por defecto.
                          </p>
                        </CardContent>
                      </Card>

                      <Card variant="elevated" hover>
                        <CardContent>
                          <h5 className="font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                            Tarjeta Elevada
                          </h5>
                          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                            Esta tarjeta tiene más sombra y elevación.
                          </p>
                        </CardContent>
                      </Card>

                      <Card variant="outlined" hover>
                        <CardContent>
                          <h5 className="font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                            Tarjeta con Borde
                          </h5>
                          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                            Esta tarjeta tiene un borde más prominente.
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* Estados de Mensaje */}
                  <div>
                    <h4 className="font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>
                      Estados de Mensaje
                    </h4>
                    <div className="space-y-3">
                      <div 
                        className="p-3 rounded-lg border"
                        style={{ 
                          backgroundColor: 'var(--color-success-50)',
                          borderColor: 'var(--color-success-500)',
                          color: 'var(--color-success-content)'
                        }}
                      >
                        ✅ Mensaje de éxito con colores DaisyUI
                      </div>

                      <div 
                        className="p-3 rounded-lg border"
                        style={{ 
                          backgroundColor: 'var(--color-error-50)',
                          borderColor: 'var(--color-error-500)',
                          color: 'var(--color-error-content)'
                        }}
                      >
                        ❌ Mensaje de error con colores DaisyUI
                      </div>

                      <div 
                        className="p-3 rounded-lg border"
                        style={{ 
                          backgroundColor: 'var(--color-warning-50)',
                          borderColor: 'var(--color-warning-500)',
                          color: 'var(--color-warning-content)'
                        }}
                      >
                        ⚠️ Mensaje de advertencia con colores DaisyUI
                      </div>

                      <div 
                        className="p-3 rounded-lg border"
                        style={{ 
                          backgroundColor: 'var(--color-info-50)',
                          borderColor: 'var(--color-info-500)',
                          color: 'var(--color-info-content)'
                        }}
                      >
                        ℹ️ Mensaje informativo con colores DaisyUI
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Variables CSS */}
          <motion.div variants={variants.staggerItem}>
            <Card>
              <CardHeader title="Variables CSS DaisyUI" />
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>
                      Radios y Tamaños
                    </h4>
                    <div className="space-y-2 text-sm font-mono">
                      <div style={{ color: 'var(--color-text-secondary)' }}>
                        --radius-selector: <span style={{ color: 'var(--color-primary-600)' }}>var(--radius-selector)</span>
                      </div>
                      <div style={{ color: 'var(--color-text-secondary)' }}>
                        --radius-field: <span style={{ color: 'var(--color-primary-600)' }}>var(--radius-field)</span>
                      </div>
                      <div style={{ color: 'var(--color-text-secondary)' }}>
                        --radius-box: <span style={{ color: 'var(--color-primary-600)' }}>var(--radius-box)</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>
                      Ejemplos de Uso
                    </h4>
                    <div className="space-y-3">
                      <div 
                        className="p-3 border"
                        style={{ 
                          backgroundColor: 'var(--color-surface-secondary)',
                          borderColor: 'var(--color-border-primary)',
                          borderRadius: 'var(--radius-box)'
                        }}
                      >
                        Elemento con radius-box
                      </div>
                      <input 
                        type="text"
                        placeholder="Input con radius-field"
                        className="w-full px-3 py-2 border"
                        style={{ 
                          backgroundColor: 'var(--color-surface-primary)',
                          borderColor: 'var(--color-border-primary)',
                          borderRadius: 'var(--radius-field)',
                          color: 'var(--color-text-primary)'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default ThemeDemo;