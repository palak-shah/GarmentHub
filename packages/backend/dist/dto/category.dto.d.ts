import { z } from 'zod';
export declare const createCategoryDto: z.ZodObject<{
    name: z.ZodString;
    attributes: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        sortOrder: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        sortOrder?: number | undefined;
    }, {
        name: string;
        sortOrder?: number | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    name: string;
    attributes?: {
        name: string;
        sortOrder?: number | undefined;
    }[] | undefined;
}, {
    name: string;
    attributes?: {
        name: string;
        sortOrder?: number | undefined;
    }[] | undefined;
}>;
export declare const updateCategoryDto: z.ZodObject<{
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
}, {
    name: string;
}>;
export declare const createCategoryAttributeDto: z.ZodObject<{
    name: z.ZodString;
    sortOrder: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    sortOrder?: number | undefined;
}, {
    name: string;
    sortOrder?: number | undefined;
}>;
export declare const updateCategoryAttributeDto: z.ZodEffects<z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    sortOrder?: number | undefined;
}, {
    name?: string | undefined;
    sortOrder?: number | undefined;
}>, {
    name?: string | undefined;
    sortOrder?: number | undefined;
}, {
    name?: string | undefined;
    sortOrder?: number | undefined;
}>;
export declare const createVendorCategoryAttributeDto: z.ZodObject<{
    name: z.ZodString;
    sortOrder: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    sortOrder?: number | undefined;
}, {
    name: string;
    sortOrder?: number | undefined;
}>;
export declare const updateVendorCategoryAttributeDto: z.ZodEffects<z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    sortOrder?: number | undefined;
}, {
    name?: string | undefined;
    sortOrder?: number | undefined;
}>, {
    name?: string | undefined;
    sortOrder?: number | undefined;
}, {
    name?: string | undefined;
    sortOrder?: number | undefined;
}>;
export type CreateCategoryDto = z.infer<typeof createCategoryDto>;
export type UpdateCategoryDto = z.infer<typeof updateCategoryDto>;
//# sourceMappingURL=category.dto.d.ts.map