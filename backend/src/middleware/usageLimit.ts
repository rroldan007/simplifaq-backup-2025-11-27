import { Request, Response, NextFunction } from 'express';
import { PrismaClient, User } from '@prisma/client';
import { SubscriptionService } from '../services/subscriptionService';
import { EntitlementsService } from '../services/entitlementsService';

const prisma = new PrismaClient();





// Check usage limits middleware
export const checkUsageLimit = (resourceType: 'invoices' | 'clients' | 'products' | 'storage' | 'quotes') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Non autorisé',
          },
        });
      }

      // Get user subscription with usage details
      const subscriptionData = await SubscriptionService.getSubscriptionWithUsage(req.user.id);

      if (!subscriptionData) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'NO_SUBSCRIPTION',
            message: 'Aucun abonnement actif trouvé',
          },
        });
      }

      const { currentUsage, limits } = subscriptionData;
      const currentResourceUsage = currentUsage[resourceType] || 0;
      const resourceLimit = limits[resourceType];

      // Check if user has reached the limit
      if (resourceLimit > 0 && currentResourceUsage >= resourceLimit) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'USAGE_LIMIT_EXCEEDED',
            message: `Limite d'utilisation atteinte pour ${resourceType}`,
            details: {
              resourceType,
              currentUsage: currentResourceUsage,
              limit: resourceLimit,
              planName: subscriptionData.plan.displayName,
            },
          },
        });
      }

      // Add usage info to request for potential tracking
      req.usageInfo = {
        subscriptionId: subscriptionData.id,
        resourceType,
        currentUsage: currentResourceUsage,
        limit: resourceLimit,
      };

      return next();
    } catch (error) {
      console.error('Usage limit check error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erreur interne du serveur',
        },
      });
    }
  };
};

// New: Check usage limits based on PlanEntitlement (Phase 2)
export const checkEntitlementLimit = (resourceType: 'invoices' | 'clients' | 'products' | 'storage' | 'quotes') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Non autorisé' },
        });
      }

      const snapshot = await EntitlementsService.getUsageSnapshot(req.user.id);
      const current = snapshot.currentUsage[resourceType] || 0;
      const limit = snapshot.entitlements.limits[resourceType];

      if (limit > 0 && current >= limit) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'USAGE_LIMIT_EXCEEDED',
            message: `Limite d'utilisation atteinte pour ${resourceType}`,
            details: {
              resourceType,
              currentUsage: current,
              limit,
              source: snapshot.entitlements.source,
            },
          },
        });
      }

      return next();
    } catch (error) {
      console.error('Entitlement limit check error:', error);
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' },
      });
    }
  };
};

// Track usage after successful operation
export const trackUsageAfterOperation = (resourceType: 'invoices' | 'clients' | 'products' | 'storage' | 'quotes') => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Store original res.json to intercept response
    const originalJson = res.json;
    
    res.json = function(body: any) {
      // Track usage after successful response
      if (req.user && res.statusCode < 400) {
        setImmediate(async () => {
          try {
            // Get current count for the resource
            let currentCount = 0;
            
            switch (resourceType) {
              case 'invoices':
                currentCount = await prisma.invoice.count({
                  where: { 
                    userId: req.user!.id,
                    createdAt: {
                      gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    },
                  },
                });
                break;
                
              case 'quotes':
                // Quotes are now invoices with isQuote=true
                currentCount = await prisma.invoice.count({
                  where: { 
                    userId: req.user!.id,
                    isQuote: true,
                    createdAt: {
                      gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    },
                  },
                });
                break;
                
              case 'clients':
                currentCount = await prisma.client.count({
                  where: { userId: req.user!.id, isActive: true },
                });
                break;
                
              case 'products':
                currentCount = await prisma.product.count({
                  where: { userId: req.user!.id, isActive: true },
                });
                break;
                
              case 'storage':
                // This would need to be calculated based on actual file sizes
                // For now, we'll use a placeholder
                currentCount = 0;
                break;
            }

            // Track the usage
            await SubscriptionService.trackUsage({
              userId: req.user!.id,
              resourceType,
              quantity: currentCount,
            });
          } catch (error) {
            console.error('Usage tracking error:', error);
          }
        });
      }
      
      return originalJson.call(this, body);
    };
    
    return next();
  };
};

// Check feature access based on plan
export const checkFeatureAccess = (feature: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Non autorisé',
          },
        });
      }

      // Get user subscription
      const subscription = await prisma.subscription.findUnique({
        where: { userId: req.user.id },
        include: { plan: true },
      });

      if (!subscription) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'NO_SUBSCRIPTION',
            message: 'Aucun abonnement actif trouvé',
          },
        });
      }

      const plan = subscription.plan;
      let hasAccess = false;

      // Check feature access based on plan
      switch (feature) {
        case 'email_support':
          hasAccess = plan.hasEmailSupport;
          break;
        case 'priority_support':
          hasAccess = plan.hasPrioritySupport;
          break;
        case 'advanced_reports':
          hasAccess = plan.hasAdvancedReports;
          break;
        case 'api_access':
          hasAccess = plan.hasApiAccess;
          break;
        case 'custom_branding':
          hasAccess = plan.hasCustomBranding;
          break;
        case 'swiss_qr_bill':
          hasAccess = plan.hasSwissQRBill;
          break;
        case 'multi_currency':
          hasAccess = plan.hasMultiCurrency;
          break;
        case 'multi_language':
          hasAccess = plan.hasMultiLanguage;
          break;
        default:
          hasAccess = false;
      }

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FEATURE_NOT_AVAILABLE',
            message: `Cette fonctionnalité n'est pas disponible avec votre plan ${plan.displayName}`,
            details: {
              feature,
              plan: plan.displayName,
            },
          },
        });
      }

      return next();
    } catch (error) {
      console.error('Feature access check error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erreur interne du serveur',
        },
      });
    }
  };
};

// Middleware to add subscription info to request
export const addSubscriptionInfo = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
  try {
    if (!req.user) {
      return next();
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: req.user.id },
      include: { plan: true },
    });

    if (subscription) {
      req.subscription = {
        id: subscription.id,
        planName: subscription.plan.name,
        status: subscription.status,
        features: {
          hasEmailSupport: subscription.plan.hasEmailSupport,
          hasPrioritySupport: subscription.plan.hasPrioritySupport,
          hasAdvancedReports: subscription.plan.hasAdvancedReports,
          hasApiAccess: subscription.plan.hasApiAccess,
          hasCustomBranding: subscription.plan.hasCustomBranding,
          hasSwissQRBill: subscription.plan.hasSwissQRBill,
          hasMultiCurrency: subscription.plan.hasMultiCurrency,
          hasMultiLanguage: subscription.plan.hasMultiLanguage,
        },
        limits: {
          maxInvoicesPerMonth: subscription.plan.maxInvoicesPerMonth,
          maxClientsTotal: subscription.plan.maxClientsTotal,
          maxProductsTotal: subscription.plan.maxProductsTotal,
          storageLimit: subscription.plan.storageLimit,
        },
      };
    }

    return next();
  } catch (error) {
    console.error('Add subscription info error:', error);
    return next(); // Continue even if there's an error
  }
};

// Extend Request interface duplicated earlier; removing redundant declaration to prevent conflicts