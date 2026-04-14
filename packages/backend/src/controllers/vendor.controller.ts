import { Request, Response, NextFunction } from 'express';
import { VendorService } from '../services/vendor.service';
import { OrderService } from '../services/order.service';
import { success } from '../utils/apiResponse';

export class VendorController {
  static async getIncomingOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const items = await OrderService.listForVendor(req.user!.id);
      success(res, items);
    } catch (err) { next(err); }
  }

  static async respondToItem(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await VendorService.respondToItem(req.params.itemId, req.user!.id, req.body);
      success(res, result, 'Response recorded');
    } catch (err) { next(err); }
  }
}
