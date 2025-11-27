import { Request, Response } from 'express';
import { prisma } from '../services/database';

/**
 * Create new feedback from beta users
 */
export const createFeedback = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const {
      email,
      secteur,
      secteurAutre,
      realisations,
      simplicite,
      probleme,
      detailProbleme,
      amelioration
    } = req.body;

    // Validation
    if (!email || !secteur || !realisations || !Array.isArray(realisations) || 
        !simplicite || probleme === null || probleme === undefined) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Champs obligatoires manquants'
        }
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_EMAIL',
          message: 'Format d\'email invalide'
        }
      });
    }

    // Validate simplicite range (1-5)
    if (simplicite < 1 || simplicite > 5) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_RATING',
          message: 'La note doit être entre 1 et 5'
        }
      });
    }

    // Validate "Autre" secteur
    if (secteur === 'Autre' && !secteurAutre?.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_SECTEUR_AUTRE',
          message: 'Veuillez préciser votre secteur d\'activité'
        }
      });
    }

    // Try to find user by email (optional relation)
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true }
    });

    // Create feedback
    const feedback = await prisma.feedback.create({
      data: {
        userId: user?.id || null,
        email: email.trim().toLowerCase(),
        secteur,
        secteurAutre: secteurAutre?.trim() || null,
        realisations,
        simplicite: parseInt(simplicite.toString()),
        probleme: Boolean(probleme),
        detailProbleme: detailProbleme?.trim() || null,
        amelioration: amelioration?.trim() || null,
      },
    });

    console.log(`✅ Feedback reçu de ${email} - ID: ${feedback.id}`);

    return res.status(201).json({
      success: true,
      data: {
        id: feedback.id,
        message: 'Feedback enregistré avec succès'
      }
    });

  } catch (error) {
    console.error('❌ Error creating feedback:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur lors de l\'enregistrement du feedback'
      }
    });
  }
};

/**
 * Get all feedbacks (Admin only)
 */
export const getAllFeedbacks = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { page = '1', limit = '50', secteur, probleme } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filters
    const where: any = {};

    if (secteur) {
      where.secteur = secteur as string;
    }

    if (probleme !== undefined) {
      where.probleme = probleme === 'true';
    }

    // Get feedbacks with pagination
    const [feedbacks, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.feedback.count({ where }),
    ]);

    return res.json({
      success: true,
      data: {
        feedbacks,
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalCount: total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });

  } catch (error) {
    console.error('Get feedbacks error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur lors de la récupération des feedbacks'
      }
    });
  }
};

/**
 * Delete feedback by email (GDPR/LPD compliance)
 */
export const deleteFeedbackByEmail = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { email } = req.params;
    const { reason } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_EMAIL',
          message: 'Email requis'
        }
      });
    }

    // Delete feedbacks and log the deletion
    const [deletedFeedbacks, deletionLog] = await Promise.all([
      prisma.feedback.deleteMany({
        where: { email: email.toLowerCase() }
      }),
      prisma.feedbackDeletionLog.create({
        data: {
          email: email.toLowerCase(),
          reason: reason || 'User request'
        }
      })
    ]);

    console.log(`✅ Feedback de ${email} supprimé (${deletedFeedbacks.count} entrées)`);

    return res.json({
      success: true,
      data: {
        deletedCount: deletedFeedbacks.count,
        message: 'Feedback supprimé avec succès'
      }
    });

  } catch (error) {
    console.error('Delete feedback error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur lors de la suppression du feedback'
      }
    });
  }
};

/**
 * Get feedback statistics (Admin only)
 */
export const getFeedbackStats = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const [
      total,
      averageSimplicite,
      withProblems,
      secteurStats,
      realisationsStats
    ] = await Promise.all([
      prisma.feedback.count(),
      prisma.feedback.aggregate({
        _avg: { simplicite: true }
      }),
      prisma.feedback.count({ where: { probleme: true } }),
      prisma.feedback.groupBy({
        by: ['secteur'],
        _count: true
      }),
      prisma.feedback.findMany({
        select: { realisations: true }
      })
    ]);

    // Count realisation occurrences
    const realisationCounts: { [key: string]: number } = {};
    realisationsStats.forEach(feedback => {
      feedback.realisations.forEach(r => {
        realisationCounts[r] = (realisationCounts[r] || 0) + 1;
      });
    });

    return res.json({
      success: true,
      data: {
        total,
        averageSimplicite: averageSimplicite._avg.simplicite || 0,
        withProblems,
        problemRate: total > 0 ? ((withProblems / total) * 100).toFixed(2) : 0,
        secteurs: secteurStats.map(s => ({
          secteur: s.secteur,
          count: s._count
        })),
        realisations: Object.entries(realisationCounts).map(([name, count]) => ({
          name,
          count
        })).sort((a, b) => b.count - a.count)
      }
    });

  } catch (error) {
    console.error('Get feedback stats error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erreur lors de la récupération des statistiques'
      }
    });
  }
};
