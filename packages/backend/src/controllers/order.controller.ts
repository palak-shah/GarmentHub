import { Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/order.service';
import { success, created } from '../utils/apiResponse';
import { ForbiddenError } from '../utils/errors';

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
      } else if (role === 'TRADER') {
        orders = await OrderService.listForTrader(req.user!.id);
      } else {
        orders = await OrderService.listForCustomer(req.user!.id);
      }
      success(res, orders);
    } catch (err) { next(err); }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await OrderService.getById(req.params.id);
      const u = req.user!;
      if (u.role === 'TRADER' && order.traderId !== u.id) {
        throw new ForbiddenError('Not your order');
      }
      if (u.role === 'CUSTOMER' && order.customerId !== u.id) {
        throw new ForbiddenError('Not your order');
      }
      success(res, order);
    } catch (err) { next(err); }
  }

  static async confirm(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await OrderService.confirmOrder(req.params.id, req.user!.id);
      success(res, order, 'Order confirmed');
    } catch (err) { next(err); }
  }

  static async modifyItems(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await OrderService.modifyOrderItems(req.params.id, req.user!.id, req.body);
      success(res, order, 'Order updated');
    } catch (err) { next(err); }
  }

  static async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await OrderService.cancelOrder(req.params.id, req.user!.id);
      success(res, order, 'Order cancelled');
    } catch (err) { next(err); }
  }

  static async traderAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      const alerts = await OrderService.getTraderAlerts(req.user!.id);
      success(res, alerts);
    } catch (err) { next(err); }
  }

  static async takeControl(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await OrderService.takeControl(req.params.id, req.user!.id);
      success(res, order, 'Taken control');
    } catch (err) { next(err); }
  }

  static async setTraderCounterPrice(req: Request, res: Response, next: NextFunction) {
    try {
      const item = await OrderService.setTraderCounterPrice(req.params.itemId, req.user!.id, req.body.unitPrice);
      success(res, item, 'Counter price saved');
    } catch (err) { next(err); }
  }

  static async releaseToVendors(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await OrderService.releaseOrderToVendors(req.params.id, req.user!.id);
      success(res, order, 'Sent to vendors');
    } catch (err) { next(err); }
  }

  static async traderAdjust(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await OrderService.traderAdjustOrder(req.params.id, req.user!.id, req.body);
      success(res, order, 'Order updated');
    } catch (err) { next(err); }
  }
}
