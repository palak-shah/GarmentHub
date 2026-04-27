import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createCategoryDto,
  updateCategoryDto,
  createCategoryAttributeDto,
  updateCategoryAttributeDto,
} from '../dto/category.dto';

export const adminRoutes = Router();

adminRoutes.use(authenticate, authorize('ADMIN'));

adminRoutes.get('/users', AdminController.getUsers);
adminRoutes.put('/users/:id', AdminController.toggleUserStatus);
adminRoutes.get('/orders', AdminController.getAllOrders);
adminRoutes.get('/stats', AdminController.getStats);

adminRoutes.get('/categories', AdminController.listCategories);
adminRoutes.post('/categories', validate(createCategoryDto), AdminController.createCategory);
adminRoutes.put('/categories/:id', validate(updateCategoryDto), AdminController.updateCategory);
adminRoutes.delete('/categories/:id', AdminController.deleteCategory);
adminRoutes.post(
  '/categories/:categoryId/attributes',
  validate(createCategoryAttributeDto),
  AdminController.createCategoryAttribute,
);
adminRoutes.put(
  '/categories/:categoryId/attributes/:attributeId',
  validate(updateCategoryAttributeDto),
  AdminController.updateCategoryAttribute,
);
adminRoutes.delete('/categories/:categoryId/attributes/:attributeId', AdminController.deleteCategoryAttribute);
