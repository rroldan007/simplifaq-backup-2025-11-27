/**
 * Módulo de Feature Flags
 * 
 * Este módulo permite activar/desactivar funcionalidades sin necesidad de hacer deploy.
 * Los flags pueden ser configurados por entorno, usuario o cualquier otra lógica de negocio.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type FeatureFlagValue = boolean | string | number | string[] | Record<string, unknown>;
type FeatureFlagRule = {
  enabled: boolean;
  value: FeatureFlagValue;
  conditions?: Record<string, unknown>;
};

type FeatureFlags = {
  // Nuevo sistema de facturación
  newInvoiceSystem: {
    enabled: boolean;
    // Porcentaje de tráfico que verá la nueva funcionalidad (0-100)
    rolloutPercentage: number;
    // Usuarios específicos que siempre ven la funcionalidad
    whitelistedUserIds: string[];
  };
  
  // Templates de factura (PDFKit - sistema funcional)
  // Los templates disponibles están definidos en invoicePDFPdfkit.ts
  // Sistema Puppeteer fue eliminado (implementación fallida)
  
  // Características específicas
  features: {
    invoiceRecurring: boolean;
    invoiceDiscounts: boolean;
    multiCurrency: boolean;
    onlinePayments: boolean;
    dynamicTvaRates: boolean;
    onboarding: boolean;
  };
  
  // TVA rates configuration by canton
  tvaRates: {
    enabled: boolean;
    defaultCanton: string;
    cantons: Record<string, {
      name: string;
      rates: Array<{
        id: string;
        name: string;
        rate: number;
        type: 'reduced' | 'normal' | 'special';
        validFrom: string; // ISO date
        validUntil?: string; // Optional end date
      }>;
    }>;
  };
};

// Configuración por defecto (puede ser sobrescrita por base de datos o variables de entorno)
const defaultFeatureFlags: FeatureFlags = {
  newInvoiceSystem: {
    enabled: false,
    rolloutPercentage: 0,
    whitelistedUserIds: [],
  },
  features: {
    invoiceRecurring: true,
    invoiceDiscounts: true,
    multiCurrency: true,
    onlinePayments: false,
    dynamicTvaRates: false, // Disabled by default
    onboarding: true, // Enabled by default for new users
  },
  tvaRates: {
    enabled: false, // Disabled by default
    defaultCanton: 'GE', // Genève by default
    cantons: {
      // Genève
      'GE': {
        name: 'Genève',
        rates: [
          {
            id: 'ge-reduced-1',
            name: 'Taux réduit 1',
            rate: 2.6,
            type: 'reduced',
            validFrom: '2023-01-01',
          },
          {
            id: 'ge-reduced-2',
            name: 'Taux réduit 2',
            rate: 3.8,
            type: 'reduced',
            validFrom: '2023-01-01',
          },
          {
            id: 'ge-normal',
            name: 'Taux normal',
            rate: 8.1,
            type: 'normal',
            validFrom: '2023-01-01',
          },
        ],
      },
      // Vaud
      'VD': {
        name: 'Vaud',
        rates: [
          {
            id: 'vd-reduced-1',
            name: 'Taux réduit 1',
            rate: 2.5,
            type: 'reduced',
            validFrom: '2023-01-01',
          },
          {
            id: 'vd-reduced-2',
            name: 'Taux réduit 2',
            rate: 3.8,
            type: 'reduced',
            validFrom: '2023-01-01',
          },
          {
            id: 'vd-normal',
            name: 'Taux normal',
            rate: 7.7,
            type: 'normal',
            validFrom: '2023-01-01',
          },
        ],
      },
      // Zürich
      'ZH': {
        name: 'Zürich',
        rates: [
          {
            id: 'zh-reduced-1',
            name: 'Taux réduit 1',
            rate: 2.6,
            type: 'reduced',
            validFrom: '2023-01-01',
          },
          {
            id: 'zh-normal',
            name: 'Taux normal',
            rate: 7.7,
            type: 'normal',
            validFrom: '2023-01-01',
          },
        ],
      },
      // Add more cantons as needed
    },
  },
};

class FeatureFlagManager {
  private flags: FeatureFlags;
  private initialized = false;

  /**
   * Get available cantons with their TVA rates
   */
  public getTvaCantons(): Array<{code: string; name: string}> {
    if (!this.flags.tvaRates.enabled) {
      return [];
    }
    
    return Object.entries(this.flags.tvaRates.cantons).map(([code, data]) => ({
      code,
      name: data.name
    }));
  }

  /**
   * Get TVA rates for a specific canton
   */
  public getTvaRates(cantonCode: string = this.flags.tvaRates.defaultCanton) {
    if (!this.flags.tvaRates.enabled) {
      return [];
    }

    const canton = this.flags.tvaRates.cantons[cantonCode] || 
                   this.flags.tvaRates.cantons[this.flags.tvaRates.defaultCanton];
    
    if (!canton) {
      return [];
    }

    const now = new Date();
    return canton.rates.filter(rate => {
      const validFrom = new Date(rate.validFrom);
      const validUntil = rate.validUntil ? new Date(rate.validUntil) : null;
      
      return now >= validFrom && (!validUntil || now <= validUntil);
    });
  }

  /**
   * Get default TVA rate for a canton
   */
  public getDefaultTvaRate(cantonCode?: string, rateType: 'normal' | 'reduced' | 'special' = 'normal') {
    const rates = this.getTvaRates(cantonCode);
    const rate = rates.find(r => r.type === rateType) || rates[0];
    return rate ? rate.rate : 0;
  }

  constructor() {
    this.flags = { ...defaultFeatureFlags };
  }

  /**
   * Inicializa los feature flags desde la base de datos
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      // Aquí podríamos cargar configuraciones desde la base de datos
      // const dbFlags = await prisma.featureFlag.findMany();
      // this.mergeFlagsFromDB(dbFlags);
      
      this.initialized = true;
      console.log('[FeatureFlags] Initialized with:', this.flags);
    } catch (error) {
      console.error('[FeatureFlags] Error initializing feature flags:', error);
      // Usar valores por defecto en caso de error
    }
  }

  /**
   * Verifica si una característica está habilitada para un usuario específico
   */
  isEnabled(featurePath: string, userId?: string): boolean {
    const parts = featurePath.split('.');
    let value: any = this.flags;
    
    for (const part of parts) {
      if (value === undefined || value === null) return false;
      value = value[part];
    }
    
    // Si el valor es un objeto con propiedad 'enabled', usamos ese valor
    if (value && typeof value === 'object' && 'enabled' in value) {
      const flag = value as { enabled: boolean; rolloutPercentage?: number; whitelistedUserIds?: string[] };
      
      // Si el usuario está en la whitelist, siempre devolvemos true
      if (userId && flag.whitelistedUserIds?.includes(userId)) {
        return true;
      }
      
      // Si hay un porcentaje de rollout, lo usamos
      if (flag.rolloutPercentage !== undefined) {
        // Usamos el ID del usuario o un valor aleatorio para consistencia
        const userHash = userId ? this.hashCode(userId) : Math.random() * 100;
        return userHash % 100 < flag.rolloutPercentage;
      }
      
      return flag.enabled;
    }
    
    return Boolean(value);
  }

  /**
   * Obtiene el valor de un feature flag
   */
  getValue<T = FeatureFlagValue>(featurePath: string, defaultValue: T): T {
    const parts = featurePath.split('.');
    let value: any = this.flags;
    
    for (const part of parts) {
      if (value === undefined || value === null) return defaultValue;
      value = value[part];
    }
    
    return value !== undefined ? value : defaultValue;
  }

  /**
   * Actualiza un feature flag (para uso en admin)
   */
  async setFlag(featurePath: string, value: FeatureFlagValue, userId?: string): Promise<void> {
    // En una implementación real, guardaríamos esto en la base de datos
    const parts = featurePath.split('.');
    let current: any = this.flags;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (current[part] === undefined) {
        current[part] = {};
      }
      current = current[part];
    }
    
    const lastPart = parts[parts.length - 1];
    current[lastPart] = value;
    
    console.log(`[FeatureFlags] Updated ${featurePath} =`, value, userId ? `(by user ${userId})` : '');
    
    // Aquí iría la lógica para persistir en la base de datos
    // await prisma.featureFlag.upsert({...});
  }
  
  /**
   * Función de hash simple para IDs de usuario
   */
  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash) % 100;
  }
}

// Singleton instance
export const featureFlags = new FeatureFlagManager();

// Inicialización automática al cargar el módulo
featureFlags.initialize().catch(console.error);

// Tipos de ayuda para TypeScript
export type { FeatureFlags };
