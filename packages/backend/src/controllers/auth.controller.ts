import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { success } from '../utils/apiResponse';

export class AuthController {
  static async sendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.sendOtp(req.body.phone);
      success(res, result, 'OTP sent');
    } catch (err) { next(err); }
  }

  static async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.verifyOtp(req.body.phone, req.body.code);
      success(res, result, 'Login successful');
    } catch (err) { next(err); }
  }

  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await AuthService.getProfile(req.user!.id);
      success(res, user);
    } catch (err) { next(err); }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await AuthService.updateProfile(req.user!.id, req.body);
      success(res, user, 'Profile updated');
    } catch (err) { next(err); }
  }
}
