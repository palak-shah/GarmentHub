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
productRoutes.get('/feed', authenticate, ProductController.feed);
productRoutes.get('/saved', authenticate, ProductController.getSavedProducts);
productRoutes.post('/save', authenticate, ProductController.saveProduct);
productRoutes.delete('/save/:productId', authenticate, ProductController.unsaveProduct);
/** Must be before `/:id` — otherwise PUT /bulk-update is handled as update(id=bulk-update). */
productRoutes.post('/bulk-delete', authenticate, authorize('VENDOR'), ProductController.bulkDelete);
productRoutes.put('/bulk-update', authenticate, authorize('VENDOR'), ProductController.bulkUpdate);
productRoutes.get('/:id', ProductController.getById);
productRoutes.post('/', authenticate, authorize('VENDOR'), validate(createProductDto), ProductController.create);
productRoutes.put('/:id', authenticate, authorize('VENDOR'), validate(updateProductDto), ProductController.update);
productRoutes.delete('/:id', authenticate, authorize('VENDOR'), ProductController.delete);
