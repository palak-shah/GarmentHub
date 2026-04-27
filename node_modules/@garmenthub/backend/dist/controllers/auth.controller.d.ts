import { Request, Response, NextFunction } from 'express';
export declare class AuthController {
    static sendOtp(req: Request, res: Response, next: NextFunction): Promise<void>;
    static verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getProfile(req: Request, res: Response, next: NextFunction): Promise<void>;
    static updateProfile(req: Request, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=auth.controller.d.ts.map