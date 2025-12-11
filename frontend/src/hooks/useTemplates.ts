import { useState, useEffect } from 'react';
import { api } from '../services/api';

export interface Template {
  id: string;
  name: string;
  description: string;
  preview: string;
  category: string;
}

export interface TemplatesResponse {
  templates: Template[];
  defaultTemplate: string;
}

export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [defaultTemplate, setDefaultTemplate] = useState<string>('creative-signature');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await api.get<{ templates: Template[]; defaultTemplate: string }>('/templates');
      
      if (response.data) {
        const templatesData = response.data.data;
        if (templatesData) {
          setTemplates(templatesData.templates || []);
          setDefaultTemplate(templatesData.defaultTemplate || 'creative-signature');
        }
      }
    } catch (err: unknown) {
      console.error('Error loading templates:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar templates');
      // Set default templates as fallback
      setTemplates([
        {
          id: 'creative-signature',
          name: 'Signature Créative',
          description: 'Design élégant avec signature manuscrite',
          preview: '',
          category: 'creative'
        },
        {
          id: 'medical-clean',
          name: 'Médical Propre',
          description: 'Design professionnel et épuré',
          preview: '',
          category: 'professional'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return {
    templates,
    defaultTemplate,
    loading,
    error,
    reload: loadTemplates
  };
}
