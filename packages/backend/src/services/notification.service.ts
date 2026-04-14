import { prisma } from '../config/db';

type NotificationType = 'ORDER_PLACED' | 'VENDOR_RESPONSE' | 'ORDER_CONFIRMED' | 'REMINDER';

export class NotificationService {
  static async create(userId: string, type: NotificationType, title: string, body: string, referenceId?: string) {
    const notification = await prisma.notification.create({
      data: { userId, type, title, body, referenceId },
    });

    // Future: integrate SMS / WhatsApp / Push here
    console.log(`[NOTIFICATION] To: ${userId} | Type: ${type} | ${title}`);

    return notification;
  }

  static async getByUser(userId: string, unreadOnly = false) {
    return prisma.notification.findMany({
      where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  static async markRead(id: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  static async markAllRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}
