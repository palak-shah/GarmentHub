"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OtpService = void 0;
const db_1 = require("../config/db");
const env_1 = require("../config/env");
class OtpService {
    static generateCode() {
        return '123456'; // Mock: always returns 123456
    }
    static async send(phone) {
        const code = this.generateCode();
        const expiresAt = new Date(Date.now() + env_1.env.otpExpiryMinutes * 60 * 1000);
        await db_1.prisma.otpStore.deleteMany({ where: { phone } });
        await db_1.prisma.otpStore.create({ data: { phone, code, expiresAt } });
        console.log(`[MOCK OTP] Phone: ${phone}, Code: ${code}`);
        return { message: 'OTP sent successfully' };
    }
    static async verify(phone, code) {
        const record = await db_1.prisma.otpStore.findFirst({
            where: { phone, code, expiresAt: { gte: new Date() } },
            orderBy: { createdAt: 'desc' },
        });
        if (!record)
            return false;
        await db_1.prisma.otpStore.deleteMany({ where: { phone } });
        return true;
    }
}
exports.OtpService = OtpService;
//# sourceMappingURL=otp.service.js.map