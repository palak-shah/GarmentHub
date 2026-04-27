import { z } from 'zod';

export const createProductDto = z.object({
  name: z.string().min(1),
  images: z.array(z.string()).default([]),
  brandId: z.string().min(1),
  categoryId: z.string().min(1),
  pattern: z.string().default(''),
  fabric: z.string().default(''),
  color: z.string().default(''),
  attributeValues: z.record(z.string()).optional(),
  price: z.number().positive().optional(),
  priceMax: z.number().positive().optional(),
  moq: z.number().int().positive().default(1),
  status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED']).default('ACTIVE'),
});

export const updateProductDto = createProductDto.partial();

export const productQueryDto = z.object({
  search: z.string().optional(),
  vendorId: z.string().optional(),
  brandId: z.string().optional(),
  categoryId: z.string().optional(),
  pattern: z.string().optional(),
  fabric: z.string().optional(),
  color: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

export type CreateProductDto = z.infer<typeof createProductDto>;
export type UpdateProductDto = z.infer<typeof updateProductDto>;
export type ProductQueryDto = z.infer<typeof productQueryDto>;
