import { Router } from 'express';
import { VendorController } from '../controllers/vendor.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { vendorResponseDto, vendorPriceCounterResponseDto, vendorBulkRespondDto } from '../dto/vendor.dto';
import {
  createVendorCategoryAttributeDto,
  updateVendorCategoryAttributeDto,
} from '../dto/category.dto';

export const vendorRoutes = Router();

vendorRoutes.use(authenticate, authorize('VENDOR'));

vendorRoutes.get('/orders', VendorController.getIncomingOrders);
vendorRoutes.post('/orders/items/bulk-respond', validate(vendorBulkRespondDto), VendorController.bulkRespondToItems);
vendorRoutes.put('/orders/items/:itemId/respond', validate(vendorResponseDto), VendorController.respondToItem);
vendorRoutes.put(
  '/orders/items/:itemId/price-counter',
  validate(vendorPriceCounterResponseDto),
  VendorController.respondToTraderPrice,
);

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
