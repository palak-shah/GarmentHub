import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { OtpService } from './otp.service';
import { AppError, NotFoundError } from '../utils/errors';
import { UpdateProfileDto } from '../dto/auth.dto';
import { Role } from '@prisma/client';

export class AuthService {
  static async sendOtp(phone: string) {
    return OtpService.send(phone);
  }

  static async verifyOtp(phone: string, code: string, role?: 'CUSTOMER' | 'VENDOR' | 'TRADER') {
    const valid = await OtpService.verify(phone, code);
    if (!valid) {
      throw new AppError(400, 'Invalid or expired OTP');
    }

    let user = await prisma.user.findUnique({ where: { phone } });
    const isNewUser = !user;

    if (!user) {
      user = await prisma.user.create({
        data: { phone, name: '', role: role ?? 'CUSTOMER' },
      });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      env.jwtSecret,
      { expiresIn: '30d' },
    );

    return { token, user, isNewUser };
  }

  static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, phone: true, name: true, role: true,
        businessName: true, address: true, isActive: true, createdAt: true,
      },
    });
    if (!user) throw new NotFoundError('User');
    return user;
  }

  static async updateProfile(userId: string, data: UpdateProfileDto) {
    return prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true, phone: true, name: true, role: true,
        businessName: true, address: true, isActive: true, createdAt: true,
      },
    });
  }
}
