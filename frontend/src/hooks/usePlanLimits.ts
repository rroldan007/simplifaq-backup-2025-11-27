import { useSubscription } from './useSubscription';

/**
 * Hook to check plan limits and restrictions
 */
export function usePlanLimits() {
  const { subscription, usage, isLimitReached, getUsagePercentage, isFeatureAvailable } = useSubscription();

  const canCreateInvoice = (): { allowed: boolean; reason?: string } => {
    if (!subscription || !usage) {
      return { allowed: false, reason: 'Abonnement non trouvé' };
    }

    if (isLimitReached('invoices')) {
      return {
        allowed: false,
        reason: `Limite mensuelle de ${usage.invoicesLimit} factures atteinte. Passez à un plan supérieur.`,
      };
    }

    return { allowed: true };
  };

  const canCreateClient = (): { allowed: boolean; reason?: string } => {
    if (!subscription || !usage) {
      return { allowed: false, reason: 'Abonnement non trouvé' };
    }

    if (isLimitReached('clients')) {
      return {
        allowed: false,
        reason: `Limite de ${usage.clientsLimit} clients atteinte. Passez à un plan supérieur.`,
      };
    }

    return { allowed: true };
  };

  const canCreateProduct = (): { allowed: boolean; reason?: string } => {
    if (!subscription || !usage) {
      return { allowed: false, reason: 'Abonnement non trouvé' };
    }

    if (isLimitReached('products')) {
      return {
        allowed: false,
        reason: `Limite de ${usage.productsLimit} produits atteinte. Passez à un plan supérieur.`,
      };
    }

    return { allowed: true };
  };

  const canUploadFile = (fileSizeMB: number): { allowed: boolean; reason?: string } => {
    if (!subscription || !usage) {
      return { allowed: false, reason: 'Abonnement non trouvé' };
    }

    const remainingStorage = usage.storageLimit - usage.storageUsed;
    
    if (fileSizeMB > remainingStorage) {
      return {
        allowed: false,
        reason: `Espace de stockage insuffisant. ${remainingStorage} MB restants.`,
      };
    }

    return { allowed: true };
  };

  const hasFeature = (feature: string): boolean => {
    if (!subscription) return false;

    const featureMap: Record<string, keyof typeof subscription.plan> = {
      quotes: 'hasQuotes',
      expenses: 'hasExpenses',
      aiAssistant: 'hasAIAssistant',
      advancedReports: 'hasAdvancedReports',
      apiAccess: 'hasApiAccess',
      customBranding: 'hasCustomBranding',
      multiCurrency: 'hasMultiCurrency',
      multiLanguage: 'hasMultiLanguage',
      emailSupport: 'hasEmailSupport',
      prioritySupport: 'hasPrioritySupport',
    };

    const planFeature = featureMap[feature];
    if (!planFeature) return false;

    return isFeatureAvailable(planFeature);
  };

  const getUpgradeMessage = (feature: string): string => {
    const messages: Record<string, string> = {
      quotes: 'Les devis sont disponibles dans les plans supérieurs.',
      expenses: 'Le suivi des charges est disponible dans les plans supérieurs.',
      aiAssistant: 'L\'assistant IA est disponible dans le plan Premium.',
      advancedReports: 'Les rapports avancés sont disponibles dans les plans supérieurs.',
      apiAccess: 'L\'accès API est disponible dans le plan Premium.',
      customBranding: 'Le branding personnalisé est disponible dans le plan Premium.',
      multiCurrency: 'Le support multi-devises est disponible dans les plans supérieurs.',
      multiLanguage: 'Le support multi-langues est disponible dans les plans supérieurs.',
    };

    return messages[feature] || 'Cette fonctionnalité est disponible dans les plans supérieurs.';
  };

  return {
    canCreateInvoice,
    canCreateClient,
    canCreateProduct,
    canUploadFile,
    hasFeature,
    getUpgradeMessage,
    subscription,
    usage,
    getUsagePercentage,
    isLimitReached,
  };
}
