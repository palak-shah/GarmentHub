"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.authorize = authorize;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const db_1 = require("../config/db");
const errors_1 = require("../utils/errors");
async function authenticate(req, _res, next) {
    try {
        const header = req.headers.authorization;
        if (!header?.startsWith('Bearer ')) {
            throw new errors_1.UnauthorizedError('No token provided');
        }
        const token = header.slice(7);
        const payload = jsonwebtoken_1.default.verify(token, env_1.env.jwtSecret);
        const user = await db_1.prisma.user.findUnique({
            where: { id: payload.userId },
            select: { id: true, role: true, phone: true, name: true, isActive: true },
        });
        if (!user || !user.isActive) {
            throw new errors_1.UnauthorizedError('User not found or inactive');
        }
        req.user = user;
        next();
    }
    catch (err) {
        if (err instanceof errors_1.UnauthorizedError)
            return next(err);
        next(new errors_1.UnauthorizedError('Invalid token'));
    }
}
function authorize(...roles) {
    return (req, _res, next) => {
        if (!req.user) {
            return next(new errors_1.UnauthorizedError());
        }
        if (!roles.includes(req.user.role)) {
            return next(new errors_1.ForbiddenError('Insufficient permissions'));
        }
        next();
    };
}
//# sourceMappingURL=auth.js.map