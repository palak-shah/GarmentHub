import { Router } from 'express';
import { VendorController } from '../controllers/vendor.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { vendorResponseDto } from '../dto/vendor.dto';
import {
  createVendorCategoryAttributeDto,
  updateVendorCategoryAttributeDto,
} from '../dto/category.dto';

export const vendorRoutes = Router();

vendorRoutes.use(authenticate, authorize('VENDOR'));

vendorRoutes.get('/orders', VendorController.getIncomingOrders);
vendorRoutes.put('/orders/items/:itemId/respond', validate(vendorResponseDto), VendorController.respondToItem);

vendorRoutes.get('/categories', VendorController.listCategories);
vendorRoutes.post(
  '/categories/:categoryId/attributes',
  validate(createVendorCategoryAttributeDto),
  VendorController.createVendorAttribute,
);
vendorRoutes.put(
  '/categories/:categoryId/attributes/:attributeId',
  validate(updateVendorCategoryAttributeDto),
  VendorController.updateVendorAttribute,
);
vendorRoutes.delete(
  '/categories/:categoryId/attributes/:attributeId',
  VendorController.deleteVendorAttribute,
);
