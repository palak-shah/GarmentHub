import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
export interface AuthPayload {
    userId: string;
    role: Role;
}
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                role: Role;
                phone: string;
                name: string;
            };
        }
    }
}
export declare function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void>;
export declare function authorize(...roles: Role[]): (req: Request, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map