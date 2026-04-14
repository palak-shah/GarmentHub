import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { sendOtpDto, verifyOtpDto, updateProfileDto } from '../dto/auth.dto';

export const authRoutes = Router();

authRoutes.post('/send-otp', validate(sendOtpDto), AuthController.sendOtp);
authRoutes.post('/verify-otp', validate(verifyOtpDto), AuthController.verifyOtp);
authRoutes.get('/me', authenticate, AuthController.getProfile);
authRoutes.put('/me', authenticate, validate(updateProfileDto), AuthController.updateProfile);
