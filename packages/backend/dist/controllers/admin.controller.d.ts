import { Request, Response, NextFunction } from 'express';
export declare class AdminController {
    static getUsers(req: Request, res: Response, next: NextFunction): Promise<void>;
    static toggleUserStatus(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getAllOrders(_req: Request, res: Response, next: NextFunction): Promise<void>;
    static getStats(_req: Request, res: Response, next: NextFunction): Promise<void>;
    static listCategories(_req: Request, res: Response, next: NextFunction): Promise<void>;
    static createCategory(req: Request, res: Response, next: NextFunction): Promise<void>;
    static updateCategory(req: Request, res: Response, next: NextFunction): Promise<void>;
    static deleteCategory(req: Request, res: Response, next: NextFunction): Promise<void>;
    static createCategoryAttribute(req: Request, res: Response, next: NextFunction): Promise<void>;
    static updateCategoryAttribute(req: Request, res: Response, next: NextFunction): Promise<void>;
    static deleteCategoryAttribute(req: Request, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=admin.controller.d.ts.map