import { z } from 'zod';
export declare const sendOtpDto: z.ZodObject<{
    phone: z.ZodString;
}, "strip", z.ZodTypeAny, {
    phone: string;
}, {
    phone: string;
}>;
export declare const verifyOtpDto: z.ZodObject<{
    phone: z.ZodString;
    code: z.ZodString;
}, "strip", z.ZodTypeAny, {
    phone: string;
    code: string;
}, {
    phone: string;
    code: string;
}>;
export declare const updateProfileDto: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    businessName: z.ZodOptional<z.ZodString>;
    address: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    businessName?: string | undefined;
    address?: string | undefined;
}, {
    name?: string | undefined;
    businessName?: string | undefined;
    address?: string | undefined;
}>;
export type SendOtpDto = z.infer<typeof sendOtpDto>;
export type VerifyOtpDto = z.infer<typeof verifyOtpDto>;
export type UpdateProfileDto = z.infer<typeof updateProfileDto>;
//# sourceMappingURL=auth.dto.d.ts.map