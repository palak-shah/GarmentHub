import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createProductDto, updateProductDto } from '../dto/product.dto';

export const productRoutes = Router();

productRoutes.get('/', ProductController.list);
productRoutes.get('/categories', ProductController.getCategories);
productRoutes.get('/filters', ProductController.getFilterOptions);
productRoutes.get('/my', authenticate, authorize('VENDOR'), ProductController.getMyProducts);
productRoutes.get('/:id', ProductController.getById);
productRoutes.post('/', authenticate, authorize('VENDOR'), validate(createProductDto), ProductController.create);
productRoutes.put('/:id', authenticate, authorize('VENDOR'), validate(updateProductDto), ProductController.update);
productRoutes.post('/bulk-delete', authenticate, authorize('VENDOR'), ProductController.bulkDelete);
productRoutes.delete('/:id', authenticate, authorize('VENDOR'), ProductController.delete);
