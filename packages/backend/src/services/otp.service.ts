import { prisma } from '../config/db';
import { env } from '../config/env';

export class OtpService {
  static generateCode(): string {
    return '123456'; // Mock: always returns 123456
  }

  static async send(phone: string): Promise<{ message: string }> {
    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + env.otpExpiryMinutes * 60 * 1000);

    await prisma.otpStore.deleteMany({ where: { phone } });
    await prisma.otpStore.create({ data: { phone, code, expiresAt } });

    console.log(`[MOCK OTP] Phone: ${phone}, Code: ${code}`);
    return { message: 'OTP sent successfully' };
  }

  static async verify(phone: string, code: string): Promise<boolean> {
    const record = await prisma.otpStore.findFirst({
      where: { phone, code, expiresAt: { gte: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) return false;

    await prisma.otpStore.deleteMany({ where: { phone } });
    return true;
  }
}
