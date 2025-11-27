import { Request, Response, NextFunction } from 'express';
import { featureFlags } from '../features/featureFlags';

/**
 * Middleware para inyectar los feature flags en el objeto de solicitud
 */
export const injectFeatureFlags = (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).userId; // Asumiendo que el ID del usuario está en req.userId
  
  // Añadir feature flags al objeto de solicitud
  const userCanton = req.user?.canton || featureFlags.getValue('tvaRates.defaultCanton', 'GE');
  
  // Check if dynamic TVA rates are enabled
  const isDynamicTvaRatesEnabled = featureFlags.isEnabled('features.dynamicTvaRates', userId);
  
  req.featureFlags = {
    // Verificar si el nuevo sistema de facturación está habilitado para este usuario
    isNewInvoiceSystemEnabled: featureFlags.isEnabled('newInvoiceSystem.enabled', userId),
    
    // Obtener la plantilla a usar
    getInvoiceTemplate: (preferredTemplate?: string) => {
      // Si se especifica una plantilla y está disponible, usarla
      const availableTemplates = featureFlags.getValue<string[]>('newInvoiceTemplates.availableTemplates', ['modern']);
      const defaultTemplate = featureFlags.getValue<string>('newInvoiceTemplates.defaultTemplate', 'modern');
      
      if (preferredTemplate && availableTemplates.includes(preferredTemplate)) {
        return preferredTemplate;
      }
      return defaultTemplate;
    },
    
    // Verificar si se debe usar Puppeteer para generar PDFs
    shouldUsePuppeteer: featureFlags.isEnabled('usePuppeteerForPdf.enabled', userId),
    
    // Verificar características específicas
    features: {
      recurringInvoices: featureFlags.isEnabled('features.invoiceRecurring', userId),
      invoiceDiscounts: featureFlags.isEnabled('features.invoiceDiscounts', userId),
      multiCurrency: featureFlags.isEnabled('features.multiCurrency', userId),
      onlinePayments: featureFlags.isEnabled('features.onlinePayments', userId),
      dynamicTvaRates: isDynamicTvaRatesEnabled,
    },
    
    // TVA rates functionality
    tvaRates: {
      isEnabled: isDynamicTvaRatesEnabled,
      defaultCanton: featureFlags.getValue('tvaRates.defaultCanton', 'GE'),
      currentCanton: userCanton,
      getCantons: () => featureFlags.getTvaCantons(),
      getRates: (cantonCode = userCanton) => featureFlags.getTvaRates(cantonCode),
      getDefaultRate: (rateType: 'normal' | 'reduced' | 'special' = 'normal', cantonCode = userCanton) => 
        featureFlags.getDefaultTvaRate(cantonCode, rateType),
    },
    
    // Método para verificar cualquier flag personalizado
    isEnabled: (path: string) => featureFlags.isEnabled(path, userId),
    
    // Método para obtener el valor de cualquier flag
    getValue: <T>(path: string, defaultValue: T) => featureFlags.getValue<T>(path, defaultValue),
  };
  
  next();
};

// Request type with featureFlags is extended in types/express/index.d.ts
