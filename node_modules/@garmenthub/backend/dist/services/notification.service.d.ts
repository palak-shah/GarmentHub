type NotificationType = 'ORDER_PLACED' | 'VENDOR_RESPONSE' | 'ORDER_CONFIRMED' | 'REMINDER';
export declare class NotificationService {
    static create(userId: string, type: NotificationType, title: string, body: string, referenceId?: string): Promise<{
        id: string;
        createdAt: Date;
        type: string;
        userId: string;
        title: string;
        body: string;
        referenceId: string | null;
        isRead: boolean;
    }>;
    static getByUser(userId: string, unreadOnly?: boolean): Promise<{
        id: string;
        createdAt: Date;
        type: string;
        userId: string;
        title: string;
        body: string;
        referenceId: string | null;
        isRead: boolean;
    }[]>;
    static markRead(id: string, userId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    static markAllRead(userId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
}
export {};
//# sourceMappingURL=notification.service.d.ts.map