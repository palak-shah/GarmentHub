"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../config/db");
const env_1 = require("../config/env");
const otp_service_1 = require("./otp.service");
const errors_1 = require("../utils/errors");
class AuthService {
    static async sendOtp(phone) {
        return otp_service_1.OtpService.send(phone);
    }
    static async verifyOtp(phone, code) {
        const valid = await otp_service_1.OtpService.verify(phone, code);
        if (!valid) {
            throw new errors_1.AppError(400, 'Invalid or expired OTP');
        }
        let user = await db_1.prisma.user.findUnique({ where: { phone } });
        const isNewUser = !user;
        if (!user) {
            user = await db_1.prisma.user.create({
                data: { phone, name: '', role: 'CUSTOMER' },
            });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, env_1.env.jwtSecret, { expiresIn: '30d' });
        return { token, user, isNewUser };
    }
    static async getProfile(userId) {
        const user = await db_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true, phone: true, name: true, role: true,
                businessName: true, address: true, isActive: true, createdAt: true,
            },
        });
        if (!user)
            throw new errors_1.NotFoundError('User');
        return user;
    }
    static async updateProfile(userId, data) {
        return db_1.prisma.user.update({
            where: { id: userId },
            data,
            select: {
                id: true, phone: true, name: true, role: true,
                businessName: true, address: true, isActive: true, createdAt: true,
            },
        });
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=auth.service.js.map