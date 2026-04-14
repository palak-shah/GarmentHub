import { Request, Response, NextFunction } from 'express';
import { ProductService } from '../services/product.service';
import { productQueryDto } from '../dto/product.dto';
import { success, created } from '../utils/apiResponse';

export class ProductController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = productQueryDto.parse(req.query);
      const result = await ProductService.list(query);
      success(res, result);
    } catch (err) { next(err); }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await ProductService.getById(req.params.id);
      success(res, product);
    } catch (err) { next(err); }
  }

  static async getMyProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const products = await ProductService.getByVendor(req.user!.id);
      success(res, products);
    } catch (err) { next(err); }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await ProductService.create(req.user!.id, req.body);
      created(res, product, 'Product created');
    } catch (err) { next(err); }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await ProductService.update(req.params.id, req.user!.id, req.body);
      success(res, product, 'Product updated');
    } catch (err) { next(err); }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await ProductService.delete(req.params.id, req.user!.id);
      success(res, null, 'Product deleted');
    } catch (err) { next(err); }
  }

  static async bulkDelete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ProductService.bulkDelete(req.body.ids, req.user!.id);
      success(res, result, `${result.deleted} product(s) deleted`);
    } catch (err) { next(err); }
  }

  static async getCategories(_req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await ProductService.getCategories();
      success(res, categories);
    } catch (err) { next(err); }
  }

  static async getFilterOptions(_req: Request, res: Response, next: NextFunction) {
    try {
      const options = await ProductService.getFilterOptions();
      success(res, options);
    } catch (err) { next(err); }
  }
}
