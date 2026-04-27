import { prisma } from '../config/db';

const pendingBatches = new Map<string, { vendorName: string; count: number; timer: ReturnType<typeof setTimeout> }>();
const BATCH_DELAY_MS = 60_000;

export class NotificationService {
  /** `type` is stored as a free-form string in the DB (e.g. ORDER_MODIFIED, ORDER_CANCELLED). */
  static async create(userId: string, type: string, title: string, body: string, referenceId?: string) {
    const notification = await prisma.notification.create({
      data: { userId, type, title, body, referenceId },
    });

    console.log(`[NOTIFICATION] To: ${userId} | Type: ${type} | ${title}`);

    return notification;
  }

  /**
   * Batch-notify followers when a vendor uploads products.
   * Accumulates uploads within a window and sends one notification like
   * "Vendor XYZ uploaded 25 items" instead of one per product.
   */
  static async queueProductUploadNotification(vendorId: string, vendorName: string) {
    const key = vendorId;
    const existing = pendingBatches.get(key);

    if (existing) {
      existing.count++;
      return;
    }

    pendingBatches.set(key, {
      vendorName,
      count: 1,
      timer: setTimeout(() => {
        NotificationService.flushUploadBatch(vendorId);
      }, BATCH_DELAY_MS),
    });
  }

  static async flushUploadBatch(vendorId: string) {
    const batch = pendingBatches.get(vendorId);
    if (!batch) return;
    pendingBatches.delete(vendorId);

    const followers = await prisma.connection.findMany({
      where: { followingId: vendorId },
      select: { followerId: true },
    });

    if (followers.length === 0) return;

    const title = 'New products';
    const body = `${batch.vendorName} uploaded ${batch.count} item${batch.count > 1 ? 's' : ''}`;

    await Promise.all(
      followers.map((f) =>
        NotificationService.create(f.followerId, 'NEW_PRODUCTS', title, body, vendorId),
      ),
    );
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
