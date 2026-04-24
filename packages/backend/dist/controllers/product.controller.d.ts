import { Request, Response, NextFunction } from 'express';
export declare class ProductController {
    static list(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getById(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getMyProducts(req: Request, res: Response, next: NextFunction): Promise<void>;
    static create(req: Request, res: Response, next: NextFunction): Promise<void>;
    static update(req: Request, res: Response, next: NextFunction): Promise<void>;
    static delete(req: Request, res: Response, next: NextFunction): Promise<void>;
    static bulkDelete(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getCategories(_req: Request, res: Response, next: NextFunction): Promise<void>;
    static getFilterOptions(_req: Request, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=product.controller.d.ts.map