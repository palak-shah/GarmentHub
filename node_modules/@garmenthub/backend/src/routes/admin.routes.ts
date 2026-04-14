import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth';

export const adminRoutes = Router();

adminRoutes.use(authenticate, authorize('ADMIN'));

adminRoutes.get('/users', AdminController.getUsers);
adminRoutes.put('/users/:id', AdminController.toggleUserStatus);
adminRoutes.get('/orders', AdminController.getAllOrders);
adminRoutes.get('/stats', AdminController.getStats);
adminRoutes.post('/categories', AdminController.createCategory);
adminRoutes.put('/categories/:id', AdminController.updateCategory);
adminRoutes.delete('/categories/:id', AdminController.deleteCategory);
