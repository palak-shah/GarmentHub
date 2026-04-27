import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { NotificationController } from '../controllers/notification.controller';

const router = Router();

router.use(authenticate);

router.get('/', NotificationController.list);
router.get('/unread-count', NotificationController.unreadCount);
router.put('/:id/read', NotificationController.markRead);
router.put('/read-all', NotificationController.markAllRead);

export const notificationRoutes = router;
