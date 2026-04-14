import { Router } from 'express';
import { VendorController } from '../controllers/vendor.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { vendorResponseDto } from '../dto/vendor.dto';

export const vendorRoutes = Router();

vendorRoutes.use(authenticate, authorize('VENDOR'));
vendorRoutes.get('/orders', VendorController.getIncomingOrders);
vendorRoutes.put('/orders/items/:itemId/respond', validate(vendorResponseDto), VendorController.respondToItem);
