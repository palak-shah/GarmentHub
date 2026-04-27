import { Request, Response, NextFunction } from 'express';
import { VendorService } from '../services/vendor.service';
import { OrderService } from '../services/order.service';
import { CatalogService } from '../services/catalog.service';
import { success, created } from '../utils/apiResponse';

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

  static async bulkRespondToItems(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await VendorService.bulkRespondToItems(req.user!.id, req.body);
      success(res, result, 'Responses recorded');
    } catch (err) { next(err); }
  }

  static async respondToTraderPrice(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await VendorService.respondToTraderPrice(req.params.itemId, req.user!.id, req.body);
      success(res, result, 'Price response recorded');
    } catch (err) { next(err); }
  }

  static async listCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await CatalogService.listCategoriesForVendor(req.user!.id);
      success(res, categories);
    } catch (err) { next(err); }
  }

  static async createVendorAttribute(req: Request, res: Response, next: NextFunction) {
    try {
      const row = await CatalogService.createVendorAttribute(
        req.user!.id,
        req.params.categoryId,
        req.body.name,
        req.body.sortOrder,
      );
      created(res, row, 'Attribute created');
    } catch (err) { next(err); }
  }

  static async updateVendorAttribute(req: Request, res: Response, next: NextFunction) {
    try {
      const row = await CatalogService.updateVendorAttribute(
        req.user!.id,
        req.params.categoryId,
        req.params.attributeId,
        req.body,
      );
      success(res, row, 'Attribute updated');
    } catch (err) { next(err); }
  }

  static async deleteVendorAttribute(req: Request, res: Response, next: NextFunction) {
    try {
      await CatalogService.deleteVendorAttribute(
        req.user!.id,
        req.params.categoryId,
        req.params.attributeId,
      );
      success(res, null, 'Attribute deleted');
    } catch (err) { next(err); }
  }
}
