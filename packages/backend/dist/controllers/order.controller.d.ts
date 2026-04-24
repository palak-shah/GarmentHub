import { Request, Response, NextFunction } from 'express';
export declare class OrderController {
    static create(req: Request, res: Response, next: NextFunction): Promise<void>;
    static list(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getById(req: Request, res: Response, next: NextFunction): Promise<void>;
    static confirm(req: Request, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=order.controller.d.ts.map