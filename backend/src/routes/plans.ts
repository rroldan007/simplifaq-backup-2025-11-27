import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

/**
 * GET /api/plans/public
 * Get all active plans (public endpoint - no authentication required)
 */
router.get('/public', async (_req: Request, res: Response) => {
  try {
    const plans = await prisma.plan.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        price: 'asc',
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
        price: true,
        currency: true,
        isActive: true,
        // Feature limits
        maxInvoicesPerMonth: true,
        maxClientsTotal: true,
        maxProductsTotal: true,
        storageLimit: true,
        // Core modules
        hasInvoices: true,
        hasQuotes: true,
        hasExpenses: true,
        // Advanced features
        hasAIAssistant: true,
        hasAdvancedReports: true,
        hasApiAccess: true,
        hasCustomBranding: true,
        // Multi features
        hasMultiUser: true,
        maxUsers: true,
        hasMultiCompany: true,
        maxCompanies: true,
        // Support
        hasEmailSupport: true,
        hasPrioritySupport: true,
        // Swiss features
        hasSwissQRBill: true,
        hasMultiCurrency: true,
        hasMultiLanguage: true,
      },
    });

    return res.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    console.error('Error fetching public plans:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur lors de la récupération des plans',
      },
    });
  }
});

/**
 * GET /api/plans/public/:id
 * Get a specific plan by ID (public endpoint - no authentication required)
 */
router.get('/public/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const plan = await prisma.plan.findUnique({
      where: {
        id,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
        price: true,
        currency: true,
        isActive: true,
        // Feature limits
        maxInvoicesPerMonth: true,
        maxClientsTotal: true,
        maxProductsTotal: true,
        storageLimit: true,
        // Core modules
        hasInvoices: true,
        hasQuotes: true,
        hasExpenses: true,
        // Advanced features
        hasAIAssistant: true,
        hasAdvancedReports: true,
        hasApiAccess: true,
        hasCustomBranding: true,
        // Multi features
        hasMultiUser: true,
        maxUsers: true,
        hasMultiCompany: true,
        maxCompanies: true,
        // Support
        hasEmailSupport: true,
        hasPrioritySupport: true,
        // Swiss features
        hasSwissQRBill: true,
        hasMultiCurrency: true,
        hasMultiLanguage: true,
      },
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Plan non trouvé',
        },
      });
    }

    return res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    console.error('Error fetching plan:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur lors de la récupération du plan',
      },
    });
  }
});

export default router;
