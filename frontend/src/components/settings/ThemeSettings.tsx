import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../hooks/useTheme';
import { ThemePreview } from '../ui/ThemeSelector';
import type { Theme } from '../../contexts/themeTypes';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { useMotion } from '../../hooks/useMotion';
import { secureStorage } from '../../utils/security';

export const ThemeSettings: React.FC = () => {
  const { theme, availableThemes, systemPreference } = useTheme();
  const { variants, transition } = useMotion();
  const [showHeader, setShowHeader] = useState<boolean>(true);

  useEffect(() => {
    const raw = secureStorage.getItem('invoice_show_header');
    if (raw === null || typeof raw === 'undefined' || raw === '') {
      setShowHeader(true);
      return;
    }
    const s = String(raw).trim().toLowerCase();
    setShowHeader(!['false','0','no','off'].includes(s));
  }, []);

  const toggleShowHeader = (value: boolean) => {
    setShowHeader(value);
    secureStorage.setItem('invoice_show_header', value ? 'true' : 'false');
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={variants.staggerContainer}
      transition={transition}
      className="space-y-6"
    >
      {/* En-tête */}
      <motion.div variants={variants.staggerItem}>
        <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Apparence
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          Personnalisez l'apparence de votre interface selon vos préférences.
        </p>
      </motion.div>

      {/* Sélection de thème principal */}
      <motion.div variants={variants.staggerItem}>
        <Card>
          <CardHeader
            title={"Thème de l'interface"}
            subtitle={`Choisissez le thème qui correspond le mieux à vos préférences visuelles. Le thème actuel est: ${availableThemes[theme].name}`}
          />
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.keys(availableThemes).map((key) => (
                <ThemePreview
                  key={key}
                  themeName={key as Theme}
                  className="transition-all duration-200"
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Informations système */}
      <motion.div variants={variants.staggerItem}>
        <Card>
          <CardHeader
            title={'Préférences système'}
            subtitle={"Informations sur les préférences de votre système d'exploitation."}
          />
          <CardContent>
            <div className="space-y-4">
              {/* Invoice PDF Header Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: 'var(--color-border-primary)' }}>
                <div>
                  <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    Afficher le nom de l'entreprise dans l'en-tête du PDF
                  </p>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Quand désactivé, la bande d'en-tête reste visible (logo et infos facture), seul le nom de l'entreprise est masqué.
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="h-5 w-5"
                    checked={showHeader}
                    onChange={(e) => toggleShowHeader(e.target.checked)}
                  />
                  <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                    {showHeader ? 'Activé' : 'Désactivé'}
                  </span>
                </label>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                <div>
                  <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    Préférence système détectée
                  </p>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Votre système préfère le mode {systemPreference === 'dark' ? 'sombre' : 'clair'}
                  </p>
                </div>
                <div className="text-2xl">
                  {systemPreference === 'dark' ? '🌙' : '☀️'}
                </div>
              </div>

              <div className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                <p>
                  💡 <strong>Conseil:</strong> Le thème sélectionné sera sauvegardé et appliqué 
                  automatiquement lors de vos prochaines visites.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Aperçu des couleurs */}
      <motion.div variants={variants.staggerItem}>
        <Card>
          <CardHeader
            title={'Palette de couleurs'}
            subtitle={'Aperçu des couleurs principales du thème sélectionné.'}
          />
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Couleur primaire */}
              <div className="text-center">
                <div 
                  className="w-16 h-16 rounded-lg mx-auto mb-2 shadow-sm"
                  style={{ backgroundColor: 'var(--color-primary-600)' }}
                />
                <p className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  Primaire
                </p>
              </div>

              {/* Couleur de succès */}
              <div className="text-center">
                <div 
                  className="w-16 h-16 rounded-lg mx-auto mb-2 shadow-sm"
                  style={{ backgroundColor: 'var(--color-success-600)' }}
                />
                <p className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  Succès
                </p>
              </div>

              {/* Couleur d'erreur */}
              <div className="text-center">
                <div 
                  className="w-16 h-16 rounded-lg mx-auto mb-2 shadow-sm"
                  style={{ backgroundColor: 'var(--color-error-600)' }}
                />
                <p className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  Erreur
                </p>
              </div>

              {/* Couleur d'avertissement */}
              <div className="text-center">
                <div 
                  className="w-16 h-16 rounded-lg mx-auto mb-2 shadow-sm"
                  style={{ backgroundColor: 'var(--color-warning-600)' }}
                />
                <p className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  Avertissement
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Exemples d'interface */}
      <motion.div variants={variants.staggerItem}>
        <Card>
          <CardHeader
            title={"Aperçu de l'interface"}
            subtitle={'Voici comment apparaîtront les éléments principaux avec le thème sélectionné.'}
          />
          <CardContent>
            <div className="space-y-4">
              {/* Exemple de boutons */}
              <div>
                <h4 className="font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>
                  Boutons
                </h4>
                <div className="flex flex-wrap gap-3">
                  <button className="btn-theme-primary px-4 py-2 rounded-lg">
                    Bouton principal
                  </button>
                  <button className="btn-theme-secondary px-4 py-2 rounded-lg">
                    Bouton secondaire
                  </button>
                  <button 
                    className="px-4 py-2 rounded-lg text-success-theme"
                    style={{ backgroundColor: 'var(--color-success-50)' }}
                  >
                    Succès
                  </button>
                  <button 
                    className="px-4 py-2 rounded-lg text-error-theme"
                    style={{ backgroundColor: 'var(--color-error-50)' }}
                  >
                    Erreur
                  </button>
                </div>
              </div>

              {/* Exemple d'input */}
              <div>
                <h4 className="font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>
                  Champs de saisie
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input 
                    type="text" 
                    placeholder="Exemple de champ de texte"
                    className="input-theme px-3 py-2"
                  />
                  <input 
                    type="email" 
                    placeholder="exemple@email.com"
                    className="input-theme px-3 py-2"
                  />
                </div>
              </div>

              {/* Exemple de card */}
              <div>
                <h4 className="font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>
                  Cartes
                </h4>
                <div className="card-theme p-4">
                  <h5 className="font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                    Exemple de carte
                  </h5>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Ceci est un exemple de contenu dans une carte avec le thème sélectionné.
                    Les couleurs et les contrastes sont optimisés pour une meilleure lisibilité.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default ThemeSettings;