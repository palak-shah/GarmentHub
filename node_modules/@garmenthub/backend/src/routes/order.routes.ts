import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createOrderDto, modifyOrderItemsDto, traderAdjustOrderDto } from '../dto/order.dto';
import { traderCounterPriceDto } from '../dto/negotiation.dto';

export const orderRoutes = Router();

orderRoutes.use(authenticate);
orderRoutes.post('/', authorize('CUSTOMER'), validate(createOrderDto), OrderController.create);
orderRoutes.get('/', OrderController.list);
orderRoutes.get('/trader/alerts', authorize('TRADER'), OrderController.traderAlerts);
orderRoutes.put(
  '/items/:itemId/counter-price',
  authorize('TRADER'),
  validate(traderCounterPriceDto),
  OrderController.setTraderCounterPrice,
);
/* Static path segments before `/:id` only applies to different methods; keep literal suffixes grouped for clarity. */
orderRoutes.post('/:id/cancel', authorize('CUSTOMER'), OrderController.cancel);
orderRoutes.post('/:id/confirm', authorize('CUSTOMER'), OrderController.confirm);
orderRoutes.post('/:id/take-control', authorize('TRADER'), OrderController.takeControl);
orderRoutes.post('/:id/release-to-vendors', authorize('TRADER'), OrderController.releaseToVendors);
orderRoutes.post(
  '/:id/trader-adjust',
  authorize('TRADER'),
  validate(traderAdjustOrderDto),
  OrderController.traderAdjust,
);
orderRoutes.post(
  '/:id/modify',
  authorize('CUSTOMER'),
  validate(modifyOrderItemsDto),
  OrderController.modifyItems,
);
orderRoutes.get('/:id', OrderController.getById);
