import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createOrderDto } from '../dto/order.dto';

export const orderRoutes = Router();

orderRoutes.use(authenticate);
orderRoutes.post('/', authorize('CUSTOMER'), validate(createOrderDto), OrderController.create);
orderRoutes.get('/', OrderController.list);
orderRoutes.get('/:id', OrderController.getById);
orderRoutes.post('/:id/confirm', authorize('CUSTOMER'), OrderController.confirm);
