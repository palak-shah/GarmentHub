import { z } from 'zod';

export const sendOtpDto = z.object({
  phone: z.string().min(10).max(15),
});

export const verifyOtpDto = z.object({
  phone: z.string().min(10).max(15),
  code: z.string().length(6),
  role: z.enum(['CUSTOMER', 'VENDOR', 'TRADER']).optional(),
});

export const updateProfileDto = z.object({
  name: z.string().min(1).optional(),
  businessName: z.string().optional(),
  address: z.string().optional(),
});

export type SendOtpDto = z.infer<typeof sendOtpDto>;
export type VerifyOtpDto = z.infer<typeof verifyOtpDto>;
export type UpdateProfileDto = z.infer<typeof updateProfileDto>;
