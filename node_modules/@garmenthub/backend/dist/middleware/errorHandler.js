"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const multer_1 = __importDefault(require("multer"));
const client_1 = require("@prisma/client");
const errors_1 = require("../utils/errors");
const zod_1 = require("zod");
function errorHandler(err, _req, res, _next) {
    if (err instanceof errors_1.AppError) {
        return res.status(err.statusCode).json({
            success: false,
            error: err.message,
            details: err.details,
        });
    }
    if (err instanceof zod_1.ZodError) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
        });
    }
    if (err instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
            return res.status(409).json({
                success: false,
                error: 'A record with this value already exists',
            });
        }
    }
    if (err instanceof multer_1.default.MulterError) {
        const msg = err.code === 'LIMIT_FILE_SIZE'
            ? 'Each image must be 5MB or smaller'
            : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE'
                ? 'Too many images (max 10 per upload)'
                : err.message;
        return res.status(400).json({ success: false, error: msg });
    }
    if (err.message === 'Only image files are allowed') {
        return res.status(400).json({ success: false, error: err.message });
    }
    console.error('Unhandled error:', err);
    return res.status(500).json({
        success: false,
        error: 'Internal server error',
    });
}
//# sourceMappingURL=errorHandler.js.map