import { Router } from 'express';
import { BrandController } from '../controllers/brand.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createBrandDto, updateBrandDto } from '../dto/brand.dto';

export const brandRoutes = Router();

brandRoutes.get('/', BrandController.listAll);
brandRoutes.get('/my', authenticate, authorize('VENDOR'), BrandController.listMy);
brandRoutes.post('/', authenticate, authorize('VENDOR'), validate(createBrandDto), BrandController.create);
brandRoutes.put('/:id', authenticate, authorize('VENDOR'), validate(updateBrandDto), BrandController.update);
brandRoutes.delete('/:id', authenticate, authorize('VENDOR'), BrandController.delete);
