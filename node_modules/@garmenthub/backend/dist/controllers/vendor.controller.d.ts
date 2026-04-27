import { Request, Response, NextFunction } from 'express';
export declare class VendorController {
    static getIncomingOrders(req: Request, res: Response, next: NextFunction): Promise<void>;
    static respondToItem(req: Request, res: Response, next: NextFunction): Promise<void>;
    static listCategories(req: Request, res: Response, next: NextFunction): Promise<void>;
    static createVendorAttribute(req: Request, res: Response, next: NextFunction): Promise<void>;
    static updateVendorAttribute(req: Request, res: Response, next: NextFunction): Promise<void>;
    static deleteVendorAttribute(req: Request, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=vendor.controller.d.ts.map