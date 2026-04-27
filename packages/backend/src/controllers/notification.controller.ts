import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service';
import { success } from '../utils/apiResponse';

export class NotificationController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const unreadOnly = req.query.unread === 'true';
      const notifications = await NotificationService.getByUser(req.user!.id, unreadOnly);
      success(res, notifications);
    } catch (err) { next(err); }
  }

  static async unreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const notifications = await NotificationService.getByUser(req.user!.id, true);
      success(res, { count: notifications.length });
    } catch (err) { next(err); }
  }

  static async markRead(req: Request, res: Response, next: NextFunction) {
    try {
      await NotificationService.markRead(req.params.id, req.user!.id);
      success(res, { ok: true });
    } catch (err) { next(err); }
  }

  static async markAllRead(req: Request, res: Response, next: NextFunction) {
    try {
      await NotificationService.markAllRead(req.user!.id);
      success(res, { ok: true });
    } catch (err) { next(err); }
  }
}
