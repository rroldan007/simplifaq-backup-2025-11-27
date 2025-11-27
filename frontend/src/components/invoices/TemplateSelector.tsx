import React from 'react';
import { useTemplates } from '../../hooks/useTemplates';

interface TemplateSelectorProps {
  selectedTemplate: string;
  onTemplateChange: (template: string) => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  selectedTemplate,
  onTemplateChange
}) => {
  const { templates, defaultTemplate, loading } = useTemplates();

  // Fallback templates si no se pueden cargar desde la API
  const fallbackTemplates = [
    {
      id: 'creative-signature',
      name: 'Signature Créative',
      description: 'Design élégant avec signature manuscrite, idéal pour créatifs',
      preview: 'bg-gradient-to-br from-amber-50 to-stone-100',
      category: 'creative'
    },
    {
      id: 'medical-clean',
      name: 'Médical Propre',
      description: 'Design professionnel et épuré, parfait pour cabinets médicaux',
      preview: 'bg-gradient-to-br from-teal-50 to-cyan-50',
      category: 'professional'
    }
  ];

  const templatesToDisplay = templates.length > 0 ? templates : fallbackTemplates;
  
  // Get preview class based on template ID
  const getPreviewClass = (templateId: string) => {
    const previewClasses: Record<string, string> = {
      'creative-signature': 'bg-gradient-to-br from-amber-50 to-stone-100 border-2 border-amber-200',
      'medical-clean': 'bg-gradient-to-br from-teal-50 to-cyan-50 border-2 border-teal-200'
    };
    return previewClasses[templateId] || 'bg-gradient-to-r from-slate-50 to-slate-100';
  };

  if (loading) {
    return (
      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-semibold text-slate-800 mb-3">Modèle de facture</h3>
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-12 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg p-4">
      <h3 className="font-semibold text-slate-800 mb-3">Modèle de facture</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {templatesToDisplay.map((template) => (
          <button
            type="button"
            key={template.id}
            onClick={() => onTemplateChange(template.id)}
            className={`
              relative p-3 rounded-lg border-2 transition-all duration-200 text-left
              ${selectedTemplate === template.id
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
              }
            `}
          >
            {/* Template Preview */}
            <div className={`
              w-full h-20 rounded mb-2 ${getPreviewClass(template.id)}
              flex items-center justify-center text-sm font-semibold text-slate-700
            `}>
              FACTURE
            </div>
            
            {/* Template Info */}
            <div>
              <div className="font-medium text-sm text-slate-800 mb-1">
                {template.name}
              </div>
              <div className="text-xs text-slate-600">
                {template.description}
              </div>
            </div>
            
            {/* Selected Indicator */}
            {selectedTemplate === template.id && (
              <div className="absolute top-2 right-2">
                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            )}
          </button>
        ))}
      </div>
      
      <div className="mt-3 text-xs text-slate-500">
        Sélectionnez un modèle pour personnaliser l'apparence de votre facture
      </div>
    </div>
  );
};

export default TemplateSelector;
