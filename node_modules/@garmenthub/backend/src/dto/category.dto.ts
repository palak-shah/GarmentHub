import { z } from 'zod';

const attrInput = z.object({
  name: z.string().min(1).max(120),
  sortOrder: z.number().int().optional(),
});

export const createCategoryDto = z.object({
  name: z.string().min(1).max(120),
  attributes: z.array(attrInput).optional(),
});

export const updateCategoryDto = z.object({
  name: z.string().min(1).max(120),
});

export const createCategoryAttributeDto = z.object({
  name: z.string().min(1).max(120),
  sortOrder: z.number().int().optional(),
});

export const updateCategoryAttributeDto = z
  .object({
    name: z.string().min(1).max(120).optional(),
    sortOrder: z.number().int().optional(),
  })
  .refine((d) => d.name !== undefined || d.sortOrder !== undefined, {
    message: 'Provide name and/or sortOrder',
  });

export const createVendorCategoryAttributeDto = z.object({
  name: z.string().min(1).max(120),
  sortOrder: z.number().int().optional(),
});

export const updateVendorCategoryAttributeDto = z
  .object({
    name: z.string().min(1).max(120).optional(),
    sortOrder: z.number().int().optional(),
  })
  .refine((d) => d.name !== undefined || d.sortOrder !== undefined, {
    message: 'Provide name and/or sortOrder',
  });

export type CreateCategoryDto = z.infer<typeof createCategoryDto>;
export type UpdateCategoryDto = z.infer<typeof updateCategoryDto>;
