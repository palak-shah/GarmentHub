import { Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/order.service';
import { success, created } from '../utils/apiResponse';

export class OrderController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await OrderService.create(req.user!.id, req.body);
      created(res, order, 'Order placed');
    } catch (err) { next(err); }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const role = req.user!.role;
      let orders;
      if (role === 'VENDOR') {
        orders = await OrderService.listForVendor(req.user!.id);
      } else {
        orders = await OrderService.listForCustomer(req.user!.id);
      }
      success(res, orders);
    } catch (err) { next(err); }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await OrderService.getById(req.params.id);
      success(res, order);
    } catch (err) { next(err); }
  }

  static async confirm(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await OrderService.confirmOrder(req.params.id, req.user!.id);
      success(res, order, 'Order confirmed');
    } catch (err) { next(err); }
  }
}
