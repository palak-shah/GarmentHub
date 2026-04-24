import { Response } from 'express';
export declare function success(res: Response, data?: unknown, message?: string, status?: number): Response<any, Record<string, any>>;
export declare function created(res: Response, data: unknown, message?: string): Response<any, Record<string, any>>;
export declare function fail(res: Response, error: string, status?: number, details?: unknown): Response<any, Record<string, any>>;
//# sourceMappingURL=apiResponse.d.ts.map