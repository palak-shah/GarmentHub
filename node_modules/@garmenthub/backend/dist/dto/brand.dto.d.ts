import { z } from 'zod';
export declare const createBrandDto: z.ZodObject<{
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
}, {
    name: string;
}>;
export declare const updateBrandDto: z.ZodObject<{
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
}, {
    name: string;
}>;
export type CreateBrandDto = z.infer<typeof createBrandDto>;
export type UpdateBrandDto = z.infer<typeof updateBrandDto>;
//# sourceMappingURL=brand.dto.d.ts.map