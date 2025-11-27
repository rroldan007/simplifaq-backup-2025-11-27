/**
 * Feature Flags Configuration
 * 
 * Manage feature rollouts and A/B testing
 */

export interface FeatureFlags {
  // UI Improvements
  modernInvoiceUI: boolean;
  animatedTransitions: boolean;
  advancedFilters: boolean;
  bulkActions: boolean;
  
  // Invoice Creation Enhancements
  enhancedInvoiceWizard: boolean;
  smartProductSearch: boolean;
  inlineValidation: boolean;
  autoSaveProgress: boolean;
  keyboardShortcuts: boolean;
  
  // Features
  aiAssistant: boolean;
  collaborativeEditing: boolean;
  advancedReports: boolean;
  customTemplates: boolean;
  
  // Experimental
  darkMode: boolean;
  offlineMode: boolean;
  realTimeSync: boolean;
}

// Default feature flags
const defaultFlags: FeatureFlags = {
  // UI Improvements - ENABLED
  modernInvoiceUI: true,
  animatedTransitions: true,
  advancedFilters: true,
  bulkActions: true,
  
  // Invoice Creation Enhancements - ENABLED
  enhancedInvoiceWizard: true,
  smartProductSearch: true,
  inlineValidation: true,
  autoSaveProgress: true,
  keyboardShortcuts: true,
  
  // Features - aiAssistant enabled by default
  aiAssistant: true,
  collaborativeEditing: false,
  advancedReports: false,
  customTemplates: false,
  
  // Experimental - DISABLED by default
  darkMode: false,
  offlineMode: false,
  realTimeSync: false,
};

/**
 * Get feature flags from localStorage with fallback to defaults
 */
export function getFeatureFlags(): FeatureFlags {
  try {
    const stored = localStorage.getItem('feature_flags');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to ensure all flags exist
      return { ...defaultFlags, ...parsed };
    }
  } catch (error) {
    console.warn('[FeatureFlags] Failed to load from localStorage:', error);
  }
  
  // Initialize localStorage with defaults on first load
  try {
    localStorage.setItem('feature_flags', JSON.stringify(defaultFlags));
  } catch (e) {
    console.warn('[FeatureFlags] Cannot save defaults to localStorage');
  }
  
  return defaultFlags;
}

/**
 * Save feature flags to localStorage
 */
export function saveFeatureFlags(flags: Partial<FeatureFlags>): void {
  try {
    const current = getFeatureFlags();
    const updated = { ...current, ...flags };
    localStorage.setItem('feature_flags', JSON.stringify(updated));
  } catch (error) {
    console.error('[FeatureFlags] Failed to save to localStorage:', error);
  }
}

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  const flags = getFeatureFlags();
  return flags[feature] ?? false;
}

/**
 * Toggle a feature flag
 */
export function toggleFeature(feature: keyof FeatureFlags): boolean {
  const flags = getFeatureFlags();
  const newValue = !flags[feature];
  saveFeatureFlags({ [feature]: newValue });
  return newValue;
}

/**
 * Reset all feature flags to defaults
 */
export function resetFeatureFlags(): void {
  try {
    localStorage.removeItem('feature_flags');
  } catch (error) {
    console.error('[FeatureFlags] Failed to reset:', error);
  }
}

/**
 * Feature flag descriptions for UI
 */
export const featureFlagDescriptions: Record<keyof FeatureFlags, string> = {
  modernInvoiceUI: 'Interface moderne et épurée pour factures et devis',
  animatedTransitions: 'Animations fluides et transitions élégantes',
  advancedFilters: 'Filtres avancés avec recherche intelligente',
  bulkActions: 'Actions groupées sur plusieurs documents',
  enhancedInvoiceWizard: 'Assistant de création amélioré avec guide visuel',
  smartProductSearch: 'Recherche intelligente de produits avec suggestions',
  inlineValidation: 'Validation en temps réel des champs de formulaire',
  autoSaveProgress: 'Sauvegarde automatique de la progression',
  keyboardShortcuts: 'Raccourcis clavier pour navigation rapide',
  aiAssistant: 'Assistant IA pour suggestions et automatisations',
  collaborativeEditing: 'Édition collaborative en temps réel',
  advancedReports: 'Rapports et analyses avancés',
  customTemplates: 'Modèles de documents personnalisés',
  darkMode: 'Mode sombre pour réduire la fatigue oculaire',
  offlineMode: 'Travailler sans connexion Internet',
  realTimeSync: 'Synchronisation en temps réel entre appareils',
};
