"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const db_1 = require("../config/db");
class NotificationService {
    static async create(userId, type, title, body, referenceId) {
        const notification = await db_1.prisma.notification.create({
            data: { userId, type, title, body, referenceId },
        });
        // Future: integrate SMS / WhatsApp / Push here
        console.log(`[NOTIFICATION] To: ${userId} | Type: ${type} | ${title}`);
        return notification;
    }
    static async getByUser(userId, unreadOnly = false) {
        return db_1.prisma.notification.findMany({
            where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
    }
    static async markRead(id, userId) {
        return db_1.prisma.notification.updateMany({
            where: { id, userId },
            data: { isRead: true },
        });
    }
    static async markAllRead(userId) {
        return db_1.prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });
    }
}
exports.NotificationService = NotificationService;
//# sourceMappingURL=notification.service.js.map