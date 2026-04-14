import { z } from 'zod';

export const createBrandDto = z.object({
  name: z.string().min(1).max(100),
});

export const updateBrandDto = createBrandDto;

export type CreateBrandDto = z.infer<typeof createBrandDto>;
export type UpdateBrandDto = z.infer<typeof updateBrandDto>;
