import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Récupère toutes les notifications pour l'utilisateur authentifié.
 */
export const getNotifications = async (req: Request, res: Response) => {
  // Le middleware 'authenticateToken' a déjà attaché l'objet utilisateur.
  // Nous y accédons en sachant qu'il est présent.
  const userId = (req as any).user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Utilisateur non authentifié.' });
  }

  try {
    // TODO: Notification model not yet in schema.dev.prisma
    // const notifications = await prisma.notification.findMany({
    //   where: { userId: userId },
    //   orderBy: { createdAt: 'desc' },
    //   take: 50,
    // });

    return res.status(200).json([]);
  } catch (error) {
    console.error("Erreur lors de la récupération des notifications:", error);
    return res.status(500).json({ message: 'Erreur serveur interne.' });
  }
};

/**
 * Marque une notification spécifique comme lue.
 */
export const markAsRead = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const { id } = req.params;

  if (!userId) {
    return res.status(401).json({ message: 'Utilisateur non authentifié.' });
  }

  try {
    // TODO: Notification model not yet in schema.dev.prisma
    // const notification = await prisma.notification.findFirst({
    //     where: { id: id, userId: userId }
    // });

    // if (!notification) {
    //     return res.status(404).json({ message: 'Notification non trouvée.' });
    // }

    // const updatedNotification = await prisma.notification.update({
    //   where: {
    //     id: id,
    //   },
    //   data: { isRead: true },
    // });

    return res.status(200).json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la notification:", error);
    return res.status(500).json({ message: 'Erreur serveur interne.' });
  }
};
