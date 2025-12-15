import { useState } from 'react';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { featureFlagDescriptions, type FeatureFlags } from '../../config/featureFlags';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Zap, 
  Layers, 
  Bot, 
  Users, 
  BarChart3, 
  FileText,
  Moon,
  Wifi,
  RefreshCw,
  ChevronDown,
  Info,
  Wand2,
  Search,
  CheckCircle,
  Save,
  Keyboard,
  Palette,
  type LucideIcon
} from 'lucide-react';

const FEATURE_ICONS: Record<keyof FeatureFlags, LucideIcon> = {
  modernInvoiceUI: FileText,
  animatedTransitions: Zap,
  advancedFilters: Layers,
  bulkActions: Layers,
  enhancedInvoiceWizard: Wand2,
  smartProductSearch: Search,
  inlineValidation: CheckCircle,
  autoSaveProgress: Save,
  keyboardShortcuts: Keyboard,
  aiAssistant: Bot,
  collaborativeEditing: Users,
  advancedReports: BarChart3,
  customTemplates: Palette,
  darkMode: Moon,
  offlineMode: Wifi,
  realTimeSync: RefreshCw,
};

const FEATURE_CATEGORIES = {
  'UI': ['modernInvoiceUI', 'animatedTransitions', 'advancedFilters', 'bulkActions'],
  'Features': ['aiAssistant', 'collaborativeEditing', 'advancedReports', 'customTemplates'],
  'Experimental': ['darkMode', 'offlineMode', 'realTimeSync'],
} as const;

export function FeatureFlagsPanel() {
  const { flags, toggle, reset } = useFeatureFlags();
  const [expandedCategory, setExpandedCategory] = useState<string | null>('UI');
  
  const handleToggle = (feature: keyof FeatureFlags) => {
    toggle(feature);
    
    // Show toast notification
    const event = new CustomEvent('feature-flag-changed', {
      detail: { feature, enabled: !flags[feature] }
    });
    window.dispatchEvent(event);
  };

  const handleReset = () => {
    if (confirm('Réinitialiser tous les paramètres aux valeurs par défaut ?')) {
      reset();
      window.location.reload();
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">Feature Flags</h2>
              <p className="text-blue-100 text-sm">Activez les nouvelles fonctionnalités</p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors duration-200 text-sm font-medium border border-white/20"
          >
            Réinitialiser
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="divide-y divide-slate-200">
        {Object.entries(FEATURE_CATEGORIES).map(([category, features]) => (
          <div key={category} className="p-6">
            <button
              onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
              className="w-full flex items-center justify-between mb-4 group"
            >
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                {category}
                <span className="text-sm font-normal text-slate-500">
                  ({features.filter(f => flags[f]).length}/{features.length})
                </span>
              </h3>
              <ChevronDown 
                className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                  expandedCategory === category ? 'rotate-180' : ''
                }`}
              />
            </button>

            <motion.div
              initial={false}
              animate={{
                height: expandedCategory === category ? 'auto' : 0,
                opacity: expandedCategory === category ? 1 : 0
              }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="space-y-3">
                {features.map((feature) => {
                  const Icon = FEATURE_ICONS[feature];
                  const isEnabled = flags[feature];
                  
                  return (
                    <motion.div
                      key={feature}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors duration-200"
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-lg ${
                          isEnabled ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-slate-900">
                              {feature}
                            </h4>
                            {isEnabled && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                Actif
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 mt-1">
                            {featureFlagDescriptions[feature]}
                          </p>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleToggle(feature)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          isEnabled ? 'bg-blue-600' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                            isEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        ))}
      </div>

      {/* Info Footer */}
      <div className="bg-blue-50 border-t border-blue-100 px-6 py-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">À propos des Feature Flags</p>
            <p className="text-blue-700">
              Les feature flags vous permettent d'activer ou désactiver des fonctionnalités sans redémarrer l'application. 
              Certaines fonctionnalités expérimentales peuvent être instables.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
