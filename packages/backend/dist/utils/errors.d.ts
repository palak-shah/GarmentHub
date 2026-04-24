export declare class AppError extends Error {
    statusCode: number;
    details?: unknown | undefined;
    constructor(statusCode: number, message: string, details?: unknown | undefined);
}
export declare class NotFoundError extends AppError {
    constructor(resource?: string);
}
export declare class UnauthorizedError extends AppError {
    constructor(message?: string);
}
export declare class ForbiddenError extends AppError {
    constructor(message?: string);
}
export declare class ConflictError extends AppError {
    constructor(message: string);
}
export declare class BadRequestError extends AppError {
    constructor(message: string, details?: unknown);
}
//# sourceMappingURL=errors.d.ts.map