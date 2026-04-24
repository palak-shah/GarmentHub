"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BadRequestError = exports.ConflictError = exports.ForbiddenError = exports.UnauthorizedError = exports.NotFoundError = exports.AppError = void 0;
class AppError extends Error {
    statusCode;
    details;
    constructor(statusCode, message, details) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(404, `${resource} not found`);
    }
}
exports.NotFoundError = NotFoundError;
class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(401, message);
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') {
        super(403, message);
    }
}
exports.ForbiddenError = ForbiddenError;
class ConflictError extends AppError {
    constructor(message) {
        super(409, message);
    }
}
exports.ConflictError = ConflictError;
class BadRequestError extends AppError {
    constructor(message, details) {
        super(400, message, details);
    }
}
exports.BadRequestError = BadRequestError;
//# sourceMappingURL=errors.js.map