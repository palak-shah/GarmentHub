import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../services/admin.service';
import { success, created } from '../utils/apiResponse';

export class AdminController {
  static async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await AdminService.getUsers(req.query.role as string | undefined);
      success(res, users);
    } catch (err) { next(err); }
  }

  static async toggleUserStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await AdminService.toggleUserStatus(req.params.id, req.body.isActive);
      success(res, user, 'User updated');
    } catch (err) { next(err); }
  }

  static async getAllOrders(_req: Request, res: Response, next: NextFunction) {
    try {
      const orders = await AdminService.getAllOrders();
      success(res, orders);
    } catch (err) { next(err); }
  }

  static async getStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await AdminService.getStats();
      success(res, stats);
    } catch (err) { next(err); }
  }

  static async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await AdminService.createCategory(req.body.name);
      created(res, category, 'Category created');
    } catch (err) { next(err); }
  }

  static async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await AdminService.updateCategory(req.params.id, req.body.name);
      success(res, category, 'Category updated');
    } catch (err) { next(err); }
  }

  static async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      await AdminService.deleteCategory(req.params.id);
      success(res, null, 'Category deleted');
    } catch (err) { next(err); }
  }
}
