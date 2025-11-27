import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { featureFlags } from '../features/featureFlags';

const router = Router();

/**
 * GET /api/tva-rates/cantons
 * Get list of available cantons with TVA rates
 */
router.get('/cantons', authenticateToken, (req, res) => {
  try {
    const cantons = featureFlags.getTvaCantons();
    res.json({
      success: true,
      data: {
        cantons,
        defaultCanton: featureFlags.getValue('tvaRates.defaultCanton', 'GE')
      }
    });
  } catch (error: any) {
    console.error('Error fetching TVA cantons:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TVARATES_ERROR',
        message: 'Error al obtener los cantones con tasas de TVA'
      }
    });
  }
});

/**
 * GET /api/tva-rates/:cantonCode
 * Get TVA rates for a specific canton
 */
router.get('/:cantonCode', authenticateToken, (req, res) => {
  try {
    const { cantonCode } = req.params;
    const rates = featureFlags.getTvaRates(cantonCode);
    
    if (rates.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'No se encontraron tasas de TVA para el cantón especificado'
        }
      });
    }

    res.json({
      success: true,
      data: {
        canton: cantonCode,
        rates,
        defaultRate: featureFlags.getDefaultTvaRate(cantonCode)
      }
    });
  } catch (error: any) {
    console.error('Error fetching TVA rates:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'TVARATES_ERROR',
        message: 'Error al obtener las tasas de TVA'
      }
    });
  }
});

export default router;
