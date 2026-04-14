import { Request, Response, NextFunction } from 'express';
import { BrandService } from '../services/brand.service';
import { success, created } from '../utils/apiResponse';

export class BrandController {
  static async listMy(req: Request, res: Response, next: NextFunction) {
    try {
      const brands = await BrandService.listByVendor(req.user!.id);
      success(res, brands);
    } catch (err) { next(err); }
  }

  static async listAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const brands = await BrandService.listAll();
      success(res, brands);
    } catch (err) { next(err); }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const brand = await BrandService.create(req.user!.id, req.body);
      created(res, brand, 'Brand created');
    } catch (err) { next(err); }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const brand = await BrandService.update(req.params.id, req.user!.id, req.body);
      success(res, brand, 'Brand updated');
    } catch (err) { next(err); }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await BrandService.delete(req.params.id, req.user!.id);
      success(res, null, 'Brand deleted');
    } catch (err) { next(err); }
  }
}
