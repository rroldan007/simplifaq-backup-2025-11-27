import { Router } from 'express';
import { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { featureFlags } from '../features/featureFlags';

const router = Router();

/**
 * GET /api/templates
 * Obtener lista de templates disponibles
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const templates = featureFlags.getValue<string[]>(
      'newInvoiceTemplates.availableTemplates',
      ['creative-signature', 'medical-clean']
    );

    const defaultTemplate = featureFlags.getValue<string>(
      'newInvoiceTemplates.defaultTemplate',
      'creative-signature'
    );

    const templateList = templates.map(id => ({
      id,
      name: getTemplateName(id),
      description: getTemplateDescription(id),
      preview: `/api/templates/${id}/preview`,
      category: getTemplateCategory(id)
    }));

    res.json({
      success: true,
      data: {
        templates: templateList,
        defaultTemplate
      }
    });
  } catch (error: any) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TEMPLATES_ERROR',
        message: 'Error al obtener templates'
      }
    });
  }
});

/**
 * GET /api/templates/:id/preview
 * Obtener preview de un template (imagen)
 */
router.get('/:id/preview', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Por ahora retornamos un placeholder
    // En el futuro podríamos generar previews reales
    res.json({
      success: true,
      data: {
        templateId: id,
        previewUrl: `/templates/${id}/preview.png`
      }
    });
  } catch (error: any) {
    console.error('Error fetching template preview:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PREVIEW_ERROR',
        message: 'Error al obtener preview del template'
      }
    });
  }
});

// Helper functions
function getTemplateName(id: string): string {
  const names: Record<string, string> = {
    'creative-signature': 'Signature Créative',
    'medical-clean': 'Médical Propre',
    'modern': 'Moderne',
    'corporate': 'Corporatif',
    'creative': 'Créatif'
  };
  return names[id] || id;
}

function getTemplateDescription(id: string): string {
  const descriptions: Record<string, string> = {
    'creative-signature': 'Design élégant avec signature manuscrite, idéal pour photographes et créatifs',
    'medical-clean': 'Design professionnel et épuré, parfait pour pharmacies et cabinets médicaux',
    'modern': 'Design moderne et minimaliste',
    'corporate': 'Design corporatif professionnel',
    'creative': 'Design créatif et coloré'
  };
  return descriptions[id] || 'Template personnalisé';
}

function getTemplateCategory(id: string): string {
  const categories: Record<string, string> = {
    'creative-signature': 'creative',
    'medical-clean': 'professional',
    'modern': 'modern',
    'corporate': 'professional',
    'creative': 'creative'
  };
  return categories[id] || 'general';
}

export default router;
